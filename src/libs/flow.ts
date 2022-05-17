import {
  MethodDecoratorCaller,
  Model,
  FlowRuntime,
  LaunchHandler,
  WorkFlow,
  ErrorListener,
} from './global.type';
import { noop, validate } from './util';
import {
  agentActMethodAgentLevelKey,
  agentCallingMiddleWareKey,
  agentFlowForceWorkFlow,
  agentModelFlowMethodKey,
  isAgent,
} from './defines';
import { defaultFlow } from './flows';
import { subscribeError } from './error';
import { copyAgentWithEnv } from './agent';

export default function flow(
  ...flows:WorkFlow[]
):MethodDecoratorCaller {
  const workableActor = flows.length ? applyFlows(...flows, defaultFlow) : noop;
  return function flowDecorator<S=any, T extends Model<S>=Model<S>>(target:T, p:string) {
    validate(typeof (p as unknown) === 'string', 'The `flow` decorator can not use on class');
    const source = target[p];
    const methodMiddleWare = source[agentCallingMiddleWareKey];
    validate(!methodMiddleWare, 'The `flow` decorator can not use with method middleWare');
    source[agentModelFlowMethodKey] = workableActor;
    return source;
  };
}

flow.force = function force<S=any, T extends Model<S>=Model<S>>(target:T, workFlow?:WorkFlow):T {
  if (!isAgent(target) || !target[agentActMethodAgentLevelKey]) {
    validate(false, 'API `flow.force(...)` can only work in an flow method');
    return target;
  }
  if (workFlow && typeof workFlow !== 'function') {
    validate(false, 'The param `workFlow` is not a function or undefined value.');
    return target;
  }
  const [self] = copyAgentWithEnv<S, T>(target);
  self[agentFlowForceWorkFlow] = workFlow || target;
  return self;
};

flow.error = function error<
    S=any,
    T extends Model<S>=Model<S>
    >(model:T, listener:ErrorListener):(()=>void) {
  return subscribeError<S, T>(model, listener);
};

export function applyFlows(...workFlows:WorkFlow[]) {
  return function composedFlow(runtime:FlowRuntime):LaunchHandler {
    const { state } = runtime;
    workFlows.forEach((a, i) => {
      if (!state[i]) {
        state[i] = {};
      }
    });
    const handlers = workFlows.map((wf, i) => {
      const currentRuntime = { ...runtime, state: state[i] } as FlowRuntime;
      return wf(currentRuntime);
    });
    return {
      shouldLaunch() {
        const shouldLaunchCallbacks = handlers.map(({ shouldLaunch }) => {
          if (typeof shouldLaunch === 'function') {
            return shouldLaunch;
          }
          return () => true;
        });
        return shouldLaunchCallbacks.reduce((r:boolean, c:()=>boolean) => {
          if (!r) {
            return r;
          }
          return c();
        }, true);
      },
      shouldUpdate() {
        const shouldUpdateCallbacks = handlers.map(({ shouldUpdate }) => {
          if (typeof shouldUpdate === 'function') {
            return shouldUpdate;
          }
          return () => true;
        });
        return shouldUpdateCallbacks.reduce((r:boolean, c:()=>boolean) => {
          if (!r) {
            return r;
          }
          return c();
        }, true);
      },
      didLaunch(result:any) {
        const didLaunchCallbacks = handlers.map(({ didLaunch }) => didLaunch);
        return didLaunchCallbacks.reduce((r, c) => {
          if (typeof c === 'function') {
            return c(r);
          }
          return r;
        }, result);
      },
      invoke(method:(...args:any[])=>any) {
        const invokes = handlers.map(({ invoke }) => invoke);
        return [...invokes].reverse().reduce((r, c) => {
          if (c == null) {
            return r;
          }
          return c(r);
        }, method);
      },
    };
  };
}
