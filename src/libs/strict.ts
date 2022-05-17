import {
  ClassConstructorCaller, DecoratorCaller, MethodDecoratorCaller, Model,
} from './global.type';
import { validate } from './util';
import { agentStrictModelActMethodKey, agentStrictModelKey } from './defines';
import { validateExperience } from './experience';

export function act():MethodDecoratorCaller {
  validateExperience();
  return function actDecorator<S = any, T extends Model<S> = Model<S>>(
    target: T,
    p?: string,
  ):DecoratorCaller {
    const source = target[p as keyof T];
    validate(
      typeof (p as unknown) != null && typeof source === 'function',
      'The `act` decorator can only use on methods',
    );
    source[agentStrictModelActMethodKey] = true;
    return source as DecoratorCaller;
  };
}

export function strict():DecoratorCaller {
  validateExperience();
  return function strictDecorator<S = any, T extends Model<S> = Model<S>>(
    target: { new (...args: any[]): T },
    p?: string,
  ):ClassConstructorCaller<T> {
    validate(
      p == null,
      'The `strict` decorator can only use on class',
    );
    const source = target as { new (...args: any[]): T } & { [agentStrictModelKey]?: boolean };
    source[agentStrictModelKey] = true;
    return target;
  };
}
