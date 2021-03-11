export const getScope = ():any|undefined => ((typeof process !== 'undefined'
    && {}.toString.call(process) === '[object process]')
    || (typeof navigator !== 'undefined' && navigator.product === 'ReactNative')
  ? global
  : self); // eslint-disable-line

const noProxy = ():boolean => {
  const scope = getScope();
  return scope ? !scope.Proxy : !!Proxy;
};

function getDescriptors(
  target: any,
  receiver: any,
  ownOrPrototype: any,
  handler: ProxyHandler<any>,
) {
  const owns = Object.getOwnPropertyDescriptors(ownOrPrototype);
  const it = Object.entries(owns);
  const newOwns: Array<[string, PropertyDescriptor]> = it.map(([key]) => {
    const newDesc: PropertyDescriptor = {
      get: (): any => {
        if (!handler.get) {
          return target[key];
        }
        return handler.get(target, key, receiver);
      },
      set: (v: any) => {
        if (!handler.set) {
          target[key] = v;
          return;
        }
        const valid = handler.set(target, key, v, receiver);
        if (!valid) {
          throw new Error(`${key} in proxy target is not mutable`);
        }
      },
    };
    return [key, newDesc];
  });
  return newOwns.reduce((res, [key, desc]) => ({ ...res, [key]: desc }), {});
}

export const useSimpleProxy = <T extends Record<string, unknown>>(
  target: T,
  handler: ProxyHandler<T>,
): T => {
  const proxy = {};
  const own = getDescriptors(target, proxy as T, target, handler);
  const prototype = getDescriptors(
    target,
    proxy as T,
    Object.getPrototypeOf(target),
    handler,
  );
  Object.defineProperties(proxy, { ...prototype, ...own });
  return proxy as T;
};

export const createProxy = <T extends Record<string, any>>(
  target: T,
  handler: ProxyHandler<T>,
): T => {
  if (noProxy()) {
    return useSimpleProxy(target, handler);
  }
  return new Proxy(target, handler);
};

export function isPromise(data: any): data is Promise<any> {
  if (!data) {
    return false;
  }
  const dataType = typeof data;
  return (
    (dataType === 'object' || dataType === 'function')
    && typeof data.then === 'function'
  );
}

export function isObject<T extends {[key:string]:any}>(data: T):boolean {
  return data && Object.prototype.toString.apply(data) === '[object Object]';
}

export function createInstance<T extends Record<string, unknown>>(
  Clazz:{new (...args:any[]):T},
  ...args:any[]
):T {
  return new Clazz(...args);
}

export function copyObject<T extends Record<string, any>>(object:T):T {
  return Object.create(Object.getPrototypeOf(object), Object.getOwnPropertyDescriptors(object));
}

export function assignWith<T extends Record<string, any>>(object:T, ...args:Array<Partial<T>>):T {
  return Object.assign(copyObject(object), ...args);
}

export function noop():void {
  /* noop */
}
