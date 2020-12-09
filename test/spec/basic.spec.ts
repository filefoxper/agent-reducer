import {
    MiddleActions,
    useMiddleWare,
    middleWare,
    BranchResolvers,
    createAgentReducer,
    OriginAgent,
    useMiddleActions,
    LifecycleMiddleWares
} from "../../src";
import {MiddleWare} from "@/libs/global.type";

/**
 * 一个 reducer 函数往往没有一个 class 实例对象更容易描述action type分支操作。
 * 但 reducer return 数据的设计要比对象赋值或setState修改数据更稳定，更有预测性，
 * 同时return出现在if分支判断中，能有效减少开发者的思维压力。
 * 让我们把reducer和面向对象两种模式的优点结合起来，用class的形式来重写一个reducer。
 */
describe('Reducer VS Class', () => {

    interface Action {
        type?: 'stepUp' | 'stepDown' | 'step' | 'sum',
        payload?: number[] | boolean
    }

    /**
     * 经典reducer模式
     * @param state
     * @param action
     */
    const countReducer = (state: number = 0, action: Action = {}): number => {
        switch (action.type) {
            case "stepDown":
                return state - 1;
            case "stepUp":
                return state + 1;
            case "step":
                return state + (action.payload ? 1 : -1);
            case "sum":
                return state + (Array.isArray(action.payload) ?
                    action.payload : []).reduce((r, c): number => r + c, 0);
            default:
                return state;
        }
    }

    /**
     * 结合reducer特性的class模式
     */
    class CountAgent implements OriginAgent<number> {

        state = 0;

        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        step = (isUp: boolean) => isUp ? this.stepUp() : this.stepDown();

        sum = (...counts: number[]): number => {
            return this.state + counts.reduce((r, c): number => r + c, 0);
        };

    }

    test('reducer的action模式比class方法调用模式更难使用（typescript系统还要描述type的类型）', () => {
        expect(countReducer(0, {type: 'stepUp'})).toBe(1);
        expect(new CountAgent().stepUp()).toBe(1);
    });

    test('reducer的action传参没有class方法调用入参显得那么自然', () => {
        expect(countReducer(0, {type: 'step', payload: true})).toBe(1);
        expect(new CountAgent().step(true)).toBe(1);
    });

    test('reducer的action传参没有class方法调用入参灵活', () => {
        expect(countReducer(0, {type: 'sum', payload: [1, 2, 3]})).toBe(6);
        expect(new CountAgent().sum(1, 2, 3)).toBe(6);
    });

});

/**
 * 概念:
 *
 * 1. origin-agent  : 用于代替reducer的class或object，包含一个state属性（this.state是agent需要维护的数据）。
 * 2. method        : origin-agent属性对应的非箭头函数 "step(isUp:boolean){...}"。
 * 3. arrow-function: origin-agent属性对应的箭头函数 "step = (isUp: boolean) =>..."。
 * 4. state-object  : origin-agent方法调用返回一个非 "undefined" 或 "promise"的完整数据，这个state将会成为this.state。
 * 5. reduce-action : origin-agent中返回 state-object 的method 或 arrow function，
 *                    这些方法会根据方法名发送（dispatch）一个类似 {type:'step',state:agent.step()} 的 reducer action。
 * 6. middle-action : origin-agent中返回 "undefined" or "promise" 的 method 或 arrow function，
 *                    调用这些方法不会直接影响 this.state，但你可以在这些 middle-actions 中通过调用 reduce-actions 来影响 this.state。
 * 7. agent         : 当使用 createAgentReducer(origin-agent) 时，可以得到一个 reducer 方法，在reducer方法属性中，
 *                    可以获取到 agent 对象，agent 作为 origin-agent 实例化的代理可以直接通过调用属性方法影响 this.state，
 *                    就像调用 reducer 的 dispatch 一样。
 *
 * 注意:
 *
 * 1. agent 是通过代理 (proxy) 的方式来实现 method 或 arrow-function 与 dispatch action之间的转换，
 *    但 arrow-function 中的 this 并非 agent，而是原始的 origin-agent，所以 arrow-function 不能做到层层代理的效果，
 *    也就是说以 arrow-function 作为 middle-action 来调用 reduce-action 是行不通的，
 *    但反之如果以 arrow-function 作为 reduce-action 不但可以很好的被 method middle-action调用，
 *    而且自身还可以调用其他 reduce-action 作为数据处理工具，而不必担心层层代理引起的多次dispatch。
 *
 * 2. 原理同上，method有层层代理的功效，所以更适合作为一个 middle-action 而非 reduce-action。
 */
