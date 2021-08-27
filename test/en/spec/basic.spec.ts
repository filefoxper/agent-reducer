import {createAgentReducer} from "../../../src";
import {OriginAgent} from "../../../index";

describe("try the basic usage about agent-reducer", () => {
    /**
     * this is a simple counter
     */
    class CountAgent implements OriginAgent<number> {
        // it persist a number type state
        state = 0;

        // you can write a arrow function method
        // the method returns a changed state
        increase = (): number => this.state + 1;

        // you can write a normal method too
        decrease(): number {
            return this.state - 1;
        }

        // only the method get from 'agent' directly can change state,
        // so when you are using method 'walk',
        // the only change about state is from method 'walk',
        // and no more state changes will happen.
        walk(increment: boolean): number {
            return increment ? this.increase() : this.decrease();
        }

        // the method params is instead of 'action' in reducer, this is freedom in 'agent-reducer'
        sum = (...counts: number[]): number => {
            return this.state + counts.reduce((r, c): number => r + c, 0);
        };
    }

    it("when we call method 'increase' from 'agent', the agent.state should be 1", () => {
        const {agent} = createAgentReducer(CountAgent);
        // call method from 'agent' can change state by what the method returns
        agent.increase();
        expect(agent.state).toBe(1);
    });

    it("when we call a method from 'agent', the agent.state only change once", () => {
        const {agent, recordChanges} = createAgentReducer(CountAgent);
        // use recordChanges in unit test will generate an unRecord function,
        // and agent-reducer is starting record state changes.
        const unRecord = recordChanges();
        // call method from 'agent' can change state by what the method returns
        agent.walk(false);
        // call the unRecord function generated from recordChanges,
        // will stop recording, and get state change records.
        const records=unRecord();
        expect(records.length).toBe(1)
        expect(agent.state).toBe(-1);
    });

    it('when we call a method, we can pass params much more free than reducer action',()=>{
        const {agent} = createAgentReducer(CountAgent);
        agent.sum(1,2,3);
        expect(agent.state).toBe(6);
    });

});