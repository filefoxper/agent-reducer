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
} from './defines';
import { unblockThrow, validate, warn } from './util';
import { stateUpdatable } from './status';
import { validateExperience } from './experience';

function extractValidateMethodName<S=any, T extends Model<S> = Model>(
  model:T,
  target?:keyof T|ModelInstanceMethod<S, T>|'*',
):string|null {
  if (!target) {
    return null;
  }
  if (target === '*') {
    return target as string;
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
    methodName: methodName === '*' ? null : methodName,
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
      unblockThrow(e);
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
        unblockThrow(e);
      }
    }
  };
  return effect as Effect<S, T>;
}

export function runningNotInitialedModelEffects<S=any, T extends Model<S> = Model>(model:T):void {
  if (!stateUpdatable<S, T>(model)) {
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
  method?:keyof T|ModelInstanceMethod<S, T>|'*',
):EffectWrap {
  validate(stateUpdatable<S, T>(model), 'The target model instance is expired');
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
      unblockThrow(e);
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
      unblockThrow(e);
    }
  }
  if (!stateUpdatable<S, T>(model)) {
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

function checkEffectDecoratorParams<S=any, T extends Model<S>=Model>(
  target:T,
  p?:string,
  method?:(()=>((...args:any[])=>any)|(((...args:any[])=>any)[]))|'*',
):void {
  validate(typeof p === 'string', 'this decorator can not be used on class');
  validate(
    method === '*' || typeof method === 'function',
    'the param of decorator is invalidate',
  );
}

export function effectDecorator<S=any, T extends Model<S>=Model>(
  method:(()=>((...args:any[])=>any)|(((...args:any[])=>any)[]))|'*',
):MethodDecoratorCaller {
  return function effectTo(target:T, p:string) {
    checkEffectDecoratorParams<S, T>(target, p, method);
    const call:EffectDecoratorCallback<S, T> = target[p];
    const param = method;
    const callEffectTargets = call[agentCallingEffectTargetKey] || [];
    const nextCallEffectTargets = [...callEffectTargets, param];
    const hasInvalidation = nextCallEffectTargets.length > 1
        && nextCallEffectTargets.some((t) => typeof t === 'string');
    validate(!hasInvalidation, 'the effect method can not both listen to: `*` or `methods`');
    const targetSet = new Set(nextCallEffectTargets);
    call[agentCallingEffectTargetKey] = [...targetSet.values()];
    return call;
  };
}

function extractEffectTargetFromMethod<
    S,
    T extends Model<S> = Model<S>
    >(entity:T, method:EffectMethod):null|Array<(EffectDecoratorTargetMethod)|T|string> {
  const effectTarget = method[agentCallingEffectTargetKey];
  if (!Array.isArray(effectTarget) || !effectTarget.length) {
    return null;
  }
  const methodTargets = effectTarget.filter((target) => typeof target === 'function');
  if (methodTargets.length) {
    return methodTargets;
  }
  const [data] = effectTarget;
  if (data === '*') {
    return [entity];
  }
  return null;
}

function checkEffectMethod<
    S,
    T extends Model<S> = Model<S>
    >(entity:T, method:(...args:any[])=>any):boolean {
  const mayValidateMethod = (method as ((...args:any[])=>any)&{[agentMethodName]:string});
  const methodName = mayValidateMethod[agentMethodName];
  return !!(methodName && entity[methodName]);
}

function recomposeMethods<
    S,
    T extends Model<S> = Model<S>
    >(
  entity:T,
  targetMethods:((...args:any[])=>any)|((...args:any[])=>any)[],
):((...args:any[])=>any)[] {
  if (typeof targetMethods === 'function' && checkEffectMethod<S, T>(entity, targetMethods)) {
    return [targetMethods];
  }
  if (Array.isArray(targetMethods)) {
    return targetMethods.filter((call) => checkEffectMethod<S, T>(entity, call));
  }
  return [];
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
        const targetMethods = target();
        const targetMethodArray = recomposeMethods<S, T>(entity, targetMethods);
        targetMethodArray.forEach((targetMethod) => {
          addEffect((...args) => methodEffectBuilder(value, args), entity, targetMethod);
        });
        return;
      }
      if (typeof target === 'string') {
        return;
      }
      addEffect((...args) => methodEffectBuilder(value, args), entity, '*');
    });
  });
}
