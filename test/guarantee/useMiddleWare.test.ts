import {
    OriginAgent,
    createAgentReducer,
    useMiddleWare,
    LifecycleMiddleWares,
    toLifecycleMiddleWare,
    LifecycleRuntime, StateProcess
} from "../../src";

describe('修补useMiddleWare测试',()=>{

    class CountAgent implements OriginAgent<number>{

        state=0;

        id=2;

        sum = (...counts: number[]): number => {
            return this.state + counts.reduce((r, c): number => r + c, 0);
        };

    }

    test('useMiddleWare产生的复制品的属性值和agent原型值相同',()=>{
        const {agent}=createAgentReducer(CountAgent);
        const copy=useMiddleWare(agent,LifecycleMiddleWares.takeLatest());
        agent.id=3;
        expect(copy.id).toBe(3);
    });

    test('LifecycleEnv中的属性不能赋值修改，否则将得到一个错误信息',()=>{
        const errorMiddleWare = toLifecycleMiddleWare((lifecycleRuntime: LifecycleRuntime) => {
            return (next: StateProcess): StateProcess => {
                return (result: number) => {
                    lifecycleRuntime.env.strict=false;
                    return next(result);
                }
            }
        });
        const {agent}=createAgentReducer(CountAgent);
        const copy=useMiddleWare(agent,errorMiddleWare);
        expect(()=>{
            copy.sum(1);
        });
    });

});