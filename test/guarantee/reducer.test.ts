import { createAgentReducer } from "../../src";
import {OriginAgent} from "../../index";

describe("修补reducer测试", () => {
  class ObjectAgent implements OriginAgent<{ id: number; name: string }> {
    state = { id: 0, name: "" };

    rename = (name: string) => {
      return { ...this.state, name };
    };
  }

  test("如果希望和reducer管理工具整合在一起，但没有使用useStoreSlot或update，内置的store的dispatch方法依然会失效", () => {
    const { agent } = createAgentReducer(ObjectAgent, { updateBy: "manual" });
    agent.rename("name");
    expect(agent.state.name).toBe("");
  });
});