describe('使用 agent-reducer 来使用 class 与 reducer 模式的结合体', () => {

    /**
     * 这是一个计数agent
     */
    class CountAgent implements OriginAgent<number> {

        // 必须有一个非 undefined 或 promise 的 state
        state = 0;

        // 返回一个 state-object (非promise,非undefined) 可以修改this.state
        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        // arrow-function 型的 reduce-action 使用其他 reduce-action 不必担心，会dispatch多次
        step = (isUp: boolean) => isUp ? this.stepUp() : this.stepDown();

        sum = (...counts: number[]): number => {
            return this.state + counts.reduce((r, c): number => r + c, 0);
        };

    }

    test('调用一个返回 state-object (非 promise 非 undefined) 的方法将会改变 this.state', () => {
        const {agent} = createAgentReducer(CountAgent);
        agent.stepUp();
        expect(agent.state).toBe(1);
    });

});

describe('class instance with agent-reducer', () => {

    class CountAgent implements OriginAgent<number> {

        state = 0;

        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        sum = (...counts: number[]): number => {
            return this.state + counts.reduce((r, c): number => r + c, 0);
        };

        // method 型的 reduce-action 调用其他 reduce-action 会引起多次不必要的dispatch，
        // 例子中的调用引发：dispatch('stepUp'或'stepDown',state-object)，dispatch('step',state-object)两次 dispatch，
        // 其中 dispatch('stepUp'或'stepDown',state-object) 是不必要的
        step(isUp: boolean) {
            return isUp ? this.stepUp() : this.stepDown();
        }

        // return promise 使得当前的 arrow-function 成为来一个 middle-action，middle-action自身没有改变this.state的能力
        callingRequest = () => Promise.resolve(2);

        // return undefined 使得当前的 method 成为来一个 middle-action，middle-action自身没有改变this.state的能力
        callingUndefined() {

        }

        // return promise 或 undefined 使得当前的 method 成为来一个 middle-action，middle-action自身没有改变this.state的能力,
        // 但可以通过调用 reduce-action 来修改 this.state
        async callingStepUpAfterRequest() {
            await Promise.resolve();
            return this.stepUp();
        }

    }

    test('一个 middle-action 不能自行改变 this.state', async () => {
        const {agent} = createAgentReducer(CountAgent);
        agent.callingUndefined();
        expect(agent.state).toBe(0);
        await agent.callingRequest();
        expect(agent.state).toBe(0);
    });

    test('middle-action 可以通过调用 reduce-action 来改变 this.state', async () => {
        const {agent} = createAgentReducer(CountAgent);
        await agent.callingStepUpAfterRequest();
        expect(agent.state).toBe(1);
    });

    test('在测试环境中调用 createAgentReducer 返回的 recordChanges 方法可以获取修改记录', () => {
        const {agent, recordChanges} = createAgentReducer(CountAgent);
        const unRecord = recordChanges(); // 返回一个 unRecord 方法，unRecord 的返回值就是修改记录
        agent.stepUp();
        agent.stepUp();
        agent.stepDown();
        const changes = unRecord(); // 修改记录格式 {type:方法名 , state:记录时刻agent的数据}
        expect(changes).toEqual([{type: 'stepUp', state: 1}, {type: 'stepUp', state: 2}, {type: 'stepDown', state: 1}]);
    });

    test('调用一个 method reduce-action，如果这个 action 又调用来其他的 reduce-action 会导致数据被修改多次（有不期望的数据修改发生）', () => {
        const {agent, recordChanges} = createAgentReducer(CountAgent);
        const unRecord = recordChanges();
        agent.step(true);
        const changes = unRecord();
        expect(changes.map(({state}) => state)).toEqual([1, 1]);
    });

});

