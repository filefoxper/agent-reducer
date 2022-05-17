import { createProxy, isObject, validate } from './util';
import { Avatar } from './global.type';
import { validateExperience } from './experience';

export default function avatar<
    T extends Record<string, unknown>
    >(interfaces:T):Avatar<T> {
  validate(isObject(interfaces) || Array.isArray(interfaces), 'you need to provide a object or an array as a `interfaces`');
  let global:Partial<T>|undefined;
  return {
    current: createProxy(interfaces, {
      set(target: T, p: string, value: any, receiver: any): boolean {
        return false;
      },
      get(target: T, p: string, receiver: any): any {
        const avatarObj = global || interfaces;
        if (p in avatarObj) {
          return avatarObj[p];
        }
        return interfaces[p];
      },
    }) as T,
    implement(impl:Partial<T>) {
      global = impl;
      return () => {
        global = undefined;
      };
    },
  };
}
