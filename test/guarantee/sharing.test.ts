import {createAgentReducer, sharing, weakSharing} from "../../src";
import {OriginAgent} from "../../index";

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

    const cleanRef = weakSharing(()=>new ObjectAgent(ref.current.state.id));

    const hardRef = sharing((id:number)=>new ObjectAgent(id));

    test("简单传参", () => {
        const { agent } = createAgentReducer(new ObjectAgent(0));
        agent.rename("name");
        expect(agent.state.name).toBe("name");
        expect(agent.state.id).toBe(0);
    });

    test("共享传参", () => {
        const { agent,destroy } = createAgentReducer(ref.initial(1));
        const { agent:ag,destroy:ds } = createAgentReducer(ref.initial(2));
        agent.rename("name");
        expect(agent.state.name).toBe("name");
        expect(agent.state.id).toBe(1);
        expect(ag.state.id).toBe(1);
        expect(ag.state.name).toBe('name');
        destroy();
        ds();
    });

    test("再利用传参", () => {
        const { agent,destroy } = createAgentReducer(ref.initial(5));
        const { agent:ag,destroy:ds } = createAgentReducer(cleanRef.initial());
        agent.rename("name");
        expect(agent.state.name).toBe("name");
        expect(agent.state.id).toBe(5);
        expect(ag.state.id).toBe(5);
        expect(ag.state.name).toBe('');
        destroy();
        ds();
    });

    test("再利用传参 sharing", () => {
        const { agent,destroy } = createAgentReducer(hardRef.initial(5));
        const { agent:ag,destroy:ds } = createAgentReducer(hardRef.current);
        agent.rename("name");
        expect(agent.state.name).toBe("name");
        expect(agent.state.id).toBe(5);
        expect(ag.state.id).toBe(5);
        expect(ag.state.name).toBe('name');
        destroy();
        ds();
        expect(agent.state.name).toBe("name");
        expect(agent.state.id).toBe(5);
        expect(ag.state.id).toBe(5);
        expect(ag.state.name).toBe('name');
    });
});
