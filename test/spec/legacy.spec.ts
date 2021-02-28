import {
  createAgentReducer,
  OriginAgent,
  branch,
  BranchResolvers,
} from "../../src";

/**
 * 注意以下是 1.* 版本用法，未来 4.0.0 开始将彻底放弃，3.0.0 之后的功能在 1.* 版本上使用也将遭遇报错信息，
 * 该功能纯粹就是为了过渡而存在，可以使用 env.legacy=true 开启 1.+.+ 版本特性，建议 3.0.0 新用户跳过。
 */
describe("3.1.0开始重新加入1.1.0兼容用法", () => {
  class ObjectAgent implements OriginAgent<{ id: number; name: string }> {
    // 1.* state
    state = { id: 0, name: "" };

    // 1.* 版中 reduce-action 必须是一个返回非promise非undefined数据的方法，返回值将作为下一个 this.state
    rename = (name: string) => {
      return { ...this.state, name };
    };

    // 1.* 版中 middle-action 必须是一个返回promise或undefined数据的方法，它的作用仅限运行，
    // 本身没有改变 this.state 的能力，但可以调用 reduce-action 来修改 this.state。
    // 注意：虽然 middle-action 在 1.* 版本可以写在 agent 内部，但为了很好的调用 reduce-action 对方法内的 this 做了层层代理，
    // 所以不能写成箭头函数形式，否则 this 层层代理失效，middle-action 调用的 reduce-action 将变成一个不能修改 this.state 的普通方法调用。
    async remoteRename() {
      const name = await Promise.resolve("agent");
      //通过调用 reduce-action 修改 this.state
      this.rename(name);
    }

    // 1.* 版因为 this 在方法中的层层代理关系，如果在一个非箭头函数的 reduce-action 中调用其他 reduce-action ，
    // 将会触发多次 this.state 修改，有些修改可能不是期望的修改。
    // 如：renameNotArrow 调用了 this.rename，导致 this.rename 修改了一次 this.state ，而 renameNotArrow 自身作为 reduce-action，
    // 又修改了一次。相当于 reducer 的两次 dispatch，很显然，this.rename 的 dispatch 是不必要的。
    renameNotArrow(name: string) {
      return this.rename(name);
    }

    // 1.* 版中 middle-action 必须是一个返回promise或undefined数据的方法，它的作用仅限运行，
    // 本身没有改变 this.state 的能力。
    remoteJustPromiseRename() {
      return Promise.resolve({ id: 1, name: "agent" });
    }

    // 注意：虽然 middle-action 在 1.* 版本可以写在 agent 内部，但为了很好的调用 reduce-action 对方法内的 this 做了层层代理，
    // 所以不能写成箭头函数形式，否则 this 层层代理失效，middle-action 调用的 reduce-action 将变成一个不能修改 this.state 的普通方法调用。
    remoteRenameArrow = async () => {
      const name = await Promise.resolve("agent");
      this.rename(name);
    };

    async branchRemoteRename(ms: number) {
      await new Promise((r) => setTimeout(r, ms * 100));
      this.rename("agent_" + ms);
    }
  }

  test("调用返回非promise非undefined方法可触发this.state的修改，且修改后的值就是该方法返回值", () => {
    const { agent } = createAgentReducer(ObjectAgent, { legacy: true });
    agent.rename("agent");
    expect(agent.state.name).toBe("agent");
  });

  test("调用返回promise或undefined方法，这种方法本身不能改变 this.state", async () => {
    const { agent } = createAgentReducer(ObjectAgent, { legacy: true });
    await agent.remoteJustPromiseRename();
    expect(agent.state.name).toBe("");
  });

  test("调用一个调用了其他 reduce-action 的 reduce-action，会引起不必要的 this.state 修改", () => {
    const { agent, recordChanges } = createAgentReducer(ObjectAgent, {
      legacy: true,
    });
    const unRecord = recordChanges();
    agent.renameNotArrow("agent");
    const records = unRecord();
    expect(agent.state.name).toBe("agent");
    expect(records.length).toBe(2);
  });

  test("调用返回promise或undefined方法，这种方法本身不能改变 this.state，但可以通过调用返回非promise非undefined方法来改变 this.state", async () => {
    const { agent } = createAgentReducer(ObjectAgent, { legacy: true });
    await agent.remoteRename();
    expect(agent.state.name).toBe("agent");
  });

  test("箭头函数作为 middle-action ，即便调用 reduce-action 也无法修改 this.state", async () => {
    const { agent } = createAgentReducer(ObjectAgent, { legacy: true });
    await agent.remoteRenameArrow();
    expect(agent.state.name).toBe("");
  });

  test("通过 branch 分支系统可以，拷贝出一个 agent 任务分支，并让这个任务分支按照设定的 BranchResolver 来工作", async () => {
    const { agent } = createAgentReducer(ObjectAgent, { legacy: true });
    const { branchRemoteRename } = branch(agent, BranchResolvers.takeLatest());
    const f = branchRemoteRename(5);
    const s = branchRemoteRename(2);
    await Promise.all([f, s]);
    expect(agent.state.name).toBe("agent_2");
  });
});
