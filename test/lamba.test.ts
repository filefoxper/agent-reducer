import {createAgentReducer, OriginAgent} from "../src";

class Counter implements OriginAgent<number> {

    state = 0;

    constructor(state: number) {
        this.state = state;
    }

    private addOne() {
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

});