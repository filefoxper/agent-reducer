import { Action, StoreSlot } from './reducer.type';
import {
  Env, MiddleWare, Runtime, OriginAgent, LifecycleMiddleWare, LifecycleEnv,
} from './global.type';
import {
  agentDependenciesKey,
  agentIdentifyKey,
  agentNamespaceKey,
} from './defines';
import { createProxy } from './util';
import { AgentDependencies } from './agent.type';

import { applyMiddleWares, defaultMiddleWare } from './applies';

/**
 *
 * @param invokeDependencies
 */
function generateDispatchCall<S, T extends OriginAgent<S>>(
  invokeDependencies: AgentDependencies<S, T>,
) {
  const { entry, store, env } = invokeDependencies;
  const namespace = entry[agentNamespaceKey];
  return ({ type, args }: Action) => {
    if (env.expired) {
      return args;
    }
    const newType = namespace === undefined ? type : `${namespace}:${type}`;
    const nextState = args;
    if (nextState !== undefined && !env.strict) {
      entry.state = nextState;
    }
    return store.dispatch({ type: newType, args });
  };
}

function createActionRunner<S, T extends OriginAgent<S>>(
  proxy: T,
  invokeDependencies: AgentDependencies<S, T>,
  type: string,
  source: (...args: any[]) => any,
) {
  const dispatchCall = generateDispatchCall(invokeDependencies);

  const defaultStateResolver = <NS = S>(nextState: NS): NS => {
    dispatchCall({ type, args: nextState });
    return nextState;
  };

  const {
    cache, functionCache, entry,
  } = invokeDependencies;

  cache[type] = cache[type] || {};

  if (functionCache[type]) {
    return functionCache[type];
  }

  function caller(...args: any[]):any {
    const { env, middleWare } = invokeDependencies;
    const runtime = cache[type];
    if (!runtime) {
      return undefined;
    }
    runtime.args = [...args];
    runtime.env = env;
    const nextProcess = middleWare(runtime);

    if (!nextProcess) {
      runtime.tempCaller = undefined;
      return undefined;
    }

    const sourceCaller = runtime.tempCaller || runtime.sourceCaller;
    // 支持1.+.+版本
    try {
      const nextState = env.legacy
        ? sourceCaller.apply(proxy, [...args])
        : sourceCaller.apply(entry, [...args]);

      const stateProcess = nextProcess(defaultStateResolver);
      const result = stateProcess(nextState);
      runtime.tempCaller = undefined;
      return result;
    } catch (e) {
      runtime.tempCaller = undefined;
      throw e;
    }
  }

  cache[type] = {
    caller,
    callerName: type,
    sourceCaller: source as (...args: any[]) => any,
    target: proxy,
    source: entry,
    env: invokeDependencies.env,
    cache: {},
    rollbacks: {},
    mapSourceProperty(
      key: keyof T,
      callback: (value: any, instance: T, runtime: Runtime<T>) => any,
    ) {
      const current = entry[key];
      const newValue = callback(current, entry, this);
      if (type === key) {
        this.tempCaller = newValue;
      } else {
        entry[key] = newValue;
        this.rollbacks[key] = current;
      }
      return this;
    },
    rollback() {
      Object.assign(entry, this.rollbacks);
      this.rollbacks = {};
      this.tempCaller = undefined;
      return this;
    },
  } as Runtime<T>;

  functionCache[type] = caller;

  return caller;
}

