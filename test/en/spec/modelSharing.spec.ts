import {
    createAgentReducer,
    weakSharing,
    OriginAgent,
    sharing,
    Reducer,
    Action,
    middleWare,
    MiddleWarePresets
} from "../../../src";

type User={
    name?:string,
    id:number
}

class UserModel implements OriginAgent<User>{

    state={id:0,name:''};

    changeName(name:string){
        return {...this.state,name};
    }

    changeId(id:number){
        return {...this.state,id};
    }

    @middleWare(MiddleWarePresets.takeLatestAssignable())
    remoteLatestChange(delay:number,name:string){
        return new Promise((r)=>setTimeout(r,delay,{name}));
    }

}

describe("persistent model sharing",()=>{

    it("use normal object model for sharing",()=>{
        const userModel = new UserModel();
        const {agent:agent1,destroy:destroy1}=createAgentReducer(userModel);
        const {agent:agent2,destroy:destroy2}=createAgentReducer(userModel);
        // use agent1 to change state
        agent1.changeName('name');
        // destroy agent1 and agent2
        destroy2();
        destroy1();
        // agent1 and agent2 sharing state updating
        expect(agent2.state.name).toBe('name');
        expect(agent1.state.name).toBe('name');
        // create agent3, agent3.state keep equal with model.state
        const {agent:agent3}=createAgentReducer(userModel);
        expect(agent3.state.name).toBe('name');
    });

    it("use API `sharing` to create model",()=>{
        const ref = sharing(()=>UserModel);
        const {agent:agent1,destroy:destroy1}=createAgentReducer(ref.current);
        const {agent:agent2,destroy:destroy2}=createAgentReducer(ref.current);
        // use agent1 to change state
        agent1.changeName('name');
        // destroy agent1 and agent2
        destroy2();
        destroy1();
        // agent1 and agent2 sharing state updating
        expect(agent2.state.name).toBe('name');
        expect(agent1.state.name).toBe('name');
        // create agent3, agent3.state keep equal with model.state
        const {agent:agent3}=createAgentReducer(ref.current);
        expect(agent3.state.name).toBe('name');
    });

    it('the state of the middleWare on model methods shares too',async ()=>{
        const ref = sharing(()=>UserModel);
        const {agent:agent1,destroy:destroy1}=createAgentReducer(ref.current);
        const {agent:agent2,destroy:destroy2}=createAgentReducer(ref.current);
        const p1= agent1.remoteLatestChange(200, 'name1');
        const p2 = agent2.remoteLatestChange(100, 'name2');

        await Promise.all([p1,p2]);

        expect(agent1.state.name).toBe('name2');
        // 销毁 agent1 和 agent2
        destroy2();
        destroy1();
    });

});

describe("weak persistent model sharing",()=>{

    it("use API `weakSharing` to create model",()=>{
        const ref = weakSharing(()=>UserModel);
        const {agent:agent1,destroy:destroy1}=createAgentReducer(ref.current);
        const {agent:agent2,destroy:destroy2}=createAgentReducer(ref.current);
        // use agent1 to change state
        agent1.changeName('name');
        // destroy agent1 and agent2
        destroy2();
        destroy1();
        // agent1 and agent2 sharing state updating
        expect(agent2.state.name).toBe('name');
        expect(agent1.state.name).toBe('name');
        // create agent3, agent3.state keep equal with the default model.state
        const {agent:agent3}=createAgentReducer(ref.current);
        expect(agent3.state.name).toBe('');
    });

});