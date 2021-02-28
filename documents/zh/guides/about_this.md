# 关键词 this

关键词`this`在class方法中的稳定性并不理想，当我们直接通过class的实例调用方法时，`this`代表该class实例，但如果我们把这个方法赋值给其他对象，并从其他对象调用该方法时，`this`就变成了其他对象。

但是，在使用`agent-reducer`的`Agent`对象方法时，关键词`this`是相当稳定的。你可以不必再担心方法赋值给其他对象时的情况，也不比担心直接提取方法调用的情况，甚至连`function.bind`或`function.call`这样动作也不是你需要注意的范畴。在使用`agent-reducer`的`Agent`对象方法时，关键词`this`永远指向`Agent`对象。

源码位置：[keywordThis.spec.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/zh/guides/keywordThis.spec.ts).

example:
```typescript
import {createAgentReducer, OriginAgent} from "agent-reducer";

describe('关键词this在Agent方法调用时是安全的', () => {

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

    it("我们可以将'Agent'方法提取成变量，并调用这个变量function", () => {
        const {agent}=createAgentReducer(CountAgent);
        const {walk}=agent;
        walk(true);
        expect(agent.state).toBe(1);
    });

    it("我们可以将'Agent'方法赋值给其他对象，并通过其他对象调用该方法", () => {
        const {agent}=createAgentReducer(CountAgent);
        const {walk}=agent;
        const proxy={state:null,walk};
        proxy.walk(true);
        expect(agent.state).toBe(1);
    });

    it("我们甚至可以将'Agent'方法绑定在其他对象上进行调用", () => {
        const {agent}=createAgentReducer(CountAgent);
        const {walk}=agent;
        const proxy={state:null};
        walk.bind(proxy)(true);
        expect(agent.state).toBe(1);
    });

});
```

[下一节](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/guides/about_middle_ware.md)