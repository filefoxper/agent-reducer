import {createAgentReducer, getAgentNamespaceKey, middleWare, MiddleWares} from "../../src";

describe("修补define测试", () => {
  test("getAgentNamespaceKey获取值为@@agent-reducer-namespace", () => {
    expect(getAgentNamespaceKey()).toBe("@@agent-reducer-namespace");
  });
});

describe("object",()=>{

  test("object sample",()=>{
    const model={
      state:{name:'',id:0},
      setName(name:string){
        return {...this.state,name};
      }
    }
    const {agent}=createAgentReducer(model);
    agent.setName('fuck');
    expect(agent.state.name).toBe('fuck');
  });

  test("object sample1",async ()=>{
    const model={
      state:{name:'',id:0},
      async setName(name:string){
        return {...this.state,name};
      }
    }
    const {agent}=createAgentReducer(model,MiddleWares.takePromiseResolve());
    await agent.setName('fuck');
    expect(agent.state.name).toBe('fuck');
  });

});