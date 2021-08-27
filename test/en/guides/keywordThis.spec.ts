import {createAgentReducer} from "../../../src";
import {OriginAgent} from "../../../index";

describe('keyword this in Agent object is safe', () => {

    class CountAgent implements OriginAgent<number> {

        state = 0;

        increase = (): number => this.state + 1;

        decrease(): number {
            return this.state - 1;
        }

        walk(increment: boolean): number {
            return increment ? this.increase() : this.decrease();
        }

        sum(...counts: number[]): number {
            return this.state + counts.reduce((r, c): number => r + c, 0);
        };
    }

    it("we can pick a method of 'Agent' object out as a variable, and call the variable function", () => {
        const {agent}=createAgentReducer(CountAgent);
        const {walk}=agent;
        walk(true);
        expect(agent.state).toBe(1);
    });

    it("we can assign a method of 'Agent' object to another object, and call it as another object method", () => {
        const {agent}=createAgentReducer(CountAgent);
        const {walk}=agent;
        const proxy={state:null,walk};
        proxy.walk(true);
        expect(agent.state).toBe(1);
    });

    it("we can bind a method of 'Agent' object to another object, and call it as another object method", () => {
        const {agent}=createAgentReducer(CountAgent);
        const {walk}=agent;
        const proxy={state:null};
        walk.bind(proxy)(true);
        expect(agent.state).toBe(1);
    });

});