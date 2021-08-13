import {
  OriginAgent,
  EffectCaller,
  EffectWrap,
  Action,
  EffectRunner,
  MethodCaller,
  DecoratorCaller,
} from './global.type';
import {
  agentEffectKey,
  agentMethodEffectKey,
  agentMethodName,
  DefaultActionType,
} from './defines';

export function addEffect<S, T extends OriginAgent<S>>(
  callback:EffectCaller<S, T>,
  target:MethodCaller<T>|T,
):(()=>void) {
  const model = typeof target === 'function' ? ((target as MethodCaller<T>).model as T) : (target as T);
  const methods = typeof target === 'function' ? target : undefined;
  if (!model) {
    throw new Error('`Model instance` is available, you should give a initialed `Model instance` or a method from it.');
  }
  const wrappers:(EffectWrap<S, T>[])|undefined = model[agentEffectKey];
  if (!wrappers) {
    throw new Error('Can not add effect int to an unconnected `agent` or `model`');
  }
  const registered = wrappers.find((wrapper) => wrapper.callback === callback);
  if (registered) {
    return registered.unEffect;
  }
  const unEffect = function unEffect():void {
    const destroyWrappers:(EffectWrap<S, T>[]) = model[agentEffectKey] || [];
    const index = destroyWrappers.findIndex((w) => w.callback === callback);
    if (index < 0) {
      return;
    }
    const wrap = destroyWrappers[index];
    destroyWrappers.splice(index, 1);
    if (typeof wrap.destroy !== 'function') {
      return;
    }
    wrap.destroy();
  };
  const wrapper:EffectWrap<S, T> = { callback, methods, unEffect };
  wrappers.push(wrapper);

  if (!methods && model[agentEffectKey]) {
    wrapper.destroy = callback(model.state, model.state) as (undefined|(()=>void));
  }

  return unEffect;
}

/**
 * todo need redesign
 * @param target
 */
export function effect<S, T extends OriginAgent<S>>(
  target?:MethodCaller<T>|T,
):DecoratorCaller {
  return function effectDecorator(entry:T, p:string) {
    const call = entry[p];
    call[agentMethodEffectKey] = target || null;
    return call;
  } as DecoratorCaller;
}

function methodMatch(method:string|MethodCaller, type:string) {
  if (typeof method === 'function') {
    return method[agentMethodName] === type;
  }
  if (typeof method === 'string') {
    return method === type;
  }
  return false;
}

function match<S, T extends OriginAgent<S>>(
  prevState:S,
  effectWrapper:EffectWrap<S, T>,
  action:Action,
):boolean {
  const { type } = action;
  const { methods } = effectWrapper;
  if (!methods) {
    return true;
  }
  if (typeof methods === 'string' || typeof methods === 'function') {
    return methodMatch(methods, type);
  }
  if (Array.isArray(methods)) {
    return methods.some((m) => methodMatch(m as (string|MethodCaller), type));
  }
  return false;
}

export function effectsRunner<S, T extends OriginAgent<S>>(model:T):EffectRunner<S> {
  const update = function updateRun(prevState:S, currentState:S, action:Action) {
    const { type } = action;
    const effectWrappers = model[agentEffectKey] || [];
    const list = effectWrappers.filter((effectWrapper) => match(prevState, effectWrapper, action));
    list.forEach(({ destroy }) => {
      if (typeof destroy === 'function') {
        destroy();
      }
    });
    list.forEach((effectWrapper) => {
      const destroyCallback = effectWrapper.callback(prevState, currentState, type);
      effectWrapper.destroy = destroyCallback as (undefined|(()=>void));
    });
  };
  const disconnect = function disconnectRun() {
    const effectWrappers = model[agentEffectKey] || [];
    effectWrappers.forEach(({ destroy }) => {
      if (typeof destroy === 'function') {
        destroy();
      }
    });
  };
  return {
    update,
    disconnect,
  };
}
