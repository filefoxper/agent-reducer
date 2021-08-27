import {createAgentReducer, middleWare, MiddleWares} from "../../../src";
import {OriginAgent} from "../../../index";

describe('how to use createAgentReducer', () => {

    /**
     * this is a simple count model (OriginAgent)
     */
    class CountAgent implements OriginAgent<number> {
        // it persist a number type state
        state = 0;

        constructor(state?: number) {
            this.state = state || 0;
        }

        // you can write a arrow function method
        // the method returns a changed state
        increase = (): number => this.state + 1;

        // you can write a normal method too
        decrease(): number {
            return this.state - 1;
        }

        walk(increment: boolean): number {
            return increment ? this.increase() : this.decrease();
        }

        // the method params is instead of 'action' in reducer, this is freedom in 'agent-reducer'
        sum(...counts: number[]): number {
            return this.state + counts.reduce((r, c): number => r + c, 0);
        };

        async sumRemoteValue(remoteValue: number) {
            return this.sum(remoteValue);
        }

    }

    it('a basic usage', () => {
        // createAgentReducer has a simple reducer processor inside.
        const {agent} = createAgentReducer(CountAgent);
        agent.increase();
        expect(agent.state).toBe(1);
    });

    it('input params into model by use model constructor', () => {
        // createAgentReducer has a simple reducer processor inside.
        // we can pass a model instance in, if we need some params for model.
        const {agent} = createAgentReducer(new CountAgent(1));
        agent.increase();
        expect(agent.state).toBe(2);
    });

    it('use MiddleWare directly on createAgentReducer', async () => {
        // createAgentReducer has a simple reducer processor inside.
        const {agent} = createAgentReducer(CountAgent, MiddleWares.takePromiseResolve());
        await agent.sumRemoteValue(2);
        expect(agent.state).toBe(2);
    });

    it('use env directly on createAgentReducer', async () => {
        // createAgentReducer has a simple reducer processor inside.
        const {agent} = createAgentReducer(CountAgent, {expired: true});
        await agent.increase();
        expect(agent.state).toBe(1);
    });

    it('use both MiddleWare and env directly on createAgentReducer', async () => {
        // createAgentReducer has a simple reducer processor inside.
        const {agent} = createAgentReducer(CountAgent, MiddleWares.takePromiseResolve(), {strict: false});
        await agent.sumRemoteValue(2);
        expect(agent.state).toBe(2);
    });

});