describe('一个 agent 的 method 中，this永远指向 agent，不会随着 method 调用者的改变而改变，即使bind也不会修改 this 指向', () => {

    class CountAgent implements OriginAgent<number> {

        state = 0;

        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        sum = (...counts: number[]): number => this.state + counts.reduce((r, c): number => r + c, 0);

        step = (isUp: boolean) => isUp ? this.stepUp() : this.stepDown();

        async callingStepUpAfterRequest() {
            await Promise.resolve();
            return this.stepUp();
        }
    }

    test('将 method 赋值给其他 object 属性，直接调用 object 的属性方法，不会改变 this 的指向，this 应该为 agent', async () => {
        let object: any = {};
        const {agent} = createAgentReducer(CountAgent);
        const {callingStepUpAfterRequest} = agent;
        object.call = callingStepUpAfterRequest;
        await object.call();
        expect(agent.state).toBe(1);
    });

    test('将 method 绑定成其他 object 属性方法，直接调用绑定后方法，不会改变 this 的指向，this 应该为 agent', async () => {
        let object: any = {};
        const {agent} = createAgentReducer(CountAgent);
        const {callingStepUpAfterRequest} = agent;
        const call = callingStepUpAfterRequest.bind(object);
        await call();
        expect(agent.state).toBe(1);
    });

});

/**
 * 使用 useMiddleActions 方法可以把 reduce-actions 和 middle-actions 区分开
 * 如：useMiddleActions(agent,class extends MiddleActions)
 */
describe('使用 useMiddleActions 方法可以把 reduce-actions 和 middle-actions 区分开', () => {

    class CountAgent implements OriginAgent<number> {

        state = 0;

        constructor(initialState: number) {
            this.state = initialState;
        }

        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        sum = (...counts: number[]): number => this.state + counts.reduce((r, c): number => r + c, 0);

        step = (isUp: boolean) => isUp ? this.stepUp() : this.stepDown();

    }

    // 一个继承 MiddleActions 的 自定义类型可以调用指定 agent
    class CountBeside extends MiddleActions<CountAgent> {

        // 使用agent的 reduce-action 可修改 agent.state
        async callingStepUpAfterRequest() {
            await Promise.resolve();
            return this.agent.stepUp();
        }

    }

    test('使用 useMiddleActions 方法可以把 reduce-actions 和 middle-actions 区分开，通过调用 this.agent.xxx修改 agent.state', async () => {
        const {agent} = createAgentReducer(new CountAgent(1)); // 你可以使用对象的形式来定义一个 origin-agent，以方便传参
        const middleActions = useMiddleActions(agent, CountBeside); //使用 useMiddleActions 获取自定义MiddleActions的实例
        await middleActions.callingStepUpAfterRequest();
        expect(agent.state).toBe(2);
    });

});

describe('useMiddleWare 可以在已存在的 agent 基础上新建一个 agent ，并获取指定MiddleWare的能力', () => {

    class CountAgent implements OriginAgent<number> {

        state = 0;

        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        sum = (...counts: number[]): number => {
            return this.state + counts.reduce((r, c): number => r + c, 0);
        };

        async callingStepUpAfterRequest(tms: number) {
            await new Promise((r) => setTimeout(r, tms * 100));
            return this.sum(tms);
        }

    }

    test('使用 AsyncMiddleWares.takeLatest, 可以保持agent数据为最新版本数据（最后一次触发并修改的数据，有点像saga的takeLatest）', async () => {
        const {agent} = createAgentReducer(CountAgent);
        const {callingStepUpAfterRequest} = useMiddleWare(agent, LifecycleMiddleWares.takeLatest());
        const first = callingStepUpAfterRequest(5); // resolve 500ms 后
        const second = callingStepUpAfterRequest(2); // resolve 200ms 后
        // 200ms 后 second promise 先 resolve 并修改了 agent.state, 但 first promise 依然在等待,
        // 这时候 AsyncMiddleWares.takeLatest 这个 MiddleWare 把useMiddleWare新建的agent拷贝版标记成过期，并再次新建一个非过期的agent拷贝来代替这个版本，
        // 500ms 后 first promise resolve，但它所在的老版本拷贝已经过期，所以不能继续修改 agent.state 了.
        await Promise.all([
            first,
            second
        ]);
        expect(agent.state).toBe(2);
    });

    test('使用 AsyncMiddleWares.takeBlock, 可以使被调用方法在resolve之前，不能再被调用',()=>{
        const {agent,recordChanges} = createAgentReducer(CountAgent);
        const {callingStepUpAfterRequest} = useMiddleWare(agent, LifecycleMiddleWares.takeBlock(200));
        // 如果设置了阻塞时间，在阻塞时间过期后不论此时是否resolve完成，被调用方法都恢复原来可被调用状态
        const unRecord=recordChanges();
        const first = callingStepUpAfterRequest(5); // resolve after 500ms
        const second = callingStepUpAfterRequest(5); // resolve after 500ms
        setTimeout(()=>{
            const records=unRecord();
            expect(agent.state).toBe(5);
            expect(records.length).toBe(1);
        },600);
    });

    test('使用 AsyncMiddleWares.takeLazy, 可以实现节流效果', async () => {
        const {agent} = createAgentReducer(CountAgent);
        const {stepUp} = useMiddleWare(agent, LifecycleMiddleWares.takeLazy(200));
        // 延时200ms执行，若200ms内再被触发，以触发时间开始继续延迟200ms
        stepUp();
        stepUp();
        setTimeout(() => stepUp(), 100);
        await new Promise((r) => setTimeout(r, 350));
        expect(agent.state).toBe(1);
    });

});

