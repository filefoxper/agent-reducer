# about keyword this

Keyword `this` is instable in class method, when we are calling a method directly from class instance, `this` is equivalent to the instance, but if we reassign this method to another object, `this` will point to the object where you are calling from.

But, if you are using a method from an `Agent` object created by `agent-reducer`, you can pay less attention to keyword `this`. For `agent-reducer` always bind `this` to `Agent` object, you can assign your method from `Agent` object to any other object, even pick it out, and call it just like calling a simple function, keyword `this` is still equivalent to `Agent` object.

You can check code in [keywordThis.spec.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/en/guides/keywordThis.spec.ts).

example:
```typescript
import {createAgentReducer, OriginAgent} from "agent-reducer";

describe('keyword this in Agent object is safe', () => {

    class CountAgent implements OriginAgent<number> {

        state = 0;

        increase = (): number => this.state + 1;

        decrease(): number {
            return this.state - 1;
        }

        walk(increment: boolean): number {
            return increment ? this.increase() : this.decrease();
        }

        sum(...counts: number[]): number {
            return this.state + counts.reduce((r, c): number => r + c, 0);
        };
    }

    it("we can pick a method of 'Agent' object out as a variable, and call the variable function", () => {
        const {agent}=createAgentReducer(CountAgent);
        const {walk}=agent;
        walk(true);
        expect(agent.state).toBe(1);
    });

    it("we can assign a method of 'Agent' object to another object, and call it as another object method", () => {
        const {agent}=createAgentReducer(CountAgent);
        const {walk}=agent;
        const proxy={state:null,walk};
        proxy.walk(true);
        expect(agent.state).toBe(1);
    });

    it("we can bind a method of 'Agent' object to another object, and call it as another object method", () => {
        const {agent}=createAgentReducer(CountAgent);
        const {walk}=agent;
        const proxy={state:null};
        walk.bind(proxy)(true);
        expect(agent.state).toBe(1);
    });

});
```

[next section](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/guides/about_middle_ware.md)