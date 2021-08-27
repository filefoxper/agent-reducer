import {createAgentReducer, MiddleActions, middleWare, MiddleWares, useMiddleActions} from "../../../src";
import {isPromise} from "../../../src/libs/util";
import {OriginAgent} from "../../../index";

describe('how to use MiddleActions', () => {

    class CountAgent implements OriginAgent<number> {

        state = 0;

        increase = (): number => this.state + 1;

        decrease(): number {
            return this.state - 1;
        }

        walk(increment: boolean): number {
            return increment ? this.increase() : this.decrease();
        }

        async sumWithRemoteValue(remoteValue: number): Promise<number> {
            return this.state + remoteValue;
        };
    }

    // a helper class for using Agent object
    class CountMiddleActions extends MiddleActions<CountAgent> {

        // method control MiddleWare can work well
        @middleWare(MiddleWares.takeDebounce(200))
        increaseDebounce() {
            this.agent.increase();
        }

        // state processing MiddleWare can not work with MiddleActions
        @middleWare(MiddleWares.takePromiseResolve())
        sumWithRemoteValue() {
            return this.agent.sumWithRemoteValue(1);
        }

    }

    it('method control MiddleWare can work well', async () => {
        const {agent} = createAgentReducer(CountAgent);
        const {increaseDebounce} = useMiddleActions(CountMiddleActions, agent);
        increaseDebounce();
        increaseDebounce();
        await new Promise((r)=>setTimeout(r,210));
        expect(agent.state).toBe(1);
    });

    it('state processing MiddleWare can not work with MiddleActions', async () => {
        const {agent} = createAgentReducer(CountAgent);
        const {sumWithRemoteValue} = useMiddleActions(CountMiddleActions, agent);
        await sumWithRemoteValue();
        // state processing MiddleWare can not work with MiddleActions,
        // so next state will be a Promise object
        expect(isPromise(agent.state)).toBe(true);
    });

});