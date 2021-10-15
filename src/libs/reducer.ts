import {
  Env,
  OriginAgent,
  MiddleWare,
  SharingType,
} from './global.type';
import {
  Action,
  AgentReducer,
  Reducer,
  Change,
  Store,
  ReducerPadding,
  Dispatch,
  Listener,
  Factory,
  Ref,
  SharingRef,
} from './reducer.type';
import {
  agentModelResetKey,
  agentListenerKey,
  agentNamespaceKey,
  DefaultActionType,
  agentSharingTypeKey,
  agentSharingMiddleWareKey,
  innerGlobalConfig,
} from './defines';
import { defaultMiddleWare } from './applies';
import { generateAgent } from './agent';
import {
  createInstance, createProxy, warning,
} from './util';

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

function hasListeners<
    S,
    T extends OriginAgent<S> = OriginAgent<S>
    >(modelInstance: T&{[agentListenerKey]?:((s:S)=>any)[]}) {
  const listeners = modelInstance[agentListenerKey] || [];
  return listeners.length !== 0;
}

function createStoreSlot<S>(
  initialState:S,
  reducer: Reducer<S, Action>,
  env:Env,
):Store<S> {
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
      const nextState = reducer(this.getState(), action);
      if (!env.expired) {
        storeState = nextState;
      }
      if (!listener) {
        return;
      }
      listener(nextState, action);
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

function createSharingModel<
    S,
    T extends OriginAgent<S>&{[agentSharingMiddleWareKey]?:Record<string, unknown>} = OriginAgent<S>
    >(Model:T|{new ():T}):T {
  const nextModel:T&{
    [agentModelResetKey]?:()=>void,
    [agentSharingTypeKey]?:SharingType,
    [agentListenerKey]?:((s:S)=>any)[]
  } = typeof Model === 'function' ? new Model() : Model;
  nextModel[agentSharingTypeKey] = 'hard';
  return nextModel;
}

export function sharing<
    S,
    T extends OriginAgent<S> = OriginAgent<S>
    >(
  factory:Factory<S, T>,
):SharingRef<S, T> {
  let initialed = false;
  const ref:Ref<S, T> = {
    current: null,
  };
  ref.initial = (...args:any[]):T => {
    if (ref.current && initialed) {
      return ref.current;
    }
    initialed = true;
    const Model = factory(...args);
    ref.current = createSharingModel(Model);
    return ref.current as T;
  };
  return createProxy(ref, {
    get(
      target: Ref<S, T>,
      p: keyof Ref<S, T>,
    ): any {
      const value = target[p];
      if (p === 'current' && !value) {
        const initialCurrent = createSharingModel(factory());
        ref.current = initialCurrent;
        return initialCurrent;
      }
      return value;
    },
  }) as SharingRef<S, T>;
}

function createWeakSharingModel<
    S,
    T extends OriginAgent<S>&{[agentSharingMiddleWareKey]?:Record<string, unknown>} = OriginAgent<S>
    >(Model:T|{new ():T}, reset:()=>void):T {
  const nextModel:T&{
    [agentModelResetKey]?:()=>void,
    [agentSharingTypeKey]?:SharingType,
    [agentListenerKey]?:((s:S)=>any)[]
  } = typeof Model === 'function' ? new Model() : Model;
  nextModel[agentModelResetKey] = reset;
  nextModel[agentSharingTypeKey] = 'weak';
  return nextModel;
}

export function weakSharing<
    S,
    T extends OriginAgent<S>&{[agentSharingMiddleWareKey]?:Record<string, unknown>}=OriginAgent<S>
    >(
  factory:Factory<S, T>,
):SharingRef<S, T> {
  let initialed = false;
  const ref:Ref<S, T> = {
    current: null,
  };
  const reset = () => {
    if (ref.current) {
      ref.current[agentSharingMiddleWareKey] = undefined;
    }
    ref.current = null;
  };
  ref.initial = (...args:any[]):T => {
    if (ref.current && initialed) {
      return ref.current;
    }
    initialed = true;
    const Model = factory(...args);
    ref.current = createWeakSharingModel(Model, reset);
    return ref.current as T;
  };
  return createProxy(ref, {
    get(
      target: Ref<S, T>,
      p: keyof Ref<S, T>,
    ): any {
      const value = target[p];
      if (p === 'current' && !value) {
        const initialCurrent = createWeakSharingModel(factory(), reset);
        ref.current = initialCurrent;
        return initialCurrent;
      }
      return value;
    },
  }) as SharingRef<S, T>;
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
    if (needUpdate
        && (hasListeners(entity) || entity[agentSharingTypeKey] === 'hard')
         && action.type !== DefaultActionType.DX_MUTE_STATE
    ) {
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

  let unsubscribe:null|(()=>void) = modelConnector.subscribe(listener);

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
      if (dispatch !== undefined) {
        storeSlot.dispatch = (action:Action) => {
          if (
            (
              entity[agentSharingTypeKey] === 'hard'
              || hasListeners(entity)
            )
              && action.args !== entity.state
              && action.type !== DefaultActionType.DX_MUTE_STATE
          ) {
            entity.state = action.args;
          }
          if (!env.expired) {
            dispatch(action);
          }
          if (action.type === DefaultActionType.DX_MUTE_STATE) {
            return;
          }
          modelConnector.notify(action.args);
        };
      }
    },
    recordChanges() {
      if (env.updateBy !== 'auto') {
        throw new Error(
          'You should set env.updateBy to be `auto` before record.',
        );
      }
      return changeStack.record();
    },
    reconnect() {
      env.expired = false;
      if (unsubscribe) {
        return;
      }
      unsubscribe = modelConnector.subscribe(listener);
    },
    destroy() {
      env.expired = true;
      if (!unsubscribe) {
        return;
      }
      unsubscribe();
      unsubscribe = null;
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
  const config = innerGlobalConfig() || {};
  const dmw = config.defaultMiddleWare || defaultMiddleWare;
  if (args.length === 2) {
    const finishMiddleWare = typeof args[1] === 'function';
    return finishMiddleWare
      ? createAgentReducer(args[0], args[1] || dmw, mergeEnv(config.env || {}))
      : createAgentReducer(args[0], dmw, mergeEnv(config.env || {}, args[1]));
  }
  if (args.length === 1) {
    return createAgentReducer(args[0], dmw, mergeEnv(config.env || {}));
  }
  if (args[2]) {
    warning('Setting `Env` is not recommend, it will be abandoned from `agent-reducer@4.0.0`.');
  }
  return oldCreateAgentReducer(args[0], args[1] || dmw, mergeEnv(config.env || {}, args[2] || {}));
}
