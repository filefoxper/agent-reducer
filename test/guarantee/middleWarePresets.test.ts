import {
  applyMiddleWares,
  createAgentReducer,
  middleWare,
  MiddleWarePresets,
} from "../../src";
import {OriginAgent} from "../../index";

describe("补全MiddleWarePresets测试", () => {
  class ObjectAgent implements OriginAgent<{ id: number; name: string }> {
    state = { id: 0, name: "" };

    @middleWare(MiddleWarePresets.takeAssignable())
    rename(name: string) {
      return { name };
    }

    @middleWare(MiddleWarePresets.takePromiseResolveAssignable())
    async remoteRename() {
      const name = await Promise.resolve("remote");
      return { name };
    }

    @middleWare(MiddleWarePresets.takePromiseResolve())
    async takePromiseResolveName() {
      const name = await Promise.resolve("remote");
      return { name };
    }

    @middleWare(MiddleWarePresets.takeLatest())
    async takeLatestName(name: string, tms: number) {
      await new Promise((r) => setTimeout(r, tms * 100));
      return { name };
    }

    @middleWare(MiddleWarePresets.takeLatestAssignable())
    async takeLatestNameAssignable(name: string, tms: number) {
      await new Promise((r) => setTimeout(r, tms * 100));
      return { name };
    }

    @middleWare(MiddleWarePresets.takeLazyAssignable(500))
    async takeLazyNameAssignable() {
      const name = await Promise.resolve("lazy");
      return { name };
    }
  }

  test("MiddleWarePresets.takeAssignable可以补全state信息", () => {
    const { agent } = createAgentReducer(ObjectAgent);
    agent.rename("rename");
    expect(agent.state).toEqual({ id: 0, name: "rename" });
  });

  test("MiddleWarePresets.takePromiseResolveAssignable解决异步state补全问题", async () => {
    const { agent } = createAgentReducer(ObjectAgent);
    await agent.remoteRename();
    expect(agent.state).toEqual({ id: 0, name: "remote" });
  });

  test("MiddleWarePresets.takeLatestAssignable解决异步最新版本state补全问题", async () => {
    const { agent } = createAgentReducer(ObjectAgent);
    const f = agent.takeLatestNameAssignable("first", 5);
    const s = agent.takeLatestNameAssignable("second", 2);
    await Promise.all([f, s]);
    expect(agent.state).toEqual({ id: 0, name: "second" });
  });

  test("MiddleWarePresets.takeLazyAssignable解决异步延时state补全问题", async () => {
    const { agent, recordChanges } = createAgentReducer(ObjectAgent);
    const unRecord = recordChanges();
    agent.takeLazyNameAssignable();
    agent.takeLazyNameAssignable();
    await new Promise((r) => setTimeout(r, 600));
    const changes = unRecord();
    expect(agent.state).toEqual({ id: 0, name: "lazy" });
    expect(changes.length).toBe(1);
  });

  test("MiddleWarePresets.takePromiseResolve没有与原state合并的功能", async () => {
    const { agent } = createAgentReducer(ObjectAgent);
    await agent.takePromiseResolveName();
    expect(agent.state).toEqual({ name: "remote" });
  });

  test("MiddleWarePresets.takeLatest没有与原state合并的功能", async () => {
    const { agent } = createAgentReducer(ObjectAgent);
    const f = agent.takeLatestName("first", 5);
    const s = agent.takeLatestName("second", 2);
    await Promise.all([f, s]);
    expect(agent.state).toEqual({ name: "second" });
  });
});
