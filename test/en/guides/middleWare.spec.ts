import {
    applyMiddleWares,
    createAgentReducer,
    MiddleWares,
    NextProcess,
    OriginAgent,
    Runtime,
    StateProcess
} from "../../../src";

type State={
    [key:string]:any
}

describe('write a state processing MiddleWare',()=>{

    class NoVoidModel implements OriginAgent<State>{

        state={
            title:'no void values'
        };

        setAny(key:string,value?:any):State{
            return {[key]:value};
        }

    }

    it("If we put a undefined as param value, state will contain {key:undefined}",()=>{
        // use takeAssignable MiddleWare,
        // make returns assign with current state
        const {agent}=createAgentReducer(NoVoidModel,MiddleWares.takeAssignable());
        agent.setAny('key');
        expect('key' in agent.state).toBe(true);
    });

    it("Write a custom MiddleWare to clean the 'undefined' value item",()=>{

        const noVoidMiddleWare=(runtime:Runtime):NextProcess=>{

            function isObject(data: any) {
                return data && Object.prototype.toString.apply(data) === "[object Object]";
            }

            return (nextProcess:StateProcess):StateProcess=>{

                return (result:any)=>{
                    // get current state from runtime target
                    const state=runtime.target.state;
                    // if current state or result is not an object, pass it to next stateProcess
                    if(!isObject(result)||!isObject(state)){
                        return nextProcess(result);
                    }
                    const entries=Object.entries(result);
                    // pick properties which has a not empty value to a new object
                    const data=[...entries].reduce((r:any,[k,v]:[string,any])=>{
                        return v===undefined||v===null?r:{...r,[k]:v};
                    },{});
                    // pass processed data to next stateProcess
                    return nextProcess(data);
                }

            }

        }

        // use takeAssignable MiddleWare to make returns assign with current state.
        // then use a custom MiddleWare to clear empty key-values.
        // we put the custom one after the takeAssignable MiddleWare.
        // for doing so, even there are empty key-values in current state,
        // it can work well too.
        const {agent}=createAgentReducer(NoVoidModel,applyMiddleWares(MiddleWares.takeAssignable(),noVoidMiddleWare));
        agent.setAny('key');
        expect('key' in agent.state).toBe(false);
    });

})