import {Model} from "../../src/libs/global.type";
import {create, getSharingType, weakSharing,sharing} from "../../src";

class CountModel implements Model<number>{

    state:number

    constructor(state:number) {
        this.state = state;
    }

    increase(){
        return this.state+1;
    }

}

describe('guard sharing',()=>{

    test('weakSharing initial only runs once before all agents destroy themselves',()=>{
        const ref = weakSharing((state:number)=>new CountModel(state));
        const {agent:a1,connect:c1,disconnect:d1} = create(ref.initial(1));
        const {agent:a2,connect:c2,disconnect:d2} = create(ref.initial(2));
        c1();
        c2();
        expect(ref.current.state).toBe(1);
        d1();
        d2();
        const {agent:a3,connect:c3,disconnect:d3} = create(ref.initial(3));
        c3();
        expect(ref.current.state).toBe(3);
        d3();
    });

    test('sharing initial only runs once, even all agents destroy themselves',()=>{
        const ref = sharing((state:number)=>new CountModel(state));
        const {agent:a1,connect:c1,disconnect:d1} = create(ref.initial(1));
        const {agent:a2,connect:c2,disconnect:d2} = create(ref.initial(2));
        c1();
        c2();
        expect(ref.current.state).toBe(1);
        d1();
        d2();
        const {agent:a3,connect:c3,disconnect:d3} = create(ref.initial(3));
        c3();
        expect(ref.current.state).toBe(1);
        d3();
    });

    test('getSharingType API can pick the sharing type',()=>{
        const ref = weakSharing((state:number)=>new CountModel(state));
        const {agent:a1,connect:c1,disconnect:d1} = create(ref.initial(1));
        c1();
        expect(getSharingType(ref.current)).toBe('weak');
    })

});
