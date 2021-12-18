import {
  Env,
  MiddleWare,
  Action,
  Dispatch,
  Listener,
  Store,
  ConnectionFactory,
  Model,
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
  agentActionsKey,
} from './defines';
import { createSharingModelConnector, stateUpdatable } from './connector';
import { applyMiddleWares, defaultMiddleWare } from './applies';
import { generateAgent } from './agent';
import { createInstance, isPromise } from './util';

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

function createStoreSlot<S, T extends Model<S>>(
  entity:T,
  reducer: Reducer<S, Action>,
):Store<S> {
  let listener:Listener<S>|null = null;
  const reduce = function reduce(action: Action) {
    const nextState = reducer(entity.state, action);
    if (!listener) {
      return;
    }
    const currentAction:Action = { ...action, state: nextState };
    listener(currentAction);
  };
  function consumeAction(action:Action) {
    const actions = entity[agentActionsKey] || [];
    entity[agentActionsKey] = [...actions, action];
    if (actions.length) {
      return;
    }
    let errorWrap: { error:any }|null = null;
    try {
      reduce(action);
    } catch (e) {
      errorWrap = { error: e };
    }
    const acs = (entity[agentActionsKey] || []).filter((ac) => ac !== action);
    entity[agentActionsKey] = [];
    acs.forEach(consumeAction);
    if (errorWrap) {
      throw errorWrap.error;
    }
  }
  const dispatch = function dispatch(sourceAction: Action) {
    const prevState = entity.state;
    const action = { ...sourceAction, prevState };
    if (action.type === DefaultActionType.DX_MUTE_STATE) {
      reduce(action);
      return;
    }
    if (
      entity.state !== action.state
        && stateUpdatable<S, T>(entity)
    ) {
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

function useConnection<
    S,
    T extends Model<S>= Model<S>
    >(connectionFactory:ConnectionFactory<S, T>) {
  return function oldCreateAgentReducer(
    model: T | { new (): T },
    mdw: (MiddleWare & { lifecycle?: boolean }),
  ): AgentReducer<S, T> {
    const entity = createAgentInstance<S, T>(model);

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
        if (
          outerSubscriber !== null
            && !env.expired
        ) {
          outerSubscriber(ac);
        }
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
        modelConnector.connect(listener);
        // todo addModelEffects<S, T>(entity, agent);
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
    run<R>(callback:(ag:T)=>any):R {
      reducer.connect();
      const result = callback(agent);
      if (isPromise(result)) {
        result.finally(() => {
          disconnect();
        });
      } else {
        disconnect();
      }
      return result;
    },
  };
}
