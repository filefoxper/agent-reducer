import {
  applyMiddleWares,
  createAgentReducer,
  middleWare,
  MiddleWares,
  OriginAgent,
} from "../../src";

describe("补全MiddleWares测试", () => {
  class ObjectAgent implements OriginAgent<{ id: number; name: string }> {
    state = { id: 0, name: "" };

    @middleWare(MiddleWares.takeAssignable())
    rename(name: string) {
      return { name };
    }

    @middleWare(MiddleWares.takeBlock())
    takeBlockRename(name: string) {
      return { ...this.state, name };
    }

    @middleWare(MiddleWares.takePromiseResolve())
    takePromiseResolveRename(name: string) {
      return { ...this.state, name };
    }

    @middleWare(
      applyMiddleWares(
        MiddleWares.takePromiseResolve(),
        MiddleWares.takeAssignable()
      )
    )
    async remoteRename() {
      const name = await Promise.resolve("remote");
      return { name };
    }
  }

  test("MiddleWares.takeAssignable可以补全state信息", () => {
    const { agent } = createAgentReducer(ObjectAgent);
    agent.rename("rename");
    expect(agent.state).toEqual({ id: 0, name: "rename" });
  });

  test("MiddleWares.takeBlock在同步方法上没有任何影响", () => {
    const { agent } = createAgentReducer(ObjectAgent);
    agent.takeBlockRename("rename");
    agent.takeBlockRename("rename_again");
    expect(agent.state).toEqual({ id: 0, name: "rename_again" });
  });

  test("MiddleWares.takePromiseResolve在同步方法上没有任何影响", () => {
    const { agent } = createAgentReducer(ObjectAgent);
    agent.takePromiseResolveRename("rename");
    agent.takePromiseResolveRename("rename_again");
    expect(agent.state).toEqual({ id: 0, name: "rename_again" });
  });

  test("MiddleWares.takePromiseResolve和MiddleWares.takeAssignable配合解决异步state补全问题", async () => {
    const { agent } = createAgentReducer(ObjectAgent);
    await agent.remoteRename();
    expect(agent.state).toEqual({ id: 0, name: "remote" });
  });
});
