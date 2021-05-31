import { Action, Store } from './reducer.type';
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
 *  use dependencies to create a dispatch callback
 * @param invokeDependencies
 */
function generateDispatchCall<S, T extends OriginAgent<S>>(
  invokeDependencies: AgentDependencies<S, T>,
) {
  const { entry, store, env } = invokeDependencies;
  const namespace = entry[agentNamespaceKey];
  return ({ type, args }: Action) => {
    // if this agent is expired, do nothing
    if (env.expired) {
      return;
    }
    // if agent has a namespace, dispatch `${namespace}:${type}` as the type
    const newType = namespace === undefined ? type : `${namespace}:${type}`;
    // if env.strict is false, the state will be changed immediately
    if (!env.strict) {
      entry.state = args;
    }
    store.dispatch({ type: newType, args });
  };
}

/**
 * create a final state process callback,
 * which is used for dispatching the result to store
 * @param methodName
 * @param invokeDependencies
 */
function createDispatchStateProcess<S, T extends OriginAgent<S>>(
  methodName: string,
  invokeDependencies: AgentDependencies<S, T>,
) {
  const dispatchCall = generateDispatchCall(invokeDependencies);
  return function finalStateProcess<NS = S>(nextState: NS): NS {
    dispatchCall({ type: methodName, args: nextState });
    return nextState;
  };
}

