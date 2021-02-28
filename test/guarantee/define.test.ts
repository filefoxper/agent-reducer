import { getAgentNamespaceKey } from "../../src";

describe("修补define测试", () => {
  test("getAgentNamespaceKey获取值为@@agent-reducer-namespace", () => {
    expect(getAgentNamespaceKey()).toBe("@@agent-reducer-namespace");
  });
});
