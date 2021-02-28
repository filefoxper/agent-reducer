import { generateAgent } from "./agent";
import { agentDependenciesKey } from "./defines";
import { MiddleWareAbleFunction } from "./useMiddleWare.type";
import {
  OriginAgent,
  Env,
  MiddleWare,
  LifecycleEnv,
  LifecycleMiddleWare,
} from "./global.type";
import { AgentDependencies } from "./agent.type";
import { applyMiddleWares } from "./applies";
import { createProxy } from "./util";

export function useMiddleWare<S, T extends OriginAgent<S>>(
  agent: T & { [agentDependenciesKey]?: AgentDependencies<S, T> },
  ...mdws: (MiddleWare | LifecycleMiddleWare)[]
): T {
  return copyWithMiddleWare(agent, applyMiddleWares(...mdws), "copy");
}

export function decorateWithMiddleWare<S, T extends OriginAgent<S>>(
  agent: T & { [agentDependenciesKey]?: AgentDependencies<S, T> },
  mdw: MiddleWare | LifecycleMiddleWare
): T {
  return copyWithMiddleWare(agent, mdw, "decorator");
}

export function copyWithMiddleWare<S, T extends OriginAgent<S>>(
  agent: T & { [agentDependenciesKey]?: AgentDependencies<S, T> },
  mdw: MiddleWare | LifecycleMiddleWare,
  copyType: "copy" | "decorator"
): T {
  let agentCloned: T;

  const invokeDependencies: undefined | AgentDependencies<S, T> =
    agent[agentDependenciesKey];
  if (!invokeDependencies) {
    throw new Error("An agent copy version should create on an agent object.");
  }

  const { entry, store, env, middleWare } = invokeDependencies;

  const reCloneAgentWithNewExpired = () => {
    agentCloned = cloneAgentWithNewExpired();
  };

  const cloneAgentWithNewExpired = () => {
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
    return generateAgent(
      entry,
      store,
      cloneEnvProxy,
      applyMiddleWares(mdw, middleWare),
      {
        sourceAgent: agent,
        type: copyType,
      }
    );
  };

  agentCloned = cloneAgentWithNewExpired();

  return createProxy(agent, {
    set() {
      return false;
    },
    get(target: T, p: string | number): any {
      const source = agentCloned[p];
      if (typeof source === "function") {
        return function replacedCall(...args: any[]) {
          const currentSource = agentCloned[p];
          return currentSource.apply(agentCloned, [...args]);
        };
      }
      return source;
    },
  });
}

export const middleWare = (
  callOrMiddleWare: MiddleWare | MiddleWareAbleFunction,
  mdw?: MiddleWare | MiddleWareAbleFunction
) => {
  if (mdw) {
    (callOrMiddleWare as MiddleWareAbleFunction).middleWare = mdw;
    return callOrMiddleWare as MiddleWareAbleFunction;
  }
  return function <T extends { [key: string]: any }>(target: T, p: string) {
    let call: MiddleWareAbleFunction = target[p];
    call.middleWare = callOrMiddleWare as MiddleWare;
    return call;
  } as MiddleWareAbleFunction;
};