function createRuntime<S, T extends OriginAgent<S>>(
  proxy: T,
  invokeDependencies: AgentDependencies<S, T>,
  methodName: string,
):Omit<Runtime<T>, 'caller'> {
  const {
    entry,
  } = invokeDependencies;
  return {
    callerName: methodName,
    sourceCaller: entry[methodName] as (...args: any[]) => any,
    target: proxy,
    source: entry,
    env: invokeDependencies.env,
    cache: {},
    rollbacks: {},
    tempCaller: undefined,
    mapSourceProperty(
      key: keyof T,
      callback: (value: any, instance: T, runtime: Runtime<T>) => any,
    ) {
      const current = entry[key];
      const newValue = callback(current, entry, this as Runtime<T>);
      if (methodName === key) {
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
  } as Omit<Runtime<T>, 'caller'>;
}

/**
 * transform normal method to be a wrapped method with middleWare features
 * @param proxy agent
 * @param invokeDependencies agent running dependencies
 * @param methodName method name
 */
function createActionRunner<S, T extends OriginAgent<S>>(
  proxy: T,
  invokeDependencies: AgentDependencies<S, T>,
  methodName: string,
) {
  // create final stateProcess
  const dispatchStateProcess = createDispatchStateProcess(methodName, invokeDependencies);

  const {
    cache, functionCache, entry,
  } = invokeDependencies;
  // cache runtime by methodName
  cache[methodName] = cache[methodName] || createRuntime(proxy, invokeDependencies, methodName);
  // cache wrapped method by methodName
  if (functionCache[methodName]) {
    return functionCache[methodName];
  }
  // wrapped method
  function caller(...args: any[]):any {
    const { env, middleWare } = invokeDependencies;
    const runtime = cache[methodName];
    if (!runtime) {
      return undefined;
    }
    // assign current running arguments and env to runtime
    runtime.args = [...args];
    runtime.env = env;
    // call middleWare with runtime, and generate a nextProcess callback,
    // this nextProcess callback is used for passing the final dispatchStateProcess callback in,
    // so middleWare can decide when and how to dispatch the final state.
    const nextProcess = middleWare(runtime);
    // if nextProcess is undefined, stop running the source method
    if (!nextProcess) {
      runtime.tempCaller = undefined;
      return undefined;
    }
    // if middleWare wrapped current method by runtime.mapSourceProperty,
    // the current method should be the wrapped method,
    // and runtime stores it in tempCaller property
    const sourceCaller = runtime.tempCaller || runtime.sourceCaller;
    // compatible with >=agent-reducer@1.0.0
    // TODO remove this compat when agent-reducer@4.0.0 is prepared
    try {
      const nextState = env.legacy
        ? sourceCaller.apply(proxy, [...args])
        : sourceCaller.apply(entry, [...args]);

      const stateProcess = nextProcess(dispatchStateProcess);
      // pass nextState returned by current method to middleWare stateProcess,
      // middleWare use stateProcess to reproduce state,
      // and use dispatchStateProcess to dispatch the final state,
      // TODO returns the reproduced state as a result is not a good idea,
      // TODO change it to return nextState directly when agent@4.0.0 is prepared
      const result = stateProcess(nextState);
      // after running, clear runtime.tempCaller
      runtime.tempCaller = undefined;
      return result;
    } catch (e) {
      // after running, clear runtime.tempCaller
      runtime.tempCaller = undefined;
      throw e;
    }
  }

  // assign wrapped method to runtime caller property
  cache[methodName].caller = caller;
  // cache method
  functionCache[methodName] = caller;

  return caller;
}

// generate the function about how to reproduce a method
function methodProducer<S, T extends OriginAgent<S>>(
  invokeDependencies: AgentDependencies<S, T>,
  copyInfo?: {
      sourceAgent: T & { [agentDependenciesKey]?: AgentDependencies<S, T> };
      type: 'copy' | 'decorator';
    },
) {
  const { middleWare } = invokeDependencies;
  // for storing the method from a decorator middleWare copy agent
  const methodWithMiddleWares: { [key in keyof T]?: any } = {};
  const { type: copyType, sourceAgent } = copyInfo || {};
  return function produceMethod(target: T, property: string, receiver:T) {
    const p = property as keyof T;
    const source = target[p];
    // if the decorator methods cache has current method name,
    // fetch it out directly from the cache
    if (methodWithMiddleWares[p]) {
      return methodWithMiddleWares[p];
    }
    // if the method has property middleWare,
    // and the current agent is not a copy one,
    // use decorator copy current agent,
    // and use the method from this copied agent,
    // then cache this copy method
    if (
      source.middleWare
        && (copyType === undefined
        || (copyType === 'copy' && middleWare === defaultMiddleWare))
    ) {
      const methodWithMiddleWare = decorateWithMiddleWare(
        sourceAgent || receiver,
        source.middleWare,
      )[p];
      methodWithMiddleWares[p] = methodWithMiddleWare;
      return methodWithMiddleWare;
    }
    // create a wrapped method to invoke the source method
    return createActionRunner(receiver, invokeDependencies, p as string);
  };
}

function createAgentDependencies<S, T extends OriginAgent<S>>(
  entry: T & { [agentDependenciesKey]?: AgentDependencies<S, T> },
  store: Store<S>,
  env: Env,
  middleWare: MiddleWare,
):AgentDependencies<S, T> {
  return {
    entry,
    store,
    env,
    cache: {},
    functionCache: {},
    middleWare,
  };
}

/**
 *  create a agent object from entry
 * @param entry
 * @param store
 * @param env
 * @param middleWare
 * @param copyInfo
 */
export function generateAgent<S, T extends OriginAgent<S>>(
  entry: T & { [agentDependenciesKey]?: AgentDependencies<S, T> },
  store: Store<S>,
  env: Env,
  middleWare: MiddleWare,
  copyInfo?: {
      sourceAgent: T & { [agentDependenciesKey]?: AgentDependencies<S, T> };
      type: 'copy' | 'decorator';
    },
): T {
  const invokeDependencies: AgentDependencies<S, T> = createAgentDependencies(
    entry,
    store,
    env,
    middleWare,
  );

  const agentParams = {
    invokeDependencies: undefined,
    isAgent: true,
  };

  const produceMethod = methodProducer(invokeDependencies, copyInfo);

  const proxy: T & {
    [agentDependenciesKey]?: AgentDependencies<S, T>;
    [agentIdentifyKey]?: true;
  } = createProxy(entry, {
    get(target: T, p: string & keyof T): any {
      const source = target[p];
      if (typeof source === 'function') {
        return produceMethod(target, p, proxy);
      }
      if (p === agentIdentifyKey) {
        return agentParams.isAgent;
      }
      if (p === agentDependenciesKey) {
        return agentParams.invokeDependencies;
      }
      return entry[p];
    },
    set(target: T, p: string & keyof T, value: any): boolean {
      const source = entry[p];
      if (typeof source === 'function') {
        return false;
      }
      if (p === agentDependenciesKey) {
        agentParams.invokeDependencies = value;
      } else if (p === agentIdentifyKey) {
        agentParams.isAgent = true;
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

function createLifecycleEnv(env:Env, rebuild:()=>any):Env {
  let expired = false;
  const cloneEnv: LifecycleEnv = {
    ...env,
    expire: () => {
      expired = true;
    },
    rebuild: () => {
      expired = true;
      rebuild();
    },
  };
  return createProxy(cloneEnv, {
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
}

function createLifecycleAgentBuilder<S, T extends OriginAgent<S>>(
  agent: T & { [agentDependenciesKey]?: AgentDependencies<S, T> },
  mdw: MiddleWare | LifecycleMiddleWare,
  copyType: 'copy' | 'decorator',
) {
  return function build(rebuild:()=>any) {
    const invokeDependencies: undefined | AgentDependencies<S, T> = agent[agentDependenciesKey];
    if (!invokeDependencies) {
      throw new Error('An agent copy version should be created on an agent object.');
    }

    const {
      entry, store, env,
    } = invokeDependencies;

    const cloneEnvProxy = createLifecycleEnv(env, rebuild);
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
}

export function copyWithMiddleWare<S, T extends OriginAgent<S>>(
  agent: T & { [agentDependenciesKey]?: AgentDependencies<S, T> },
  mdw: MiddleWare | LifecycleMiddleWare,
  copyType: 'copy' | 'decorator',
): T {
  const buildAgent = createLifecycleAgentBuilder(agent, mdw, copyType);

  let agentCloned:T;

  const cloneAgentWithNewExpired = () => buildAgent(() => {
    agentCloned = cloneAgentWithNewExpired();
  });

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
