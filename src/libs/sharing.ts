import { Model, OriginAgent, SharingType } from './global.type';
import {
  agentListenerKey, agentModelResetKey, agentModelResetVersionKey, agentSharingTypeKey,
} from './defines';
import {
  Factory, Ref, SharingRef,
} from './sharing.type';
import { createProxy } from './util';
import { resetModel } from './connector';

function createSharingModel<
    S,
    T extends OriginAgent<S> = OriginAgent<S>
    >(ModelLike:T|{new ():T}):T {
  const nextModel:T&{
    [agentSharingTypeKey]?:SharingType,
    [agentListenerKey]?:((s:S)=>any)[]
  } = typeof ModelLike === 'function' ? new ModelLike() : ModelLike;
  nextModel[agentSharingTypeKey] = 'hard';
  return nextModel;
}

export function getSharingType<
    S,
    T extends Model<S>=Model<S>
    >(model:T):undefined|SharingType {
  return model[agentSharingTypeKey];
}

export function sharing<
    S,
    T extends OriginAgent<S> = OriginAgent<S>
    >(
  factory:Factory<S, T>,
):SharingRef<S, T> {
  let initialed = false;
  const ref:Ref<S, T> = {
    current: null,
  };
  ref.initial = (...args:any[]):T => {
    if (ref.current && initialed) {
      return ref.current;
    }
    initialed = true;
    const ModelLike = factory(...args);
    ref.current = createSharingModel<S, T>(ModelLike);
    return ref.current as T;
  };
  return createProxy(ref, {
    get(
      target: Ref<S, T>,
      p: keyof Ref<S, T>,
    ): any {
      const value = target[p];
      if (p === 'current' && !value) {
        const initialCurrent = createSharingModel<S, T>(factory());
        ref.current = initialCurrent;
        return initialCurrent;
      }
      return value;
    },
  }) as SharingRef<S, T>;
}

function createWeakSharingModel<
    S,
    T extends OriginAgent<S> = OriginAgent<S>
    >(ModelLike:T|{new ():T}, reset:()=>void):T {
  const nextModel:T&{
        [agentModelResetKey]?:()=>void,
        [agentSharingTypeKey]?:SharingType,
        [agentListenerKey]?:((s:S)=>any)[]
    } = typeof ModelLike === 'function' ? new ModelLike() : ModelLike;
  nextModel[agentModelResetKey] = reset;
  nextModel[agentSharingTypeKey] = 'weak';
  return nextModel;
}

export function weakSharing<
    S,
    T extends OriginAgent<S>=OriginAgent<S>
    >(
  factory:Factory<S, T>,
):SharingRef<S, T> {
  let initialed = false;
  let initialParams:null|(any[]) = null;
  const ref:Ref<S, T> = {
    current: null,
  };
  const reset = () => {
    if (!ref.current) {
      return;
    }
    resetModel<S, T>(ref.current);
    const ModelLike = Array.isArray(initialParams)
      ? factory(...initialParams) : factory();
    const newInstance = createWeakSharingModel<S, T>(ModelLike, reset);
    const lastVersion = ref.current[agentModelResetVersionKey];
    Object.assign(ref.current, newInstance);
    ref.current[agentModelResetVersionKey] = (lastVersion || 0) + 1;
    initialParams = null;
    initialed = false;
  };
  ref.initial = (...args:any[]):T => {
    if (ref.current && initialed) {
      return ref.current;
    }
    initialed = true;
    initialParams = [...args];
    const ModelLike = factory(...args);
    ref.current = createWeakSharingModel<S, T>(ModelLike, reset);
    return ref.current as T;
  };
  return createProxy(ref, {
    get(
      target: Ref<S, T>,
      p: keyof Ref<S, T>,
    ): any {
      const value = target[p];
      if (p === 'current' && !value) {
        const initialCurrent = createWeakSharingModel<S, T>(factory(), reset);
        ref.current = initialCurrent;
        return initialCurrent;
      }
      return value;
    },
  }) as SharingRef<S, T>;
}
