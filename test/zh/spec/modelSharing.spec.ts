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

describe("持久化模型共享",()=>{

    it("使用普通对象模型进行共享",()=>{
        const userModel = new UserModel();
        const {agent:agent1,destroy:destroy1}=createAgentReducer(userModel);
        const {agent:agent2,destroy:destroy2}=createAgentReducer(userModel);
        // 修改 agent1 的 state
        agent1.changeName('name');
        // 销毁 agent1 和 agent2
        destroy2();
        destroy1();
        // agent1 和 agent2 共享数据更新
        expect(agent2.state.name).toBe('name');
        expect(agent1.state.name).toBe('name');
        // 新建 agent3, agent3.state 和当前 model.state 保持一致
        const {agent:agent3}=createAgentReducer(userModel);
        expect(agent3.state.name).toBe('name');
    });

    it("使用 API `sharing` 创建共享模型",()=>{
        const ref = sharing(()=>UserModel);
        const {agent:agent1,destroy:destroy1}=createAgentReducer(ref.current);
        const {agent:agent2,destroy:destroy2}=createAgentReducer(ref.current);
        // 修改 agent1 的 state
        agent1.changeName('name');
        // 销毁 agent1 和 agent2
        destroy2();
        destroy1();
        // agent1 和 agent2 共享数据更新
        expect(agent2.state.name).toBe('name');
        expect(agent1.state.name).toBe('name');
        // 新建 agent3, agent3.state 和当前 model.state 保持一致
        const {agent:agent3}=createAgentReducer(ref.current);
        expect(agent3.state.name).toBe('name');
    });

});

describe("弱持久化模型共享",()=>{

    it("使用 API `weakSharing` 创建模型",()=>{
        const ref = weakSharing(()=>UserModel);
        const {agent:agent1,destroy:destroy1}=createAgentReducer(ref.current);
        const {agent:agent2,destroy:destroy2}=createAgentReducer(ref.current);
        // 修改 agent1 的 state
        agent1.changeName('name');
        // 销毁 agent1 和 agent2
        destroy2();
        destroy1();
        // agent1 和 agent2 共享数据更新
        expect(agent2.state.name).toBe('name');
        expect(agent1.state.name).toBe('name');
        // 新建 agent3, agent3.state 和最初 model.state 保持一致
        const {agent:agent3}=createAgentReducer(ref.current);
        expect(agent3.state.name).toBe('');
    });

});