import {
  Action, OriginAgent,
} from './global.type';
import {
  agentActionsKey,
  agentListenerKey,
  agentMethodName,
  agentModelResetKey,
  agentSharingMiddleWareKey,
  agentSharingTypeKey, DefaultActionType,
} from './defines';
import { ModelConnector } from './sharing.type';

export function resetModel<
    S,
    T extends OriginAgent<S>=OriginAgent<S>
    >(entity:T):void {
  entity[agentSharingMiddleWareKey] = undefined;
  entity[agentActionsKey] = undefined;
}

function subscribe<
    S,
    T extends OriginAgent<S> = OriginAgent<S>
    >(
  originAgent: T,
  listener:(s:S)=>any,
):()=>void {
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

function mountMethod<
    S,
    T extends OriginAgent<S> = OriginAgent<S>
    >(instance: T):void {
  const ownKeys = Object.getOwnPropertyNames(instance);
  const ownFuncKeys = ownKeys.filter((key) => {
    const value = instance[key];
    return typeof value === 'function';
  });
  const prototype = Object.getPrototypeOf(instance);
  const prototypeKeys = Object.getOwnPropertyNames(prototype);
  const protoFuncKeys = prototypeKeys.filter((key) => {
    const val = prototype[key];
    return typeof val === 'function';
  });
  const funcKeys = new Set([...ownFuncKeys, ...protoFuncKeys]);
  const description = [...funcKeys].reduce((r, key) => {
    const ownFucDesc = Object.getOwnPropertyDescriptor(instance, key);
    const funcDesc = ownFucDesc || Object.getOwnPropertyDescriptor(prototype, key);
    if (!funcDesc) {
      return r;
    }
    const { value } = funcDesc;
    const processedValue = Object.assign(value, { [agentMethodName]: key, model: instance });
    return { ...r, [key]: { ...funcDesc, value: processedValue } };
  }, {});
  Object.defineProperties(instance, description);
}

function initialModel<
    S,
    T extends OriginAgent<S> = OriginAgent<S>
    >(instance: T):void {
  const sharingType = instance[agentSharingTypeKey];
  if (!sharingType && !instance[agentModelResetKey]) {
    instance[agentModelResetKey] = function reset() {
      resetModel<S, T>(instance);
    };
  }
  if (!instance[agentActionsKey]) {
    instance[agentActionsKey] = [];
  }
  mountMethod<S, T>(instance);
}

function notification<
    S,
    T extends OriginAgent<S> = OriginAgent<S>
    >(modelInstance:T, listener:null|((s:S)=>any)) {
  return function notify(nextState:S, action:Action, dispatch:(ac:Action)=>void):void {
    const active = isConnecting(modelInstance) || modelInstance[agentSharingTypeKey] === 'hard';
    const prevState:S = modelInstance.state;
    const needUpdate = nextState !== prevState;
    if (
      needUpdate
        && active
        && action.type !== DefaultActionType.DX_MUTE_STATE
    ) {
      modelInstance.state = nextState;
    }
    if (needUpdate && action.type !== DefaultActionType.DX_MUTE_STATE) {
      const ls = modelInstance[agentListenerKey] || [];
      ls.forEach((l) => {
        if (l === listener) {
          return;
        }
        l(nextState);
      });
    }
    dispatch(action);
  };
}

export function createSharingModelConnector<
    S,
    T extends OriginAgent<S> = OriginAgent<S>
    >(modelInstance: T&{[agentListenerKey]?:((s:S)=>any)[]}):ModelConnector<S, T> {
  let listener:null|((s:S)=>any) = null;
  let unsubscribe:null|(()=>any) = null;
  return {
    connect(l:(s:S)=>any) {
      if (unsubscribe || listener) {
        return;
      }
      initialModel<S, T>(modelInstance);
      listener = l;
      unsubscribe = subscribe(modelInstance, l);
    },
    notify(nextState:S, action:Action, dispatch:(ac:Action)=>void) {
      const notify = notification(modelInstance, listener);
      notify(nextState, action, dispatch);
    },
    disconnect() {
      if (unsubscribe === null || listener === null) {
        throw new Error('The `unsubscribe` function is `null`, please deploy `connect` function before use `disconnect`');
      }
      unsubscribe();
      unsubscribe = null;
      listener = null;
    },
  };
}

export function isConnecting<
    S,
    T extends OriginAgent<S> = OriginAgent<S>
    >(modelInstance: T&{[agentListenerKey]?:((s:S)=>any)[]}):boolean {
  const listeners = modelInstance[agentListenerKey] || [];
  return listeners.length !== 0;
}
