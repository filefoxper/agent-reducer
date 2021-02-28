export const getScope = () => {
  return ("undefined" !== typeof process &&
    "[object process]" === {}.toString.call(process)) ||
    ("undefined" !== typeof navigator && navigator.product === "ReactNative")
    ? global
    : self;
};

export const noProxy = () => {
  const scope = getScope();
  return scope?!scope["Proxy"]:Proxy;
};

function getDescriptors(
  target: any,
  receiver: any,
  ownOrPrototype: any,
  handler: ProxyHandler<any>
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
        if (valid) {
          target[key] = v;
        } else {
          throw new Error(key + " in proxy target is not mutable");
        }
      },
    };
    return [key, newDesc];
  });
  return newOwns.reduce((res, [key, desc]) => ({ ...res, [key]: desc }), {});
}

export const useSimpleProxy = <T extends object>(
  target: T,
  handler: ProxyHandler<T>
): T => {
  let proxy = {};
  const own = getDescriptors(target, proxy as T, target, handler);
  const prototype = getDescriptors(
    target,
    proxy as T,
    Object.getPrototypeOf(target),
    handler
  );
  Object.defineProperties(proxy, { ...prototype, ...own });
  return proxy as T;
};

export const createProxy = <T extends object>(
  target: T,
  handler: ProxyHandler<T>
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
    (dataType === "object" || dataType === "function") &&
    typeof data.then === "function"
  );
}

export function isObject(data: any) {
  return data && Object.prototype.toString.apply(data) === "[object Object]";
}
