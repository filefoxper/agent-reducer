import {
  Env,
  MiddleWare,
  Action,
  Dispatch,
  Listener,
  Store,
  ConnectionFactory,
  Model, ActionWrap, EffectMethod, WorkFlow,
} from './global.type';
import {
  AgentReducer,
  AgentRunner,
  Reducer,
  ReducerPadding,
} from './reducer.type';
import {
  DefaultActionType,
  agentCallingMiddleWareKey,
  agentModelWorking,
  agentEffectsKey,
  agentActionKey,
  agentActMethodAgentLevelKey,
  agentMethodName,
  agentConnectorKey,
  agentModelFlowMethodKey,
  agentActMethodAgentLaunchHandlerKey,
  agentIsEffectAgentKey,
} from './defines';
import { createSharingModelConnector } from './connector';
import { applyMiddleWares, defaultMiddleWare } from './applies';
import { copyAgentWithEnv, createFlowRuntime, generateAgent } from './agent';
import {
  createInstance, isPromise, noop, warn,
} from './util';
import {
  addMethodEffects,
  runEffects,
  runningNotInitialedModelEffects,
} from './effect';
import { hasListenerConnected, isConnecting, stateUpdatable } from './status';
import { defaultFlow } from './flows';

/**
 * Create a reducer function for a standard reducer system.
 * This reducer only returns state which is passed in by dispatching action.
 *
 * @param entry an instance of Model
 *
 * @return a reducer function
 */
export function createReducer<S, T extends Model<S>>(
  entry: T,
): Reducer<S, Action> {
  /**
   * create a simple, but useful reducer
   */
  return function reducer(
    state: S = entry.state,
    action: Action = { type: DefaultActionType.DX_INITIAL_STATE },
  ) {
    const { type } = action;
    // initial or mute action ,
    // then return the action.args as next state
    if (
      type === DefaultActionType.DX_INITIAL_STATE || type === DefaultActionType.DX_MUTE_STATE
    ) {
      return action.state;
    }
    const reduce = entry[type];
    // if the type can be found in entry as a property,
    // and the value is a function, then return the action.args as next state
    if (typeof reduce === 'function') {
      return action.state;
    }
    return state;
  };
}

function createAgentInstance<
    S,
    T extends Model<S> = Model<S>
    >(model: T | { new (): T }):T {
  return typeof model === 'function' ? createInstance(model) : model;
}

function extractAction<S, T extends Model<S>>(entity:T):Action|null {
  const actionWrap = entity[agentActionKey];
  if (actionWrap) {
    return actionWrap.current;
  }
  return null;
}

function linkAction<S, T extends Model<S>>(entity:T, action:Action):boolean {
  const actionWrap = entity[agentActionKey];
  if (!stateUpdatable<S, T>(entity)) {
    return false;
  }
  const wrap:ActionWrap = {
    current: action,
  };
  if (!actionWrap) {
    entity[agentActionKey] = wrap;
    return true;
  }
  const { last } = actionWrap;
  if (!last) {
    actionWrap.next = wrap;
    actionWrap.last = wrap;
  } else {
    last.next = wrap;
    actionWrap.last = wrap;
  }
  return false;
}

function shiftAction<S, T extends Model<S>>(entity:T):Action|null {
  const actionWrap = entity[agentActionKey];
  if (!actionWrap || !stateUpdatable<S, T>(entity)) {
    return null;
  }
  const { last, next } = actionWrap;
  if (!next || !last) {
    entity[agentActionKey] = undefined;
    return null;
  }
  if (last === next) {
    next.last = undefined;
    next.next = undefined;
    entity[agentActionKey] = next;
    return next.current;
  }
  next.last = last;
  entity[agentActionKey] = next;
  return next.current;
}

