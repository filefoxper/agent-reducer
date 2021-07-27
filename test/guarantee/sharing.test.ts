import {OriginAgent, createAgentReducer, weakSharing} from "../../src";

type User = { id: number; name: string };

describe("修补reducer测试", () => {
    class ObjectAgent implements OriginAgent<User> {
        state:User;

        constructor(id:number) {
            this.state={ id, name: "" };
        }

        rename = (name: string) => {
            return { ...this.state, name };
        };
    }

    const ref = weakSharing((id:number)=>new ObjectAgent(id));

    test("简单传参", () => {
        const { agent } = createAgentReducer(new ObjectAgent(0));
        agent.rename("name");
        expect(agent.state.name).toBe("name");
        expect(agent.state.id).toBe(0);
    });

    test("共享传参", () => {
        const { agent } = createAgentReducer(ref.initial(1));
        const { agent:ag } = createAgentReducer(ref.initial(2));
        agent.rename("name");
        expect(agent.state.name).toBe("name");
        expect(agent.state.id).toBe(1);
        expect(ag.state.id).toBe(1);
        expect(ag.state.name).toBe('name');
    });
});
