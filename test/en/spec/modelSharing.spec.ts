import {createAgentReducer, weakSharing, OriginAgent, sharing, Reducer, Action} from "../../../src";

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