function createStoreSlot<S, T extends Model<S>>(
  entity:T,
  reducer: Reducer<S, Action>,
  env:Env,
):Store<S> {
  let listener:Listener<S>|null = null;
  const reduce = function reduce(action: Action) {
    if (!listener) {
      return;
    }
    if (!env.dirty) {
      listener({ type: DefaultActionType.DX_AUTO_CONNECTION_ACTION, state: action });
      return;
    }
    const effects = entity[agentEffectsKey] || [];
    const nextState = reducer(entity.state, action);
    const currentAction:Action = { ...action, state: nextState };
    listener(currentAction);
    const { prevState, state } = currentAction;
    if (!stateUpdatable<S, T>(entity) || prevState === state) {
      return;
    }
    runEffects(entity, [...effects], currentAction);
  };
  function consumeAction(action:Action) {
    if (!env.dirty) {
      reduce(action);
      return;
    }
    const canWork = linkAction<S, T>(entity, action);
    if (!canWork) {
      return;
    }
    entity[agentModelWorking] = true;
    let current = extractAction<S, T>(entity);
    while (current) {
      try {
        reduce(current);
      } catch (e) {
        warn(e);
      }
      current = shiftAction<S, T>(entity);
    }
    runningNotInitialedModelEffects(entity);
    entity[agentModelWorking] = false;
  }
  const dispatch = function dispatch(sourceAction: Action) {
    const prevState = entity.state;
    const action = { ...sourceAction, prevState };
    if (action.type === DefaultActionType.DX_MUTE_STATE) {
      reduce(action);
      return;
    }
    if (!env.dirty) {
      consumeAction(sourceAction);
      return;
    }
    const needToUpdateEntityState = entity.state !== action.state
        && stateUpdatable<S, T>(entity);
    if (needToUpdateEntityState) {
      entity.state = action.state;
    }
    consumeAction(action);
  };
  return {
    getState() {
      return entity.state;
    },
    dispatch,
    subscribe(ls: Listener<S>) {
      listener = ls;
    },
  };
}

function pickMiddleWare<
    S,
    T extends Model<S> = Model<S>
    >(entity:T, mdw:MiddleWare):(MiddleWare & { lifecycle?: boolean }) {
  function getMiddleWareFromModel(model:T) {
    if (model[agentCallingMiddleWareKey]) {
      return model[agentCallingMiddleWareKey];
    }
    const constructorCaller = Object.getPrototypeOf(model).constructor;
    if (constructorCaller[agentCallingMiddleWareKey]) {
      return constructorCaller[agentCallingMiddleWareKey];
    }
    return undefined;
  }
  function validateMiddleWare(
    finalMiddleWare:(MiddleWare & { lifecycle?: boolean }),
  ):(MiddleWare & { lifecycle?: boolean }) {
    if (finalMiddleWare.lifecycle) {
      throw new Error(
        'Can not use a lifecycle `MiddleWare` for creating, please use this `MiddleWare` with api `withMiddleWare` or `middleWare`.',
      );
    }
    return finalMiddleWare;
  }
  if (mdw !== defaultMiddleWare) {
    return validateMiddleWare(mdw);
  }
  const insideMiddleWare = getMiddleWareFromModel(entity);
  if (insideMiddleWare) {
    return validateMiddleWare(insideMiddleWare);
  }
  return defaultMiddleWare;
}

function createMethodEffectBuilder<
    S,
    T extends Model<S>= Model<S>
    >(entity:T) {
  return function methodEffectBuilder(effectMethod:EffectMethod<S, T>, args:any[]) {
    return connect<S, T>(entity).run((ag, disconnect) => {
      const [effectAgent] = copyAgentWithEnv<S, T>(ag);
      const methodName = effectMethod[agentMethodName];
      effectAgent[agentActMethodAgentLevelKey] = 1;
      effectAgent[agentIsEffectAgentKey] = true;
      const runtime = createFlowRuntime<S, T>(effectAgent, entity, methodName);
      const sourceActor = effectMethod[agentModelFlowMethodKey];
      const actor = (!sourceActor || sourceActor === noop ? defaultFlow : sourceActor) as WorkFlow;
      const launchHandler = actor(runtime);
      const { shouldLaunch, didLaunch, invoke } = launchHandler;
      effectAgent[agentActMethodAgentLaunchHandlerKey] = launchHandler;
      disconnect();
      if (typeof shouldLaunch === 'function' && !shouldLaunch()) {
        return;
      }
      const runMethod = typeof invoke === 'function' ? invoke(effectMethod.bind(effectAgent)) : effectMethod;
      try {
        const result = runMethod.apply(effectAgent, args);
        if (typeof didLaunch === 'function') {
          didLaunch(result);
        }
      } catch (e) {
        runtime.reject(e);
      }
    }, false);
  };
}

