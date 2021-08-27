import {
    createAgentReducer,
    isAgent,
} from "../../../src";
import produce from "immer";
import {MiddleWare, OriginAgent, Runtime, StateProcess} from "../../../index";

type State={
    name:string
}

describe('让agent-reducer支持immer.js',()=>{

    class ImmerModel implements OriginAgent<State>{

        state={name:''};

        changeName(name:string){
            this.state.name=name;
        }

    }

    it("当我们直接调用 changeName 方法时，我们的 state 将变成 undefined，因为我们什么都没有 return",()=>{
        const {agent}=createAgentReducer(ImmerModel);
        agent.changeName('name');
        expect(agent.state).toBeUndefined();
    });

    it('我们可以制造一个MiddleWare来支持 immer.js',()=>{
        // 注意：immer.js API 中的 produce function 不能作用与一个异步方法，
        // 所以我们不能让我们的 'immutableMiddleWare' 和
        // 'MiddleWares.takePromiseResolve'一起工作了。
        const immutableMiddleWare:MiddleWare = (runtime: Runtime) => {
            const { target, callerName } = runtime;
            // 检查调用者是否是一个 'Agent' 对象
            if (!isAgent(target)) {
                throw new Error("immutableMiddleWare should work with an agent object");
            }
            // 当 'Agent' 方法被调用时，
            // 我们可以通过 runtime.mapSourceProperty 修改模型 'OriginAgent' 方法，
            // 来暂时性的支持 immer。
            runtime.mapSourceProperty(
                callerName,
                // caller 为需要被修改的源值，
                // instance 为模型对象，
                // runtime 为方法运行参数
                (caller: (...args: any[]) => any, instance: any, runtime: Runtime) => {
                    // 返回一个新 function 来代替模型 'OriginAgent' 的方法
                    return function (...args: any[]) {
                        // 使用 immer 的 produce
                        const result = produce(instance.state, (draft: any) => {
                            // 在 produce 回调开始时，
                            // 修改模型 'OriginAgent' 的 state 为 produce 生成的 draft 对象
                            runtime.mapSourceProperty("state", () => draft);
                            // 调用源方法，这时源方法中的 this.state 已经被替换成了 draft
                            return caller.apply(instance, [...args]);
                        });
                        // 方法运行结束时，需要通过 runtime.rollback 回滚被修改的模型数据，
                        // 当前方法及state
                        runtime.rollback();
                        // 最后把结果返回出去就行了
                        return result;
                    };
                }
            );
            // 在完成了对源方法的零时替换后，就开始运行零时替换方法了。
            return (next: StateProcess) => {
                return (result: any) => {
                    return next(result);
                };
            };
        };
        const { agent } = createAgentReducer(
            ImmerModel,immutableMiddleWare
        );
        agent.changeName("name");
        expect(agent.state.name).toBe("name");
    });

})