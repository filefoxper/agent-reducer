import {
  Action,
  Effect,
  EffectCallback,
  EffectDecoratorCallback,
  EffectDecoratorTargetMethod,
  EffectMethod,
  EffectWrap,
  MethodDecoratorCaller,
  Model,
  ModelInstanceMethod,
} from './global.type';
import {
  agentCallingEffectTargetKey,
  agentEffectsKey,
  agentMethodName,
  agentModelWorking,
  effectModelTargetPlacement,
} from './defines';
import { validate, warn } from './util';
import { isConnecting } from './status';

function extractValidateMethodName<S=any, T extends Model<S> = Model>(
  model:T,
  target?:keyof T|ModelInstanceMethod<S, T>,
):string|null {
  if (!target) {
    return null;
  }
  if (typeof target === 'function') {
    const method = target as ModelInstanceMethod<S, T>;
    const methodName = method[agentMethodName];
    validate(
      !!(methodName && typeof model[methodName] === 'function'),
      'The target method for effect is invalidated',
    );
    return methodName as string;
  }
  if (typeof target === 'string') {
    validate(
      typeof model[target] === 'function',
      'The target method for effect is invalidated',
    );
    return target;
  }
  warn(new Error('The typeof method should be `string` or `function`'));
  return null;
}

function createEffect<S=any, T extends Model<S> = Model>(
  callback:EffectCallback<S>,
  model:T,
  methodName:string|null,
):Effect<S, T> {
  const effect:Omit<
      Effect<S, T>,
      'mount'|'update'|'unmount'
      >&{
    mount?:()=>void,
    update?:(nextCallback:EffectCallback<S>)=>void,
    unmount?:()=>void
  } = {
    callback,
    methodName,
    initialed: false,
    destroy: null,
  };
  effect.mount = function mount() {
    effect.initialed = true;
    if (methodName) {
      return;
    }
    const { state } = model;
    try {
      const destroy = callback(state, state, null);
      effect.destroy = typeof destroy === 'function' ? destroy : null;
    } catch (e) {
      warn(e);
    }
  };
  effect.update = function update(nextCallback:EffectCallback<S>) {
    effect.callback = nextCallback;
  };
  effect.unmount = function unmountSelf() {
    const all = model[agentEffectsKey] || [];
    const index = all.findIndex(({ callback: call }) => call === callback);
    if (index < 0) {
      return;
    }
    const [remove] = all.splice(index, 1);
    const destroy = remove ? remove.destroy : null;
    if (typeof destroy === 'function') {
      try {
        destroy();
      } catch (e) {
        warn(e);
      }
    }
  };
  return effect as Effect<S, T>;
}

export function runningNotInitialedModelEffects<S=any, T extends Model<S> = Model>(model:T):void {
  if (!isConnecting<S, T>(model)) {
    return;
  }
  const effects = model[agentEffectsKey] || [];
  const notInitialedModelEffects = effects.filter(
    (effect) => !effect.initialed,
  );
  notInitialedModelEffects.forEach((effect) => {
    effect.mount();
  });
}

export function addEffect<S=any, T extends Model<S> = Model>(
  callback:EffectCallback<S>,
  model:T,
  method?:keyof T|ModelInstanceMethod<S, T>,
):EffectWrap {
  validate(isConnecting<S, T>(model), 'The target model is unconnected');
  const methodName = extractValidateMethodName(model, method);

  const effect:Effect<S, T> = createEffect(callback, model, methodName);
  if (!model[agentModelWorking]) {
    model[agentModelWorking] = true;
    effect.mount();
    runningNotInitialedModelEffects(model);
    model[agentModelWorking] = false;
  }
  model[agentEffectsKey] = model[agentEffectsKey] || [];
  const effects = model[agentEffectsKey] as Effect[];
  effects.push(effect);
  return {
    update(nextCallback:EffectCallback<S>) {
      effect.update(nextCallback);
    },
    unmount() {
      effect.unmount();
    },
  };
}

export function runEffects<S=any, T extends Model<S> = Model>(
  model:T,
  effectCopies:Effect[],
  action:Action,
):void {
  function isEffectMatched(ac:Action, ef:Effect) {
    const { type } = ac;
    const { methodName } = ef;
    return methodName == null || methodName === type;
  }
  function runDestroy(ac:Action, ef:Effect) {
    const { destroy } = ef;
    if (!isEffectMatched(ac, ef) || typeof destroy !== 'function') {
      return;
    }
    try {
      destroy();
    } catch (e) {
      warn(e);
    }
  }
  function runEffect(ac:Action, ef:Effect) {
    const { prevState, state, type } = ac;
    const { callback } = ef;
    if (!isEffectMatched(ac, ef)) {
      return;
    }
    try {
      const destroy = callback(prevState, state, type);
      ef.destroy = typeof destroy === 'function' ? destroy : null;
    } catch (e) {
      warn(e);
    }
  }
  if (!isConnecting<S, T>(model)) {
    return;
  }
  effectCopies.forEach(runDestroy.bind(null, action));
  effectCopies.forEach(runEffect.bind(null, action));
}

export function unmountEffects<S=any, T extends Model<S> = Model>(model:T):void {
  const effects = model[agentEffectsKey] || [];
  effects.forEach((effect) => {
    effect.unmount();
  });
}

export function effectDecorator<S=any, T extends Model<S>=Model>(
  method?:(()=>((...args:any[])=>any)),
):MethodDecoratorCaller {
  return function effectTo(target:T, p:string) {
    const call:EffectDecoratorCallback<S, T> = target[p];
    const param = typeof method === 'function' ? method : effectModelTargetPlacement;
    const callEffectTargets = call[agentCallingEffectTargetKey] || [];
    callEffectTargets.push(param);
    const targetSet = new Set(callEffectTargets);
    call[agentCallingEffectTargetKey] = [...targetSet.values()];
    return call;
  };
}

function extractEffectTargetFromMethod<
    S,
    T extends Model<S> = Model<S>
    >(entity:T, method:EffectMethod):null|Array<(T|EffectDecoratorTargetMethod)> {
  const effectTarget = method[agentCallingEffectTargetKey];
  if (!Array.isArray(effectTarget) || !effectTarget.length) {
    return null;
  }
  return effectTarget.map((target) => {
    if (target === effectModelTargetPlacement) {
      return entity as T;
    }
    return target as EffectDecoratorTargetMethod;
  });
}

export function addMethodEffects<
    S,
    T extends Model<S> = Model<S>
    >(entity:T, methodEffectBuilder:(effectMethod:EffectMethod<S, T>, args:any[])=>any):void {
  const prototype = Object.getPrototypeOf(entity);
  const names = Object.getOwnPropertyNames(prototype);
  names.forEach((name) => {
    const value = entity[name];
    if (typeof value !== 'function') {
      return;
    }
    const targets = extractEffectTargetFromMethod<S, T>(entity, value);
    if (targets == null) {
      return;
    }
    targets.forEach((target) => {
      if (typeof target === 'function') {
        addEffect((...args) => methodEffectBuilder(value, args), entity, target());
        return;
      }
      addEffect((...args) => methodEffectBuilder(value, args), entity);
    });
  });
}
