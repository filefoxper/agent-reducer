import {
    createAgentReducer,
    isAgent,
    OriginAgent,
    Runtime,
    StateProcess
} from "../../../src";
import produce from "immer";

type State={
    name:string
}

describe('support immer.js in agent-reducer',()=>{

    class ImmerModel implements OriginAgent<State>{

        state={name:''};

        changeName(name:string){
            this.state.name=name;
        }

    }

    it("When we call method 'changeName' directly from 'Agent' object, we can get a undefined as next state",()=>{
        const {agent}=createAgentReducer(ImmerModel);
        agent.changeName('name');
        expect(agent.state).toBeUndefined();
    });

    it('Write a immerMiddleWare to make it works with immer.js',()=>{
        // attention：produce function of immer.js api can not process an async function,
        // so we can not use 'immutableMiddleWare' with 'MiddleWares.takePromiseResolve'.
        const immutableMiddleWare = (runtime: Runtime) => {
            const { target, callerName } = runtime;
            // check if target is an Agent object, if not return it.
            if (!isAgent(target)) {
                throw new Error("immutableMiddleWare should work with an agent object");
            }
            // when 'Agent' method is called,
            // we use runtime.mapSourceProperty to change 'OriginAgent' method to be a immer support function temporary.
            runtime.mapSourceProperty(
                callerName,
                (caller: (...args: any[]) => any, instance: any, runtime: Runtime) => {
                    // return a function which wraps 'OriginAgent' method be a immer support function.
                    return function (...args: any[]) {
                        const result = produce(instance.state, (draft: any) => {
                            // use mapSourceProperty again to make 'OriginAgent' state to be a immer draft temporary.
                            // so when we are using this.state, this.state will be a immer draft object.
                            runtime.mapSourceProperty("state", () => draft);
                            // at last do not forget to call the current 'OriginAgent' method.
                            return caller.apply(instance, [...args]);
                        });
                        // after immer has produced, we should rollback what we changed temporary by using mapSourceProperty.
                        runtime.rollback();
                        // do not forget return what we get by using immer.js
                        return result;
                    };
                }
            );
            // after this function end, 'OriginAgent' method will be called.
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