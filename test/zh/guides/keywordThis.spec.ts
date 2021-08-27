import {createAgentReducer} from "../../../src";
import {OriginAgent} from "../../../index";

describe('关键词this在Agent方法调用时是安全的', () => {

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

    it("我们可以将'Agent'方法提取成变量，并调用这个变量function", () => {
        const {agent}=createAgentReducer(CountAgent);
        const {walk}=agent;
        walk(true);
        expect(agent.state).toBe(1);
    });

    it("我们可以将'Agent'方法赋值给其他对象，并通过其他对象调用该方法", () => {
        const {agent}=createAgentReducer(CountAgent);
        const {walk}=agent;
        const proxy={state:null,walk};
        proxy.walk(true);
        expect(agent.state).toBe(1);
    });

    it("我们甚至可以将'Agent'方法绑定在其他对象上进行调用", () => {
        const {agent}=createAgentReducer(CountAgent);
        const {walk}=agent;
        const proxy={state:null};
        walk.bind(proxy)(true);
        expect(agent.state).toBe(1);
    });

});