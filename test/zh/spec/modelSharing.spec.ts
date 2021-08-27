import {
    createAgentReducer,
    weakSharing,
    sharing,
    middleWare,
    MiddleWarePresets
} from "../../../src";
import {OriginAgent} from "../../../index";

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

    @middleWare(MiddleWarePresets.takePromiseResolveAssignable())
    remoteChangeName(){
        return new Promise((r)=>setTimeout(r,300,{name:'remoteName'}));
    }

    @middleWare(MiddleWarePresets.takeLatestAssignable())
    remoteLatestChange(delay:number,name:string){
        return new Promise((r)=>setTimeout(r,delay,{name}));
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

    it("sharing 模式忽略 destroy 的影响，且强制关闭 env.strict 模式",async ()=>{
        const ref = sharing(()=>UserModel);
        const {agent:agent1,destroy:destroy1}=createAgentReducer(ref.current);
        const {agent:agent2,destroy:destroy2}=createAgentReducer(ref.current);
        // 修改 agent1 的 state
        agent1.changeName('name');
        expect(agent2.state.name).toBe('name');
        expect(agent1.state.name).toBe('name');
        const p= agent1.remoteChangeName();
        // 销毁 agent1 和 agent2
        destroy2();
        destroy1();
        await p;
        // agent1 和 agent2 共享数据更新
        expect(agent2.state.name).toBe('remoteName');
        expect(agent1.state.name).toBe('remoteName');
        // 新建 agent3, agent3.state 和当前 model.state 保持一致
        const {agent:agent3}=createAgentReducer(ref.current);
        expect(agent3.state.name).toBe('remoteName');
    });

    it('模型共享时，方法级middleWare状态也共享',async ()=>{
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