describe('使用 middleWare 方法可以对当前被调用方法单独添加指定MiddleWare特性', () => {

    class CountAgent implements OriginAgent<number> {

        state = 0;

        constructor() {
            middleWare(this.callingStepUpAfterRequestAddMiddleWareInConstructor,LifecycleMiddleWares.takeLatest());
        }

        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        sum = (...counts: number[]): number => {
            return this.state + counts.reduce((r, c): number => r + c, 0);
        };

        @middleWare(LifecycleMiddleWares.takeLatest())
        async callingStepUpAfterRequest(tms: number) {
            await new Promise((r) => setTimeout(r, tms * 100));
            return this.sum(tms);
        }

        async callingStepUpAfterRequestAddMiddleWareInConstructor(tms: number) {
            await new Promise((r) => setTimeout(r, tms * 100));
            return this.sum(tms);
        }

    }

    class CountBesides extends MiddleActions<CountAgent> {

        @middleWare(LifecycleMiddleWares.takeLatest())
        async callingStepUpAfterRequest(tms: number) {
            await new Promise((r) => setTimeout(r, tms * 100));
            return this.agent.sum(tms);
        }

    }

    test('在 agent 的 middle-action 上都可以通过添加middleWare的形式实现简易的useMiddleWare', async () => {
        const {agent} = createAgentReducer(CountAgent);
        const {callingStepUpAfterRequest} = agent;
        const first = callingStepUpAfterRequest(5); // after 500ms
        const second = callingStepUpAfterRequest(2); // after 200ms
        await Promise.all([
            first,
            second
        ]);
        expect(agent.state).toBe(2);
    });

    test('在 agent 的 constructor里通过添加middleWare方法调用的形式也能实现简易的useMiddleWare', async () => {
        const {agent} = createAgentReducer(CountAgent);
        const {callingStepUpAfterRequestAddMiddleWareInConstructor} = agent;
        const first = callingStepUpAfterRequestAddMiddleWareInConstructor(5); // after 500ms
        const second = callingStepUpAfterRequestAddMiddleWareInConstructor(2); // after 200ms
        await Promise.all([
            first,
            second
        ]);
        expect(agent.state).toBe(2);
    });

    test('在 MiddleActions 的所有方法上都可以通过添加middleWare的形式实现简易的useMiddleWare', async () => {
        const {agent} = createAgentReducer(CountAgent);
        const {callingStepUpAfterRequest} = useMiddleActions(agent, CountBesides);
        const first = callingStepUpAfterRequest(5); // after 500ms
        const second = callingStepUpAfterRequest(2); // after 200ms
        await Promise.all([
            first,
            second
        ]);
        expect(agent.state).toBe(2);
    });

});

// 如果有兴趣请继续看develop.spec.ts，了解一些agent-reducer的非基本用法。