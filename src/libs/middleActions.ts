import { agentDependenciesKey } from "./defines";
import {
  OriginAgent,
  Env,
  MiddleWare,
  LifecycleMiddleWare,
  LifecycleEnv,
  LifecycleRuntime,
} from "./global.type";
import { AgentDependencies } from "./agent.type";
import {
  MiddleActionsInterface,
  MiddleActionDependencies,
  AsyncInvokeDependencies,
  AsyncRuntime,
} from "./middleActions.type";
import { createProxy } from "./util";
import { MiddleWareAbleFunction } from "./useMiddleWare.type";
import { generateAgent } from "./agent";
import { applyMiddleWares, defaultMiddleWare } from "./applies";

function rebuildMiddleActionDependencies<T extends OriginAgent<S>, S>(
  agent: T | undefined,
  source: MiddleWareAbleFunction,
  globalMiddleWare?: MiddleWare | LifecycleMiddleWare
): MiddleActionDependencies<T> {
  const { middleWare: cloneMiddleWare } = source;
  const invokeDependencies: AgentDependencies<S, T> = agent
    ? agent[agentDependenciesKey]
    : undefined;
  if (!agent || !invokeDependencies) {
    return {
      middleWare: cloneMiddleWare
        ? cloneMiddleWare
        : globalMiddleWare
        ? globalMiddleWare
        : defaultMiddleWare,
    };
  }
  const { entry, store, env, middleWare } = invokeDependencies;

  let branchAgent: MiddleActionDependencies<T>;

  const reCloneAgentWithNewExpired = () => {
    branchAgent = cloneAgentWithNewExpired();
  };

  const cloneAgentWithNewExpired = (): MiddleActionDependencies<T> => {
    let expired: boolean = false;
    let cloneEnv: LifecycleEnv = {
      ...env,
      expire: () => {
        expired = true;
      },
      rebuild: () => {
        expired = true;
        reCloneAgentWithNewExpired();
      },
    };
    const cloneEnvProxy = createProxy(cloneEnv, {
      set() {
        return false;
      },
      get(target: Env, property: keyof Env) {
        const source = target[property];
        if (property === "expired") {
          return env.expired || expired;
        }
        return source;
      },
    });
    return {
      agent: generateAgent(entry, store, cloneEnvProxy, middleWare, {
        sourceAgent: agent,
        type: "copy",
      }),
      middleWare: cloneMiddleWare
        ? cloneMiddleWare
        : globalMiddleWare
        ? globalMiddleWare
        : defaultMiddleWare,
      agentEnv: cloneEnvProxy,
    };
  };

  branchAgent = cloneAgentWithNewExpired();

  return createProxy(branchAgent, {
    get(
      target: MiddleActionDependencies<T>,
      p: keyof MiddleActionDependencies<T>
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
      if (p === "agent" && agent) {
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
  const [agent, ...rest] = middleWares;
  const ag = agent && typeof agent !== "function" ? agent : undefined;
  const mdwStart = agent && typeof agent === "function" ? [agent] : [];
  const mdws = [
    ...mdwStart,
    ...rest.filter(
      (d): d is MiddleWare | LifecycleMiddleWare => typeof d === "function"
    ),
  ];
  const mdw = mdws.length ? applyMiddleWares(...mdws) : undefined;
  if (typeof middleActions === "function" && !ag) {
    throw new Error(
      'When the first param "middleAction" is a class or a function, the second param should be an agent object.'
    );
  }
  let invokeDependencies: AsyncInvokeDependencies = {
    cache: {},
    functionCache: {},
  };
  const sideByCallerInstance: P =
    typeof middleActions === "function"
      ? new middleActions(ag as T)
      : middleActions;

  const agentShouldBe = sideByCallerInstance.agent;
  if (agentShouldBe && agentShouldBe[agentDependenciesKey] === undefined) {
    throw new Error(
      "`middleActions` should create with an valid agent or no agent."
    );
  }
  const defaultMiddleWare = <T>(data: T) => data;
  const proxy = createProxy(sideByCallerInstance, {
    get(target: any, type: string): any {
      const source = target[type];
      if (type === "agent" || typeof source !== "function") {
        return target[type];
      }
      let { cache, functionCache } = invokeDependencies;

      cache[type] = cache[type] || {};

      if (functionCache[type]) {
        return functionCache[type];
      }
      const middleWareActionDependencies = rebuildMiddleActionDependencies(
        sideByCallerInstance.agent,
        source,
        mdw
      );
      const copy = copyMiddleActions<T, P, S>(
        sideByCallerInstance,
        middleWareActionDependencies.agent
      );
      const caller = function caller(...args: any[]) {
        let runtime = cache[type];
        if (runtime) {
          runtime.args = [...args];
        }
        const { agent, middleWare } = middleWareActionDependencies;
        const lifecycleMiddleWare = middleWare as LifecycleMiddleWare;
        const normalMiddleWare = middleWare as MiddleWare;
        if (lifecycleMiddleWare.lifecycle && !agent) {
          throw new Error(
            "a middleAction without agent can not use lifecycle middleWare."
          );
        }
        const nextProcess = lifecycleMiddleWare.lifecycle
          ? lifecycleMiddleWare(cache[type] as LifecycleRuntime)
          : normalMiddleWare(cache[type]);
        if (!nextProcess) {
          runtime.tempCaller = undefined;
          return;
        }
        const sourceCaller = runtime.tempCaller || source;
        const nextState = sourceCaller.apply(copy, args);
        const stateProcess = nextProcess(defaultMiddleWare);
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
          callback: (value: any, instance: P, runtime: AsyncRuntime<P>) => any
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
