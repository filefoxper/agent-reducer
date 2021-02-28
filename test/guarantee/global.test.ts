import { createAgentReducer, OriginAgent } from "../../src";

describe("if (global||window).Proxy is not exist", () => {
  class ObjectAgent implements OriginAgent<{ id: number; name: string }> {
    state = { id: 0, name: "" };

    props = 1;

    rename = (name: string) => {
      return { ...this.state, name };
    };
  }

  const P = global.Proxy;

  beforeAll(() => {
    delete global["Proxy"];
  });

  afterAll(() => {
    global.Proxy = P;
  });

  test("if (global||window).Proxy is not exist, it should work too", () => {
    const { agent } = createAgentReducer(ObjectAgent);
    agent.rename("abc");
    expect(agent.state.name).toBe("abc");
  });

  test("reset a function of agent should not work", () => {
    const { agent } = createAgentReducer(ObjectAgent);
    agent.props = 2;
    expect(agent.props).toBe(2);
    expect(() => {
      agent.rename = function (name: string) {
        return { id: 1, name };
      };
    }).toThrowError();
  });
});
