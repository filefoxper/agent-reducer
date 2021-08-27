import {
    applyMiddleWares,
    createAgentReducer,
    MiddleWares,
} from "../../../src";
import {MiddleWare, NextProcess, OriginAgent, Runtime, StateProcess} from "../../../index";

type State={
    [key:string]:any
}

describe('实现一个数据处理类 MiddleWare',()=>{

    class NoVoidModel implements OriginAgent<State>{

        state={
            title:'no void values'
        };

        setAny(key:string,value?:any):State{
            return {[key]:value};
        }

    }

    it("如果我们通过方法设置了一个 value 为 undefined 的数据，那state中将包含{key:undefined}",()=>{
        // 使用 takeAssignable MiddleWare，
        // 让 return 数据与当前 state 合并起来
        const {agent}=createAgentReducer(NoVoidModel,MiddleWares.takeAssignable());
        agent.setAny('key');
        expect('key' in agent.state).toBe(true);
    });

    it("实现一个自定义 MiddleWare 用来清除值为 undefined 的键值对",()=>{

        const noVoidMiddleWare:MiddleWare=(runtime:Runtime):NextProcess=>{

            function isObject(data: any) {
                return data && Object.prototype.toString.apply(data) === "[object Object]";
            }

            return (nextProcess:StateProcess):StateProcess=>{

                return (result:any)=>{
                    // 从 runtime 的 target 中获取当前state数据
                    const state=runtime.target.state;
                    // 如果当前 state 或 result 不是一个 object，
                    // 则跳过当前 MiddleWare 数据处理过程
                    if(!isObject(result)||!isObject(state)){
                        return nextProcess(result);
                    }
                    const entries=Object.entries(result);
                    // 选取键值非空的键值对组成新的 object 数据
                    const data=[...entries].reduce((r:any,[k,v]:[string,any])=>{
                        return v===undefined||v===null?r:{...r,[k]:v};
                    },{});
                    // 将处理好的数据传递给下一个 MiddleWare 数据处理器
                    return nextProcess(data);
                }

            }

        }

        // 使用 takeAssignable MiddleWare，进行与当前 state 的合并处理，
        // 然后使用自定义 MiddleWare，取出value为空的键值对，
        // 我们把去除value为空的键值对的自定义 MiddleWare 安排在后面，
        // 这样即便当前 state 中已经包含了value为空的键值对，也能在最终位置去掉
        const {agent}=createAgentReducer(NoVoidModel,applyMiddleWares(MiddleWares.takeAssignable(),noVoidMiddleWare));
        agent.setAny('key');
        expect('key' in agent.state).toBe(false);
    });

})