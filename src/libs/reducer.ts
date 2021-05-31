import { Env, OriginAgent, MiddleWare } from './global.type';
import {
  Action,
  AgentReducer,
  Reducer,
  Change,
  Store,
  ReducerPadding,
  Dispatch,
  Listener, StoreSlot,
} from './reducer.type';
import {
  agentModelResetKey,
  agentListenerKey, agentNamespaceKey, DefaultActionType, globalConfig,
} from './defines';
import { defaultMiddleWare } from './applies';
import { generateAgent } from './agent';
import { createInstance } from './util';

/**
 * Create a reducer function for a standard reducer system.
 * This reducer only returns state which is passed in by dispatching action.
 *
 * @param entry an instance of OriginAgent
 *
 * @return a reducer function
 */
export function createReducer<S, T extends OriginAgent<S>>(
  entry: T,
): Reducer<S, Action> {
  /**
   * parse an action type
   *
   * @param actionType  can be a property name of entry,
   * or made by entry.namespace+':'+(a property name of entry)
   *
   * @return [namespace,type]
   */
  function parseActionType(actionType: string): [string | undefined, string] {
    const [namespaceOrType, type] = actionType.split(':');
    const namespace = type === undefined ? undefined : namespaceOrType;
    const actualType = type === undefined ? namespaceOrType : type;
    return [namespace, actualType];
  }

  /**
   * create a simple, but useful reducer
   */
  return function reducer(
    state: S = entry.state,
    action: Action = { type: DefaultActionType.DX_INITIAL_STATE },
  ) {
    const [namespace, type] = parseActionType(action.type);
    // if reducer receive an action with namespace in action.type,
    // then check if entry[agentNamespace] matches namespace
    if (entry[agentNamespaceKey] && namespace !== entry[agentNamespaceKey]) {
      return state;
    }
    // initial or mute action ,
    // then return the action.args as next state
    if (
      type === DefaultActionType.DX_INITIAL_STATE || type === DefaultActionType.DX_MUTE_STATE
    ) {
      return action.args;
    }
    const reduce = entry[type];
    // if the type can be found in entry as a property,
    // and the value is a function, then return the action.args as next state
    if (typeof reduce === 'function') {
      return action.args;
    }
    return state;
  };
}

function subscribe<
    S,
    T extends OriginAgent<S> = OriginAgent<S>
    >(
  originAgent: T&{[agentModelResetKey]?:()=>void, [agentListenerKey]?:((s:S)=>any)[]},
  listener:(s:S)=>any,
) {
  const listeners = originAgent[agentListenerKey];
  originAgent[agentListenerKey] = [...(listeners || []), listener];
  return function unsubscribe():void {
    const ls = originAgent[agentListenerKey] || [];
    const currentListeners = ls.filter((l) => l !== listener);
    originAgent[agentListenerKey] = currentListeners;
    if (!currentListeners.length) {
      originAgent[agentListenerKey] = undefined;
    }
    if (!currentListeners.length && typeof originAgent[agentModelResetKey] === 'function') {
      const reset = originAgent[agentModelResetKey] as ()=>void;
      originAgent[agentModelResetKey] = undefined;
      reset();
    }
  };
}

function mergeEnv(...envs:Env[]):Env {
  const defaults:Env = {
    expired: false,
    strict: true,
    updateBy: 'auto',
  };
  return Object.assign({}, defaults, ...envs);
}

function createAgentInstance<
    S,
    T extends OriginAgent<S> = OriginAgent<S>
    >(originAgent: T | { new (): T }):T&{[agentListenerKey]?:((s:S)=>any)[]} {
  return typeof originAgent === 'function' ? createInstance(originAgent) : originAgent;
}

function createModelConnector<
    S,
    T extends OriginAgent<S> = OriginAgent<S>
    >(modelInstance: T&{[agentListenerKey]?:((s:S)=>any)[]}) {
  let listener:undefined|((s:S)=>any);
  return {
    subscribe(l:(s:S)=>any) {
      listener = l;
      return subscribe(modelInstance, l);
    },
    notify(nextState:S) {
      const ls = modelInstance[agentListenerKey] || [];
      ls.forEach((l) => {
        if (l === listener) {
          return;
        }
        l(nextState);
      });
    },
  };
}

function createStoreSlot<S>(initialState:S, reducer: Reducer<S, Action>, env:Env):Store<S> {
  let storeState = initialState;
  let listener:Listener<S>|null = null;
  return {
    getState() {
      return storeState;
    },
    dispatch(action: Action) {
      if (env.updateBy !== 'auto') {
        return;
      }
      storeState = reducer(this.getState(), action);
      if (!listener) {
        return;
      }
      listener(storeState, action);
    },
    subscribe(ls: Listener<S>) {
      listener = ls;
    },
  };
}

function createChangeStack<S>() {
  let stack: undefined | Array<Change<S>>;
  return {
    push(state:S, action:Action) {
      if (!stack) {
        return;
      }
      stack.push({ type: action.type, state });
    },
    record() {
      stack = [];
      return function getStateChanges(): Array<Change<S>> {
        const result = stack !== undefined ? [...stack] : [];
        stack = undefined;
        return result;
      };
    },
  };
}

