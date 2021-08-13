import { OriginAgent, SharingType } from './global.type';
import {
  agentListenerKey, agentModelResetKey, agentSharingTypeKey,
} from './defines';
import {
  Factory, Ref, SharingRef,
} from './sharing.type';
import { createProxy } from './util';
import { resetModel } from './connector';

function createSharingModel<
    S,
    T extends OriginAgent<S> = OriginAgent<S>
    >(Model:T|{new ():T}):T {
  const nextModel:T&{
    [agentSharingTypeKey]?:SharingType,
    [agentListenerKey]?:((s:S)=>any)[]
  } = typeof Model === 'function' ? new Model() : Model;
  nextModel[agentSharingTypeKey] = 'hard';
  return nextModel;
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
    const Model = factory(...args);
    ref.current = createSharingModel<S, T>(Model);
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
    >(Model:T|{new ():T}, reset:()=>void):T {
  const nextModel:T&{
        [agentModelResetKey]?:()=>void,
        [agentSharingTypeKey]?:SharingType,
        [agentListenerKey]?:((s:S)=>any)[]
    } = typeof Model === 'function' ? new Model() : Model;
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
  const ref:Ref<S, T> = {
    current: null,
  };
  const reset = () => {
    if (ref.current) {
      resetModel<S, T>(ref.current);
    }
    ref.current = null;
  };
  ref.initial = (...args:any[]):T => {
    if (ref.current && initialed) {
      return ref.current;
    }
    initialed = true;
    const Model = factory(...args);
    ref.current = createWeakSharingModel<S, T>(Model, reset);
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
