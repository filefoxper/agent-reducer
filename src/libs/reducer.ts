import {
  Env,
  MiddleWare,
  Action,
  Dispatch,
  Listener,
  Store,
  ConnectionFactory,
  Model, ActionWrap, EffectMethod,
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
  agentMethodActsKey,
  agentActMethodAgentLaunchHandlerKey,
  agentIsEffectAgentKey,
} from './defines';
import { createSharingModelConnector } from './connector';
import { applyMiddleWares, defaultMiddleWare } from './applies';
import { copyAgentWithEnv, createActRuntime, generateAgent } from './agent';
import {
  createInstance, isPromise, warn,
} from './util';
import {
  addMethodEffects,
  runEffects,
  runningNotInitialedModelEffects,
} from './effect';
import { isConnecting, stateUpdatable } from './status';
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

function hasRunningAction<S, T extends Model<S>>(entity:T):boolean {
  const actionWrap = entity[agentActionKey];
  return !!actionWrap;
}

function extractAction<S, T extends Model<S>>(entity:T):Action|null {
  const actionWrap = entity[agentActionKey];
  if (actionWrap) {
    return actionWrap.current;
  }
  return null;
}

function linkAction<S, T extends Model<S>>(entity:T, action:Action):void {
  const actionWrap = entity[agentActionKey];
  if (!stateUpdatable<S, T>(entity)) {
    return;
  }
  const wrap:ActionWrap = {
    current: action,
  };
  if (!actionWrap) {
    entity[agentActionKey] = wrap;
    return;
  }
  const { last } = actionWrap;
  if (!last) {
    actionWrap.next = wrap;
    actionWrap.last = wrap;
  } else {
    last.next = wrap;
    actionWrap.last = wrap;
  }
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
):Store<S> {
  let listener:Listener<S>|null = null;
  const reduce = function reduce(action: Action) {
    const effects = entity[agentEffectsKey] || [];
    const nextState = reducer(entity.state, action);
    if (!listener) {
      return;
    }
    const currentAction:Action = { ...action, state: nextState };
    listener(currentAction);
    const { prevState, state } = currentAction;
    if (!stateUpdatable<S, T>(entity) || prevState === state) {
      return;
    }
    runEffects(entity, [...effects], currentAction);
  };
  function consumeAction(action:Action) {
    const isRunning = hasRunningAction<S, T>(entity);
    linkAction<S, T>(entity, action);
    if (isRunning) {
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
      const runtime = createActRuntime<S, T>(effectAgent, entity, methodName);
      const actor = effectMethod[agentMethodActsKey] || defaultFlow;
      const launchHandler = actor(runtime);
      const { shouldLaunch, didLaunch, reLaunch } = launchHandler;
      effectAgent[agentActMethodAgentLaunchHandlerKey] = launchHandler;
      disconnect();
      if (typeof shouldLaunch === 'function' && !shouldLaunch()) {
        return;
      }
      const runMethod = typeof reLaunch === 'function' ? reLaunch(effectMethod.bind(effectAgent)) : effectMethod;
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
    };

    const reducer = createReducer<S, T>(entity);

    const modelConnector = connectionFactory(entity);

    const storeSlot: Store<S> = createStoreSlot<S, T>(entity, reducer);

    const listener = (nextState:S) => {
      if (env.expired) {
        return;
      }
      storeSlot.dispatch({ type: DefaultActionType.DX_MUTE_STATE, state: nextState });
    };

    let outerSubscriber:Dispatch|null = null;

    storeSlot.subscribe((action:Action) => {
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
      connect(dispatch?: Dispatch) {
        outerSubscriber = null;
        outerSubscriber = dispatch || null;
        if (env.expired) {
          env.expired = false;
        }
        const connected = isConnecting<S, T>(entity);
        modelConnector.connect(listener);
        if (connected) {
          return;
        }
        const methodEffectBuilder = createMethodEffectBuilder<S, T>(entity);
        addMethodEffects<S, T>(entity, methodEffectBuilder);
      },
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
