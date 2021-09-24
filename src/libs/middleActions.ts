import { agentDependenciesKey } from './defines';
import {
  OriginAgent,
  Env,
  MiddleWare,
  LifecycleMiddleWare,
  LifecycleEnv,
  LifecycleRuntime,
} from './global.type';
import { AgentDependencies } from './agent.type';
import {
  MiddleActionsInterface,
  MiddleActionDependencies,
  AsyncInvokeDependencies,
  AsyncRuntime,
} from './middleActions.type';
import { createInstance, createProxy, warning } from './util';
import { MiddleWareAbleFunction } from './useMiddleWare.type';
import { generateAgent } from './agent';
import { applyMiddleWares, defaultMiddleWare } from './applies';

function rebuildMiddleActionDependencies<T extends OriginAgent<S>, S>(
  agent: T | undefined,
  source: MiddleWareAbleFunction,
  globalMiddleWare?: MiddleWare | LifecycleMiddleWare,
): MiddleActionDependencies<T> {
  const { middleWare: cloneMiddleWare } = source;
  const invokeDependencies: AgentDependencies<S, T> = agent
    ? agent[agentDependenciesKey]
    : undefined;
  if (!agent || !invokeDependencies) {
    return {
      middleWare: cloneMiddleWare || (globalMiddleWare || defaultMiddleWare),
    };
  }
  const {
    entry, store, env, middleWare,
  } = invokeDependencies;

  let branchAgent: MiddleActionDependencies<T>;

  const cloneAgentWithNewExpired = (): MiddleActionDependencies<T> => {
    let expired = false;
    const cloneEnv: LifecycleEnv = {
      ...env,
      expire: () => {
        expired = true;
      },
      rebuild: () => {
        expired = true;
        branchAgent = cloneAgentWithNewExpired();
      },
    };
    const cloneEnvProxy = createProxy(cloneEnv, {
      set() {
        return false;
      },
      get(target: Env, property: keyof Env) {
        const data = target[property];
        if (property === 'expired') {
          return env.expired || expired;
        }
        return data;
      },
    });
    return {
      agent: generateAgent(entry, store, cloneEnvProxy, middleWare, {
        sourceAgent: agent,
        type: 'copy',
      }),
      middleWare: cloneMiddleWare || (globalMiddleWare || defaultMiddleWare),
      agentEnv: cloneEnvProxy,
    };
  };

  branchAgent = cloneAgentWithNewExpired();

  return createProxy(branchAgent, {
    get(
      target: MiddleActionDependencies<T>,
      p: keyof MiddleActionDependencies<T>,
    ): any {
      return branchAgent[p];
    },
  });
}

function copyMiddleActions<
  T extends OriginAgent<S>,
  P extends MiddleActionsInterface<T, S>,
  S = any
>(middleActionsInstance: P, agent?: T) {
  return createProxy(middleActionsInstance, {
    get(target: P, p: string): any {
      if (p === 'agent' && agent) {
        return agent;
      }
      return target[p];
    },
  });
}

export function useMiddleActions<
  T extends OriginAgent<S>,
  P extends MiddleActionsInterface<T, S>,
  S = any
>(
  middleActions: { new (agent: T): P } | P,
  ...middleWares: (T | MiddleWare | LifecycleMiddleWare)[]
): P {
  warning('Not recommend, API `useMiddleActions` will not exist from `agent-reducer@4.0.0`');
  const [agent, ...rest] = middleWares;
  const ag = agent && typeof agent !== 'function' ? agent : undefined;
  const mdwStart = agent && typeof agent === 'function' ? [agent] : [];
  const mdws = [
    ...mdwStart,
    ...rest.filter(
      (d): d is MiddleWare | LifecycleMiddleWare => typeof d === 'function',
    ),
  ];
  const mdw = mdws.length ? applyMiddleWares(...mdws) : undefined;
  if (typeof middleActions === 'function' && !ag) {
    throw new Error(
      'When the first param "middleAction" is a class or a function, the second param should be an agent object.',
    );
  }
  const invokeDependencies: AsyncInvokeDependencies = {
    cache: {},
    functionCache: {},
  };
  const sideByCallerInstance: P = typeof middleActions === 'function'
    ? createInstance(middleActions, ag as T)
    : middleActions;

  const agentShouldBe = sideByCallerInstance.agent;
  if (agentShouldBe && agentShouldBe[agentDependenciesKey] === undefined) {
    throw new Error(
      '`middleActions` should create with an valid agent or no agent.',
    );
  }
  const middleWareDefault = <D>(data: D) => data;
  const proxy = createProxy(sideByCallerInstance, {
    get(target: any, type: string): any {
      const source = target[type];
      if (type === 'agent' || typeof source !== 'function') {
        return target[type];
      }
      const { cache, functionCache } = invokeDependencies;

      cache[type] = cache[type] || {};

      if (functionCache[type]) {
        return functionCache[type];
      }
      const middleWareActionDependencies = rebuildMiddleActionDependencies(
        sideByCallerInstance.agent,
        source,
        mdw,
      );
      const copy = copyMiddleActions<T, P, S>(
        sideByCallerInstance,
        middleWareActionDependencies.agent,
      );
      const caller = function caller(...args: any[]):any {
        const runtime = cache[type];
        if (runtime) {
          runtime.args = [...args];
        }
        const { agent: agr, middleWare } = middleWareActionDependencies;
        const lifecycleMiddleWare = middleWare as LifecycleMiddleWare;
        const normalMiddleWare = middleWare as MiddleWare;
        if (lifecycleMiddleWare.lifecycle && !agr) {
          throw new Error(
            'a middleAction without agent can not use lifecycle middleWare.',
          );
        }
        const nextProcess = lifecycleMiddleWare.lifecycle
          ? lifecycleMiddleWare(cache[type] as LifecycleRuntime)
          : normalMiddleWare(cache[type]);
        if (!nextProcess) {
          runtime.tempCaller = undefined;
          return undefined;
        }
        const sourceCaller = runtime.tempCaller || source;
        const nextState = sourceCaller.apply(copy, args);
        const stateProcess = nextProcess(middleWareDefault);
        const result = stateProcess(nextState);
        runtime.tempCaller = undefined;
        return result;
      };
      cache[type] = {
        caller,
        callerName: type,
        sourceCaller: source,
        source: sideByCallerInstance,
        target: proxy,
        env: middleWareActionDependencies.agentEnv,
        cache: {},
        rollbacks: {},
        mapSourceProperty(
          key: keyof P,
          callback: (value: any, instance: P, runtime: AsyncRuntime<P>) => any,
        ) {
          const current = sideByCallerInstance[key];
          const newValue = callback(current, sideByCallerInstance, this);
          if (type === key) {
            this.tempCaller = newValue;
          } else {
            sideByCallerInstance[key] = newValue;
            this.rollbacks[key] = current;
          }
          return this;
        },
        rollback() {
          Object.assign(sideByCallerInstance, this.rollbacks);
          this.rollbacks = {};
          this.tempCaller = undefined;
          return this;
        },
      } as AsyncRuntime<P>;
      functionCache[type] = caller;
      return caller;
    },
  });
  return proxy;
}

export class MiddleActions<T extends OriginAgent<S>, S = any> {
  agent: T;

  constructor(agent: T) {
    this.agent = agent;
  }
}