function useConnection<
    S,
    T extends Model<S>= Model<S>
    >(connectionFactory:ConnectionFactory<S, T>) {
  return function oldCreateAgentReducer(
    model: T | { new (): T },
    mdw: (MiddleWare & { lifecycle?: boolean }),
  ): AgentReducer<S, T> {
    const entity = createAgentInstance<S, T>(model);

    if (typeof entity[agentConnectorKey] !== 'function') {
      entity[agentConnectorKey] = connect;
    }

    const finalMiddleWare = pickMiddleWare<S, T>(entity, mdw);

    const env:Env = {
      expired: true,
      dirty: false,
    };

    const reducer = createReducer<S, T>(entity);

    const modelConnector = connectionFactory(entity);

    const storeSlot: Store<S> = createStoreSlot<S, T>(entity, reducer, env);

    const listener = (nextState:S) => {
      if (env.expired) {
        return;
      }
      storeSlot.dispatch({ type: DefaultActionType.DX_MUTE_STATE, state: nextState });
    };

    let outerSubscriber:Dispatch|null = null;

    const initialState = entity.state;

    function syncUpdate():void {
      const currentState = entity.state;
      if (initialState !== currentState) {
        storeSlot.dispatch({ type: DefaultActionType.DX_MUTE_STATE, state: currentState });
      }
    }

    function connectModel(dispatch?: Dispatch) {
      outerSubscriber = null;
      outerSubscriber = dispatch || null;
      if (env.expired) {
        env.expired = false;
      }
      env.dirty = true;
      if (hasListenerConnected<S, T>(listener, entity)) {
        syncUpdate();
        return;
      }
      const connected = isConnecting<S, T>(entity);
      modelConnector.connect(listener);
      syncUpdate();
      if (connected) {
        return;
      }
      const methodEffectBuilder = createMethodEffectBuilder<S, T>(entity);
      addMethodEffects<S, T>(entity, methodEffectBuilder);
    }

    storeSlot.subscribe((action:Action) => {
      const { type, state } = action;
      if (type === DefaultActionType.DX_AUTO_CONNECTION_ACTION) {
        connectModel();
        storeSlot.dispatch(state);
        return;
      }
      modelConnector.notify(action, (ac:Action) => {
        if (outerSubscriber == null || env.expired) {
          return;
        }
        outerSubscriber(ac);
      });
    });

    const agent = generateAgent(entity, storeSlot, env, finalMiddleWare);

    const transition: ReducerPadding<S, T> = {
      agent,
      connect: connectModel,
      disconnect() {
        let error:Error|null = null;
        try {
          modelConnector.disconnect();
        } catch (e) {
          error = e;
        }
        outerSubscriber = null;
        env.expired = true;
        if (error !== null) {
          throw error;
        }
      },
    };

    return Object.assign(reducer, transition);
  };
}

export function create<
    S,
    T extends Model<S> = Model<S>
    >(
  model: T | { new (): T },
  ...middleWares: (MiddleWare & { lifecycle?: boolean })[]
): AgentReducer<S, T> {
  const dmw = middleWares.length ? applyMiddleWares(...middleWares) : defaultMiddleWare;
  const oldCreateAgentReducer = useConnection<S, T>(createSharingModelConnector);
  return oldCreateAgentReducer(model, dmw);
}

export function connect<
    S,
    T extends Model<S> = Model<S>
    >(
  model: T | { new (): T },
  ...middleWares: (MiddleWare & { lifecycle?: boolean })[]
):AgentRunner<T> {
  const reducer = create<S, T>(model, ...middleWares);
  const { agent, disconnect } = reducer;
  return {
    run<R>(callback:(ag:T, disconnect:()=>any)=>any, autoDisconnect = true):R {
      reducer.connect();
      const result = callback(agent, disconnect);
      if (!autoDisconnect) {
        return result;
      }
      if (isPromise(result)) {
        result.then(disconnect, (e) => {
          disconnect();
          return Promise.reject(e);
        });
      } else {
        disconnect();
      }
      return result;
    },
  };
}
