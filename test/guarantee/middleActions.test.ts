import {
    createAgentReducer,
    LifecycleMiddleWares,
    MiddleActions,
    middleWare,
    OriginAgent,
    useMiddleActions
} from "../../src";

describe('修补middleActions测试',()=>{

    class CountAgent implements OriginAgent<number> {

        state = 0;

        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        sum = (...counts: number[]): number => {
            return this.state + counts.reduce((r, c): number => r + c, 0);
        };

        @middleWare(LifecycleMiddleWares.takeLatest())
        async callingStepUpAfterRequest(tms: number) {
            await new Promise((r) => setTimeout(r, tms * 100));
            return this.sum(tms);
        }

    }

    class CountBesides extends MiddleActions<CountAgent> {

        id=1;

        @middleWare(LifecycleMiddleWares.takeLatest())
        async callingStepUpAfterRequest(tms: number) {
            await new Promise((r) => setTimeout(r, tms * 100));
            return this.agent.sum(tms);
        }

    }

    test('middle-action一旦获取过，以后将从获取缓存中读取',()=>{
        const {agent} = createAgentReducer(CountAgent);
        const actions = useMiddleActions(agent, CountBesides);
        expect(actions.callingStepUpAfterRequest).toBe(actions.callingStepUpAfterRequest);
        expect(actions.agent).toBe(agent);
    });

});