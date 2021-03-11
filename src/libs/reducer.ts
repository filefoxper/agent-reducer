import { Env, OriginAgent, MiddleWare } from './global.type';
import {
  Action,
  AgentReducer,
  Reducer,
  Change,
  StoreSlot,
  ReducerPadding,
  Dispatch,
} from './reducer.type';
import {
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
    >(originAgent: T&{[agentListenerKey]?:(()=>any)[]}, listener:()=>any) {
  const listeners = originAgent[agentListenerKey] || [];
  originAgent[agentListenerKey] = [...listeners, listener];
  return function unsubscribe() {
    const ls = originAgent[agentListenerKey] || [];
    originAgent[agentListenerKey] = ls.filter((l) => l !== listener);
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
    >(originAgent: T | { new (): T }):T&{[agentListenerKey]?:(()=>any)[]} {
  return typeof originAgent === 'function' ? createInstance(originAgent) : originAgent;
}

export function createAgentReducer<
  S,
  T extends OriginAgent<S> = OriginAgent<S>
>(
  originAgent: T | { new (): T },
  middleWareOrEnv?: (MiddleWare & { lifecycle?: boolean }) | Env,
  e?: Env,
): AgentReducer<S, Action, T> {
  const config = globalConfig() || {};

  const settingEnv = typeof middleWareOrEnv !== 'function'
    ? { ...middleWareOrEnv, ...e }
    : { ...e };

  const finalMiddleWare:MiddleWare&{lifecycle?:boolean} = typeof middleWareOrEnv === 'function'
    ? middleWareOrEnv
    : config.defaultMiddleWare || defaultMiddleWare;

  if (finalMiddleWare.lifecycle) {
    throw new Error(
      'you can not use a lifecycle middleWare when creating an agent.',
    );
  }

  const env: Env = mergeEnv(config.env || {}, settingEnv);

  let stateChanges: undefined | Array<Change<S>>;

  let listener:()=>any;

  const entity = createAgentInstance(originAgent);

  const reducer = createReducer<S, T>(entity);

  const notify = () => {
    const ls = entity[agentListenerKey] || [];
    ls.forEach((l) => {
      if (l === listener) {
        return;
      }
      l();
    });
  };

  const storeSlot: StoreSlot<S> = {
    getState() {
      return entity.state;
    },
    dispatch(action: Action) {
      if (env.updateBy !== 'auto') {
        return;
      }
      const nextState = reducer(this.getState(), action);
      if (nextState !== entity.state) {
        entity.state = nextState;
        notify();
      }
      if (stateChanges) {
        stateChanges.push({ type: action.type, state: nextState });
      }
    },
  };

  listener = () => {
    storeSlot.dispatch({ type: DefaultActionType.DX_MUTE_STATE, args: entity.state });
  };

  const unsubscribe = subscribe(entity, listener);

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
        storeSlot.dispatch = dispatch;
      }
      const nextState = (dispatch !== undefined
        ? state
        : storeSlot.getState()) as S;
      if (nextState !== entity.state) {
        entity.state = nextState;
        notify();
      }
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
      stateChanges = [];
      return function getStateChanges(): Array<Change<S>> {
        const result = stateChanges !== undefined ? [...stateChanges] : [];
        stateChanges = undefined;
        return result;
      };
    },
    unsubscribe,
  };

  return Object.assign(reducer, transition);
}
