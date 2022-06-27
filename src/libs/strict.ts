import {
  ClassConstructorCaller, DecoratorCaller, MethodDecoratorCaller, Model,
} from './global.type';
import { validate } from './util';
import { agentModelFlowMethodKey, agentStrictModelActMethodKey, agentStrictModelKey } from './defines';

export function act():MethodDecoratorCaller {
  return function actDecorator<S = any, T extends Model<S> = Model<S>>(
    target: T,
    p?: string,
  ):DecoratorCaller {
    const source = target[p as keyof T];
    validate(
      typeof (p as unknown) != null && typeof source === 'function',
      'The `act` decorator can only use on methods',
    );
    const isFlowMethod = source[agentModelFlowMethodKey];
    validate(!isFlowMethod, 'The `act` decorator can not use on a flow method');
    source[agentStrictModelActMethodKey] = true;
    return source as DecoratorCaller;
  };
}

export function strict():DecoratorCaller {
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
