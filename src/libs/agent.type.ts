import {
  OriginAgent, AgentDependencies as OriginDependencies,
} from './global.type';

export type AgentDependencies<S, T extends OriginAgent<S>> = OriginDependencies<S, T>;
