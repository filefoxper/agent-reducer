import {
  Action, OriginAgent,
} from './global.type';
import {
  agentActionKey,
  agentEffectsKey,
  agentErrorConnectionKey,
  agentListenerKey,
  agentMethodName,
  agentModelInstanceInitialedKey,
  agentModelMethodsCacheKey,
  agentModelResetKey,
  agentSharingMiddleWareKey,
  agentSharingTypeKey, agentStrictModelActMethodKey, agentStrictModelKey, DefaultActionType,
} from './defines';
import { ModelConnector } from './sharing.type';
import { unmountEffects } from './effect';
import { validate } from './util';

export function resetModel<
    S,
    T extends OriginAgent<S>=OriginAgent<S>
    >(entity:T):void {
  entity[agentSharingMiddleWareKey] = undefined;
  entity[agentActionKey] = undefined;
  entity[agentModelMethodsCacheKey] = undefined;
  entity[agentModelInstanceInitialedKey] = undefined;
  unmountEffects(entity);
  entity[agentEffectsKey] = undefined;
  entity[agentErrorConnectionKey] = undefined;
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
    if (value[agentMethodName] === key) {
      return r;
    }
    const processedValue = Object.assign(value, { [agentMethodName]: key });
    return { ...r, [key]: { ...funcDesc, value: processedValue } };
  }, {});
  Object.defineProperties(instance, description);
}

function markIfStrict<
    S,
    T extends OriginAgent<S> = OriginAgent<S>
    >(instance: T):void {
  if (instance[agentStrictModelKey]) {
    return;
  }
  const prototype = Object.getPrototypeOf(instance);
  const constructorFn = prototype.constructor;
  const isModelStrict = constructorFn[agentStrictModelKey];
  const modelKeys = Object.getOwnPropertyNames(prototype);
  const hasActMethod = modelKeys.some((key) => {
    const value = instance[key];
    if (typeof value !== 'function') {
      return false;
    }
    const method = value as ((...args:any[])=>any)&{
      [agentStrictModelActMethodKey]?:boolean
    };
    return method[agentStrictModelActMethodKey];
  });
  instance[agentStrictModelKey] = isModelStrict || hasActMethod;
  if (isModelStrict && !hasActMethod) {
    validate(false, 'In strict mode, there should be at least one `act` method.');
  }
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
  if (!instance[agentErrorConnectionKey]) {
    instance[agentErrorConnectionKey] = [];
  }
  if (!instance[agentModelMethodsCacheKey]) {
    instance[agentModelMethodsCacheKey] = {};
  }
  markIfStrict<S, T>(instance);
  if (instance[agentModelInstanceInitialedKey]) {
    return;
  }
  mountMethod<S, T>(instance);
  instance[agentModelInstanceInitialedKey] = true;
}

function notification<
    S,
    T extends OriginAgent<S> = OriginAgent<S>
    >(modelInstance:T, listener:null|((s:S)=>any)) {
  return function notify(action:Action, dispatch:(ac:Action)=>void):void {
    const { state: nextState, prevState } = action;
    const needUpdate = nextState !== prevState;
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
    notify(action:Action, dispatch:(ac:Action)=>void) {
      const notify = notification(modelInstance, listener);
      notify(action, dispatch);
    },
    disconnect() {
      if (unsubscribe === null || listener === null) {
        return;
      }
      unsubscribe();
      unsubscribe = null;
      listener = null;
    },
  };
}
