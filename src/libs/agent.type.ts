import { OriginAgent, Env, Runtime, MiddleWare } from "./global.type";
import { StoreSlot } from "./reducer.type";

export type AgentDependencies<S, T extends OriginAgent<S>> = {
  entry: T;
  store: StoreSlot<S>;
  env: Env;
  cache: { [key: string]: Runtime<T> };
  functionCache: any;
  middleWare: MiddleWare;
};
