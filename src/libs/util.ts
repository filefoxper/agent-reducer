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
  const it = Object.keys(owns);
  const newOwns: Array<[string, PropertyDescriptor]> = it.map((key) => {
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

export function isPromise(data: unknown): data is Promise<any> {
  if (!data) {
    return false;
  }
  const dataType = typeof data;
  return (
    (dataType === 'object' || dataType === 'function')
    && typeof (data as {then:(d:unknown)=>unknown}).then === 'function'
  );
}

export function isObject<T extends {[key:string]:any}>(data: T):boolean {
  return data && Object.prototype.toString.apply(data) === '[object Object]';
}

export function createInstance<T extends Record<string, unknown>>(
  Clazz:{new (...a:any[]):T},
  ...args:any[]
):T {
  return new Clazz(...args);
}

export function noop():void {
  /* noop */
}

let warningSet:Set<string>|null = null;

export function enableWarning():void {
  warningSet = new Set<string>();
}

/**
 * Prints a warning in the console if it exists.
 *
 * @param {String} message The warning message.
 * @returns {void}
 */
export function warning(message: string):void {
  if (!warningSet) {
    return;
  }
  if (warningSet.has(message)) {
    return;
  }
  /* eslint-disable no-console */
  if (typeof console !== 'undefined' && typeof console.error === 'function') {
    console.error(message);
  }
  warningSet.add(message);
  /* eslint-enable no-console */
  try {
    // This error was thrown as a convenience so that if you enable
    // "break on all exceptions" in your console,
    // it would pause the execution at this line.
    throw new Error(message);
    /* eslint-disable no-empty */
  } catch (e) {}
  /* eslint-enable no-empty */
}
