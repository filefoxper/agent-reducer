import {
  Env,
  MiddleWare,
  Runtime,
  OriginAgent,
  LifecycleMiddleWare,
  LifecycleEnv,
  Action,
  Store,
  SharingMiddleWareMethods,
  MethodCaller,
} from './global.type';
import {
  agentCallingEffectTargetKey,
  agentCallingMiddleWareKey,
  agentDependenciesKey,
  agentIdentifyKey, agentMethodName,
  agentSharingMiddleWareKey,
} from './defines';
import { createProxy, validate } from './util';
import { AgentDependencies } from './agent.type';

import { applyMiddleWares, defaultMiddleWare } from './applies';

/**
 *  use dependencies to create a dispatch callback
 * @param invokeDependencies
 * @param proxy
 */
function generateDispatchCall<S, T extends OriginAgent<S>>(
  invokeDependencies: AgentDependencies<S, T>,
  proxy:T,
) {
  const { store, env } = invokeDependencies;
  return ({ type, state }: Action) => {
    if ((!proxy[agentDependenciesKey]) && env.expired) {
      return;
    }
    store.dispatch({ type, state });
  };
}

/**
 * create a final state process callback,
 * which is used for dispatching the result to store
 * @param methodName
 * @param invokeDependencies
 * @param proxy
 */
function createDispatchStateProcess<S, T extends OriginAgent<S>>(
  methodName: string,
  invokeDependencies: AgentDependencies<S, T>,
  proxy:T,
) {
  const dispatchCall = generateDispatchCall(invokeDependencies, proxy);
  return function finalStateProcess<NS = S>(nextState: NS): NS {
    dispatchCall({ type: methodName, state: nextState });
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
    methodName,
    agent: proxy,
    model: entry,
    env: invokeDependencies.env,
    cache: {},
    mappedModel: null,
    mapModel(handler:ProxyHandler<T>) {
      this.mappedModel = createProxy(entry, handler);
      return this.mappedModel;
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
  const dispatchStateProcess = createDispatchStateProcess(methodName, invokeDependencies, proxy);

  const {
    cache, functionCache, entry,
  } = invokeDependencies;
  const modelMethod = entry[methodName] as ((...a: any[]) => any);
  // cache runtime by methodName
  cache[methodName] = cache[methodName] || createRuntime(proxy, invokeDependencies, methodName);
  // cache wrapped method by methodName
  const cacheCaller = functionCache[methodName];
  if (typeof cacheCaller === 'function') {
    return cacheCaller;
  }
  // wrapped method
  const sourceMethodDescriptors = Object.getOwnPropertyDescriptors(modelMethod);
  const caller:MethodCaller<T> = function caller(...args: any[]):any {
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
      return undefined;
    }
    // if middleWare wrapped current method by runtime.mapSourceProperty,
    // the current method should be the wrapped method,
    // and runtime stores it in tempCaller property
    const { mappedModel } = runtime;
    try {
      const nextState = mappedModel !== null
        ? modelMethod.apply(mappedModel, [...args])
        : modelMethod.apply(entry, [...args]);
      const stateProcess = nextProcess(dispatchStateProcess);
      // pass nextState returned by current method to middleWare stateProcess,
      // middleWare use stateProcess to reproduce state,
      // and use dispatchStateProcess to dispatch the final state
      const result = stateProcess(nextState);
      runtime.mappedModel = null;
      return result;
    } catch (e) {
      runtime.mappedModel = null;
      throw e;
    }
  };

  Object.defineProperties(caller, { ...sourceMethodDescriptors });
  // cache method
  functionCache[methodName] = caller;

  return caller;
}

// generate the function about how to reproduce a method
function methodProducer<S, T extends OriginAgent<S>>(
  invokeDependencies: AgentDependencies<S, T>,
  copyInfo?: {
      sourceAgent: T;
      type: 'copy' | 'decorator';
    },
) {
  const { middleWare, entry } = invokeDependencies;
  // for storing the method from a decorator middleWare copy agent
  if (!entry[agentSharingMiddleWareKey]) {
    entry[agentSharingMiddleWareKey] = {};
  }
  const methodWithMiddleWares: SharingMiddleWareMethods = entry[agentSharingMiddleWareKey] || {};
  const { type: copyType, sourceAgent } = copyInfo || {};
  return function produceMethod(target: T, property: string, receiver:T) {
    const p = property as keyof T;
    const source = target[p];
    // if the decorator methods cache has current method name,
    // fetch it out directly from the cache
    if (methodWithMiddleWares[property] && (copyType === undefined
        || (copyType === 'copy' && middleWare === defaultMiddleWare))) {
      return methodWithMiddleWares[property];
    }
    // if the method has property middleWare,
    // and the current agent is not a copy one,
    // use decorator copy current agent,
    // and use the method from this copied agent,
    // then cache this copy method
    if (
      source[agentCallingMiddleWareKey]
        && (copyType === undefined
        || (copyType === 'copy' && middleWare === defaultMiddleWare))
    ) {
      const methodWithMiddleWare = decorateWithMiddleWare<S, T>(
        sourceAgent || receiver,
        source[agentCallingMiddleWareKey],
      )[p];
      methodWithMiddleWares[property] = methodWithMiddleWare;
      return methodWithMiddleWare;
    }
    // create a wrapped method to invoke the source method
    return createActionRunner(receiver, invokeDependencies, p as string);
  };
}

function createAgentDependencies<S, T extends OriginAgent<S>>(
  entry: T,
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
  entry: T,
  store: Store<S>,
  env: Env,
  middleWare: MiddleWare,
  copyInfo?: {
      sourceAgent: T;
      type: 'copy' | 'decorator';
    },
): T {
  const invokeDependencies: AgentDependencies<S, T> = createAgentDependencies<S, T>(
    entry,
    store,
    env,
    middleWare,
  );

  const agentParams = {
    invokeDependencies: undefined,
    isAgent: true,
  };

  const produceMethod = methodProducer<S, T>(invokeDependencies, copyInfo);

  const proxy: T = createProxy(entry, {
    get(target: T, p: string & keyof T): any {
      const source = target[p];
      if (typeof source === 'function' && source[agentCallingEffectTargetKey]) {
        validate(false, 'The effect method can not be used as an action method');
      }
      if (typeof source === 'function') {
        const method = produceMethod(target, p, proxy);
        method[agentMethodName] = p;
        return method;
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
        agentParams.isAgent = value;
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
        return expired;
      }
      return source;
    },
  });
}

function createLifecycleAgentBuilder<S, T extends OriginAgent<S>>(
  agent: T,
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
  agent: T,
  mdw: MiddleWare | LifecycleMiddleWare,
  copyType: 'copy' | 'decorator',
): T {
  const buildAgent = createLifecycleAgentBuilder<S, T>(agent, mdw, copyType);

  let agentCloned:T;

  const cloneAgentWithNewExpired = () => buildAgent(() => {
    agentCloned = cloneAgentWithNewExpired();
  });

  agentCloned = cloneAgentWithNewExpired();

  return createProxy(agent, {
    set() {
      return false;
    },
    get(target: T, p: string): any {
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
  agent: T,
  mdw: MiddleWare | LifecycleMiddleWare,
): T {
  return copyWithMiddleWare<S, T>(agent, mdw, 'decorator');
}
