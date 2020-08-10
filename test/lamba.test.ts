import {branch, BranchResolvers, createAgentReducer, OriginAgent} from "../src";

class Counter implements OriginAgent<number> {

    state = 0;

    constructor(state: number) {
        this.state = state;
    }

    addOne() {
        return this.state + 1;
    }

    addOneFrom=(state: number)=> {
        return state + 1;
    };

    addTwice=()=> {
        this.addOne();
        this.addOneFrom(3);
    }

}

describe('agent test', () => {

    test('agent use =>',()=>{
        const agent = createAgentReducer(new Counter(0)).agent;
        agent.addTwice();
        expect(agent.state).toBe(4);
    });

    test('agent use branch take lazy',()=>{
        const agent = createAgentReducer(new Counter(0)).agent;
        const {addOne}=branch(agent,BranchResolvers.takeLazy(200));
        addOne();
        setTimeout(()=>addOne(),100);
        setTimeout(()=>addOne(),150);
        setTimeout(()=>expect(agent.state).toBe(1),370);
    });

});