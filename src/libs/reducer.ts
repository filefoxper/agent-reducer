import { Env, OriginAgent, MiddleWare } from "./global.type";
import {
  Action,
  AgentReducer,
  Reducer,
  Change,
  StoreSlot,
  ReducerPadding,
  Dispatch,
} from "./reducer.type";
import { agentNamespaceKey, DefaultActionType, globalConfig } from "./defines";
import { defaultMiddleWare } from "./applies";
import { generateAgent } from "./agent";

/**
 * Create a true reducer function which can use in a standard reducer system.
 * For the actual state has been produced by agent, this reducer only returns state which is passed by a dispatched action.
 *
 * @param entry an instance of OriginAgent
 *
 * @return a reducer function
 */
export function createReducer<S, T extends OriginAgent<S>>(
  entry: T
): Reducer<S, Action> {
  /**
   * parse an action type
   *
   * @param actionType  can be a property name of entry, or made by entry.namespace+':'+(a property name of entry)
   *
   * @return [namespace,type]
   */
  function parseActionType(actionType: string): [string | undefined, string] {
    const [namespaceOrType, type] = actionType.split(":");
    const namespace = type === undefined ? undefined : namespaceOrType;
    const actualType = type === undefined ? namespaceOrType : type;
    return [namespace, actualType];
  }

  /**
   * create a simple, but useful reducer
   */
  return function (
    state: S = entry.state,
    action: Action = { type: DefaultActionType.DX_INITIAL_STATE }
  ) {
    const [namespace, type] = parseActionType(action.type);
    //if reducer receive an action with namespace in action.type, then check if entry[agentNamespace] matches namespace
    if (entry[agentNamespaceKey] && namespace !== entry[agentNamespaceKey]) {
      return state;
    }
    //if reducer receive an action with a initial state type, then return the action.args as next state
    if (
      type === DefaultActionType.DX_INITIAL_STATE &&
      action.args !== undefined
    ) {
      return action.args;
    }
    const reduce = entry[type];
    //if the type can be found in entry as a property, and the value is a function, then return the action.args as next state
    if (typeof reduce === "function") {
      return action.args;
    }
    return state;
  };
}

export function createAgentReducer<
  S,
  T extends OriginAgent<S> = OriginAgent<S>
>(
  originAgent: T | { new (): T },
  middleWareOrEnv?: (MiddleWare & { lifecycle?: boolean }) | Env,
  e?: Env
): AgentReducer<S, Action, T> {
  const config = globalConfig() || {};

  const defaultEnv =
    typeof middleWareOrEnv !== "function"
      ? { ...middleWareOrEnv, ...e }
      : { ...e };

  const resultResolver =
    typeof middleWareOrEnv === "function"
      ? middleWareOrEnv
      : config.defaultMiddleWare || defaultMiddleWare;

  if (resultResolver.lifecycle) {
    throw new Error(
      "you can not use a lifecycle middleWare when creating an agent."
    );
  }

  let env: Env = {
    expired: false,
    strict: true,
    updateBy: "auto",
    ...config.env,
    ...defaultEnv,
  };

  let stateChanges: undefined | Array<Change<S>> = undefined;

  let entity =
    typeof originAgent === "function" ? new originAgent() : originAgent;

  const initialState = entity.state;

  const reducer = createReducer<S, T>(entity);

  let storeSlot: StoreSlot<S> = {
    getState() {
      return entity.state;
    },
    dispatch(action: Action) {
      if (env.updateBy !== "auto") {
        return;
      }
      const nextState = reducer(this.getState(), action);
      entity.state = nextState;
      if (stateChanges) {
        stateChanges.push({ type: action.type, state: nextState });
      }
    },
  };

  const transition: ReducerPadding<S, T> = {
    initialState,
    namespace: entity[agentNamespaceKey],
    env,
    agent: generateAgent(entity, storeSlot, env, resultResolver),
    update(state?: S, dispatch?: Dispatch) {
      if (env.updateBy === "auto") {
        throw new Error(
          "You should set env.updateBy to be `manual` before updating state and dispatch from outside."
        );
      }

      entity.state = (dispatch !== undefined
        ? state
        : storeSlot.getState()) as S;
      if (dispatch !== undefined) {
        storeSlot.dispatch = dispatch;
      }
    },
    useStoreSlot(slot: StoreSlot) {
      if (env.updateBy === "auto") {
        throw new Error(
          "You should set env.updateBy to be `manual` before updating state and dispatch from outside."
        );
      }

      storeSlot.getState = () => slot.getState();
      storeSlot.dispatch = (action: Action) => slot.dispatch(action);
    },
    recordChanges() {
      if (env.updateBy !== "auto") {
        throw new Error(
          "You should set env.updateBy to be `auto` before record."
        );
      }
      stateChanges = [];
      return function getStateChanges(): Array<Change<S>> {
        const result = stateChanges !== undefined ? [...stateChanges] : [];
        stateChanges = undefined;
        return result;
      };
    },
  };

  return Object.assign(reducer, transition);
}