export function generateAgent<S, T extends OriginAgent<S>>(
  entry: T & { [agentDependenciesKey]?: AgentDependencies<S, T> },
  store: StoreSlot<S>,
  env: Env,
  middleWare: MiddleWare,
  copyInfo?: {
      sourceAgent: T & { [agentDependenciesKey]?: AgentDependencies<S, T> };
      type: 'copy' | 'decorator';
    },
): T {
  const invokeDependencies: AgentDependencies<S, T> = {
    entry,
    store,
    env,
    cache: {},
    functionCache: {},
    middleWare,
  };

  const methodWithMiddleWares: { [key in keyof T]?: any } = {};

  const cache = {
    methodWithMiddleWares,
    invokeDependencies: undefined,
    isAgent: true,
  };

  const { type: copyType, sourceAgent } = copyInfo || {};

  const proxy: T & {
    [agentDependenciesKey]?: AgentDependencies<S, T>;
    [agentIdentifyKey]?: true;
  } = createProxy(entry, {
    get(target: T, p: string & keyof T): any {
      const source = target[p];
      if (typeof source === 'function' && methodWithMiddleWares[p]) {
        return methodWithMiddleWares[p];
      }
      if (
        typeof source === 'function'
          && source.middleWare
          && (copyType === undefined
          || (copyType === 'copy' && middleWare === defaultMiddleWare))
      ) {
        const methodWithMiddleWare = decorateWithMiddleWare(
          sourceAgent || proxy,
          source.middleWare,
        )[p];
        methodWithMiddleWares[p] = methodWithMiddleWare;
        return methodWithMiddleWare;
      }

      if (typeof source === 'function') {
        return createActionRunner(proxy, invokeDependencies, p, source);
      }
      if (p === agentIdentifyKey) {
        return cache.isAgent;
      }
      if (p === agentDependenciesKey) {
        return cache.invokeDependencies;
      }
      return entry[p];
    },
    set(target: T, p: string & keyof T, value: any): boolean {
      const source = entry[p];
      if (typeof source === 'function') {
        return false;
      }
      if (p === agentDependenciesKey) {
        cache.invokeDependencies = value;
      } else if (p === agentIdentifyKey) {
        cache.isAgent = true;
      } else {
        entry[p] = value;
      }
      return true;
    },
  });
  proxy[agentIdentifyKey] = true;
  if (copyInfo) {
    proxy[agentDependenciesKey] = undefined;
    return proxy as T;
  }
  proxy[agentDependenciesKey] = invokeDependencies;
  return proxy as T;
}

export function copyWithMiddleWare<S, T extends OriginAgent<S>>(
  agent: T & { [agentDependenciesKey]?: AgentDependencies<S, T> },
  mdw: MiddleWare | LifecycleMiddleWare,
  copyType: 'copy' | 'decorator',
): T {
  let agentCloned: T;

  const invokeDependencies: undefined | AgentDependencies<S, T> = agent[agentDependenciesKey];
  if (!invokeDependencies) {
    throw new Error('An agent copy version should create on an agent object.');
  }

  const {
    entry, store, env, middleWare,
  } = invokeDependencies;

  const cloneAgentWithNewExpired = () => {
    let expired = false;
    const cloneEnv: LifecycleEnv = {
      ...env,
      expire: () => {
        expired = true;
      },
      rebuild: () => {
        expired = true;
        agentCloned = cloneAgentWithNewExpired();
      },
    };
    const cloneEnvProxy = createProxy(cloneEnv, {
      set() {
        return false;
      },
      get(target: Env, property: keyof Env) {
        const source = target[property];
        if (property === 'expired') {
          return env.expired || expired;
        }
        return source;
      },
    });
    return generateAgent(
      entry,
      store,
      cloneEnvProxy,
      applyMiddleWares(mdw),
      {
        sourceAgent: agent,
        type: copyType,
      },
    );
  };

  agentCloned = cloneAgentWithNewExpired();

  return createProxy(agent, {
    set() {
      return false;
    },
    get(target: T, p: string | number): any {
      const source = agentCloned[p];
      if (typeof source === 'function') {
        return function replacedCall(...args: any[]) {
          const currentSource = agentCloned[p];
          return currentSource.apply(agentCloned, [...args]);
        };
      }
      return source;
    },
  });
}

function decorateWithMiddleWare<S, T extends OriginAgent<S>>(
  agent: T & { [agentDependenciesKey]?: AgentDependencies<S, T> },
  mdw: MiddleWare | LifecycleMiddleWare,
): T {
  return copyWithMiddleWare(agent, mdw, 'decorator');
}