export function sharing<
    S,
    T extends OriginAgent<S> = OriginAgent<S>
    >(
  factory:()=>T|{new ():T},
):{current:T} {
  const Model = factory();
  const current:T&{
    [agentModelResetKey]?:()=>void,
    [agentListenerKey]?:((s:S)=>any)[]
  } = typeof Model === 'function' ? new Model() : Model;
  return { current };
}

export function weakSharing<
    S,
    T extends OriginAgent<S> = OriginAgent<S>
    >(
  factory:()=>T|{new ():T},
):{current:T} {
  const ref:{current:T|null} = { current: null };
  const reset = () => {
    ref.current = null;
    const Model = factory();
    const nextModel:T&{
      [agentModelResetKey]?:()=>void,
      [agentListenerKey]?:((s:S)=>any)[]
    } = typeof Model === 'function' ? new Model() : Model;
    nextModel[agentModelResetKey] = reset;
    ref.current = nextModel;
  };
  reset();
  return ref as {current:T};
}

export function oldCreateAgentReducer<
  S,
  T extends OriginAgent<S> = OriginAgent<S>
>(
  originAgent: T | { new (): T },
  finalMiddleWare: (MiddleWare & { lifecycle?: boolean }),
  env: Env,
): AgentReducer<S, T> {
  if (finalMiddleWare.lifecycle) {
    throw new Error(
      'you can not use a lifecycle middleWare when creating an agent.',
    );
  }

  const changeStack = createChangeStack<S>();

  const entity = createAgentInstance(originAgent);

  const reducer = createReducer<S, T>(entity);

  const modelConnector = createModelConnector<S, T>(entity);

  const storeSlot: Store<S> = createStoreSlot<S>(entity.state, reducer, env);

  const listener = (nextState:S) => {
    if (env.expired) {
      return;
    }
    storeSlot.dispatch({ type: DefaultActionType.DX_MUTE_STATE, args: nextState });
  };

  storeSlot.subscribe((nextState:S, action:Action) => {
    const needUpdate = nextState !== entity.state;
    if (needUpdate) {
      entity.state = nextState;
    }
    changeStack.push(nextState, action);
    if (action.type === DefaultActionType.DX_MUTE_STATE) {
      return;
    }
    if (needUpdate) {
      modelConnector.notify(nextState);
    }
  });

  const unsubscribe = modelConnector.subscribe(listener);

  const transition: ReducerPadding<S, T> = {
    initialState: entity.state,
    namespace: entity[agentNamespaceKey],
    env,
    agent: generateAgent(entity, storeSlot, env, finalMiddleWare),
    update(state?: S, dispatch?: Dispatch) {
      if (env.updateBy === 'auto') {
        throw new Error(
          'You should set env.updateBy to be `manual` before updating state and dispatch from outside.',
        );
      }
      const nextState = (dispatch !== undefined
        ? state
        : storeSlot.getState()) as S;
      if (dispatch !== undefined) {
        storeSlot.dispatch = (action:Action) => {
          dispatch(action);
          if (action.type === DefaultActionType.DX_MUTE_STATE) {
            return;
          }
          modelConnector.notify(action.args);
        };
      }
      if (nextState === entity.state) {
        return;
      }
      entity.state = nextState;
    },
    useStoreSlot(slot: StoreSlot) {
      if (env.updateBy === 'auto') {
        throw new Error(
          'You should set env.updateBy to be `manual` before updating state and dispatch from outside.',
        );
      }
      storeSlot.getState = () => slot.getState();
      storeSlot.dispatch = (action: Action) => slot.dispatch(action);
    },
    recordChanges() {
      if (env.updateBy !== 'auto') {
        throw new Error(
          'You should set env.updateBy to be `auto` before record.',
        );
      }
      return changeStack.record();
    },
    destroy() {
      unsubscribe();
      env.expired = true;
    },
  };

  return Object.assign(reducer, transition);
}

export function createAgentReducer<
    S,
    T extends OriginAgent<S> = OriginAgent<S>
    >(
    originAgent: T | { new (): T },
    middleWareOrEnv?: (MiddleWare & { lifecycle?: boolean }) | Env,
    e?: Env,
): AgentReducer<S, T>
export function createAgentReducer<
    S,
    T extends OriginAgent<S> = OriginAgent<S>
    >(...args:any[]): AgentReducer<S, T> {
  const config = globalConfig() || {};
  const dmw = config.defaultMiddleWare || defaultMiddleWare;
  if (args.length === 2) {
    const finishMiddleWare = typeof args[1] === 'function';
    return finishMiddleWare
      ? createAgentReducer(args[0], args[1], mergeEnv(config.env || {}))
      : createAgentReducer(args[0], dmw, mergeEnv(config.env || {}, args[1]));
  }
  if (args.length === 1) {
    return createAgentReducer(args[0], dmw, mergeEnv(config.env || {}));
  }
  return oldCreateAgentReducer(args[0], args[1], mergeEnv(config.env || {}, args[2]));
}
