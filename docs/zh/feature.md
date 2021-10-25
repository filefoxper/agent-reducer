# 特性

## 方法中的关键词 this

在 javascript 中，关键词 `this` 经常因为各种原因而发生改变，这非常令人头疼。但在 `agent-reducer` 的 `代理` 方法中，关键词 `this` 被绑定在 `模型实例` 上，不会随着方法的赋值、重绑等行为而发生改变，因此我们可以拥有一个比较让人放心稳定的 `this` 引用。

```typescript
import {
    create,
    Model,
} from "agent-reducer";

describe('代理方法中的 `this`', () => {

    class CounterModel implements Model<number> {

        state: number = 0;

        increase() {
            return this.state + 1;
        }

    }

    test('代理方法中的 `this` 与模型实例绑定，且不可改变', () => {
        const data = {
            state: 1
        }
        const {agent, connect, disconnect} = create(CounterModel);
        connect();
        const {increase} = agent;
        // 尝试使用 `fn.call` 更换代理方法中的 `this`.
        const result = increase.call(data);
        // `fn.call` 不能改变代理方法中的 `this`.
        expect(result).not.toBe(2);
        expect(agent.state).toBe(1);
        disconnect();
    });

});
```

## 模型共享

模型共享是指来源于同一个`模型实例`的多个`代理`共享 state 数据更新的特性。

`agent-reducer` 把 state 数据、缓存信息、监听接口集成在`模型实例`中，其任一`代理`修改 state 数据的行为都会被`模型实例`通过监听接口广播至其他`代理`。

```typescript
import {
    create,
    middleWare,
    MiddleWarePresets,
    Action,
    Model
} from 'agent-reducer';

describe('同步共享 state 更新',()=>{

    // 这是一个用于计算数字加减的模型，
    // 我们的方法调用将影响模型 state 的变化
    class Counter implements Model<number> {

        state = 0;

        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        step(isUp: boolean):number{
            return isUp ? this.stepUp() : this.stepDown();
        }

    }

    const counter = new Counter();

    test('两个获多个使用相同模型实例的 agent，同步共享 state 更新',()=>{
        // 为两个不同的 agent reducer 对象创建两个 listener，dispatch1 与 dispatch2
        const dispatch1 = jest.fn().mockImplementation((action:Action)=>{
            // 当前监听器可以收到 agent 改变 state 产生的通知。
            // 通知数据 action 中包含了改变的 state 对象。
            expect(action.state).toBe(1);
        });
        const dispatch2 = jest.fn().mockImplementation((action:Action)=>{
            expect(action.state).toBe(1);
        });
        // 通过 create api 自 `Model` 创建一个 `agent reducer`
        const reducer1 = create(counter);
        const reducer2 = create(counter);
        // 在调用方法前，需要使用 connect 作一次连接处理，
        // 通过 connect 可以接入一个监听器，如：dispatch1
        reducer1.connect(dispatch1);
        reducer2.connect(dispatch2);
        // agent.stepUp 方法返回值将成为下一个 state，
        // 并把 state 更新通知到 reducer2.agent
        reducer1.agent.stepUp();

        expect(dispatch1).toBeCalled();     // dispatch1 工作
        expect(dispatch2).toBeCalled();     // dispatch2 工作
        expect(counter.state).toBe(1);
    });

});
```

上述例子或许并不能直观显示它的好处，但如果我们把这一特性运用在渲染平台中，如在不同的 React 组件中，我们就可以绕开 `props` 或 `context` 进行数据同步更新渲染了。如果您是 React 用户，可以使用 [use-agent-reducer](https://filefoxper.github.io/use-agent-reducer/#/zh/) 自动把 `agent-reducer` 集成到 React 中去。如果您是支付宝小程序用户，建议使用[支付宝小程序原生hook](https://github.com/shensai06/mini-hook) 中集成的 `useAgentReducer`。

作为默认用法，上述例子中的模型共享受到了一些制约：

1. 在所有`代理`销毁时，模型实例并不会重置。当然可能使用者并不一定希望重置它，但这种自动重置的能力还是需要的。
2. `代理`销毁后发出的 state 变更不再被`模型实例`接收，即便其他兄弟`代理`依然在使用。这看上去非常美好，但在实际应用中，我们更希望`模型实例`依然可以接收并广播这些 state 变更。

为了解决上述问题，我们开发了 API `sharing` 和 `weakSharing` 来分别提供一种 `强共享` 和 `弱共享` 模式。这两种 API 拥有相同的入参和返回值。

```typescript
// 入参类型 Factory
// 用于创建或重建模型实例的回调函数，
// 改函数可返回模型 class 或 模型实例对象
declare type Factory<
    S,
    T extends Model<S> = Model<S>
    > = (...args:any[])=>T|{new ():T};

// 返回类型 SharingRef
// 通过访问 current 属性，可获取当前 `模型实例`
// 通过调用 initial 属性方法，可以初始化 `模型实例`
declare type SharingRef<
    S,
    T extends Model<S>= Model<S>,
    > = {
    // 通过访问 current 属性，可获取当前 `模型实例` ，
    // 若当前 `模型实例` 尚未创建，
    // 系统会在访问 `current` 时，通过 Factory 创建一个 `实例`，
    // 并保存在 `current` 属性中。
    current:T,
    // 如果 Factory 需要参数协助创建 `模型实例`，
    // 可以调用 initial 回调传入参数。
    // 改方法只会在 `模型实例` 尚未初始化或被销毁后才会调用 Factory，
    // 否则该方法返回 current 属性存放的前 `模型实例`
    initial:Factory<S, T>
};
```

#### 强共享

通过 API [sharing](/zh/api?id=sharing) 创建的 `模型实例` 可在内存中持续维护 state 状态，且不会自动重置。

```typescript
export declare function sharing<
    S,
    T extends Model<S> = Model<S>
    >(factory:Factory<S, T>): SharingRef<S, T>;
```

#### 弱共享

通过 API [weakSharing](/zh/api?id=weaksharing) 创建的 `模型实例` 会在其 `代理` 全部销毁时，自动销毁，当再次访问 `current` 属性时，重置成一个新 `实例` 。

```typescript
export declare function weakSharing<
    S,
    T extends Model<S>=Model<S>
    >(
    factory:Factory<S, T>,
):SharingRef<S, T>;
```

通过一下单元测试可以更容易区分`默认共享`、`强恭喜`、`弱共享`之间的差异。

```typescript
import {
    create,
    middleWare,
    MiddleWarePresets,
    Action,
    Model,
    sharing,
    weakSharing
} from 'agent-reducer';

describe('模型共享',()=>{

    type User = {
        id: undefined | number
        name: string,
        nick: string
    }

    const defaultUser = {
        id: undefined,
        name: 'guest',
        nick: 'guest'
    };

    const remoteUser = {
        id: 0,
        name: 'name',
        nick: 'nick'
    };

    const anotherRemoteUser = {
        id: 1,
        name: 'name1',
        nick: 'nick1'
    }

    // 这时个 user 模型
    class UserModel implements Model<User> {

        state: User = defaultUser;

        @middleWare(MiddleWarePresets.takeLatest())
        login() {
            return Promise.resolve(remoteUser);
        }

        @middleWare(MiddleWarePresets.takeLatest())
        switchUser(){
            return Promise.resolve(anotherRemoteUser);
        }

        @middleWare(MiddleWarePresets.takeLatest())
        logout(){
            return Promise.resolve(defaultUser);
        }

        rename(name: string) {
            return {name, nick: name};
        }

        updateNick(nick: string) {
            return {nick};
        }

    }

    test('使用默认共享，将会遇到一些特性限制',async ()=>{
        // 创建模型实例
        const userModel = new UserModel();
        // 为了体验模型共享，我们需要至少创建两个以上的代理
        const { agent,connect,disconnect } = create(userModel);
        const { agent:another,connect:anotherConnect,disconnect:anotherDisConnect } = create(userModel);
        // 连接代理
        connect();
        anotherConnect();
        // 登录用户
        await agent.login();
        expect(agent.state).toEqual(remoteUser);
        expect(another.state).toEqual(remoteUser);
        // 登出用户
        const logoutOperation = agent.logout();
        // 在登出用户完成前，强行断开连接，销毁代理
        disconnect();
        anotherDisConnect();
        await logoutOperation;
        // 因为过早销毁代理，故模型中的 state 没有来得及发生改变。
        // 这就是默认共享的限制之一
        const { agent:tester,connect:testConnect,disconnect:testDisconnect } = create(userModel);
        testConnect();
        expect(tester.state).not.toEqual(defaultUser);
        expect(tester.state).toEqual(remoteUser);
        testDisconnect();
    });

    test('使用 API `sharing` 创建一个可持续 state 变更的强共享',async ()=>{
        // 创建 `模型实例引用`
        const userRef = sharing(()=>new UserModel());
        // 为了体验模型共享，我们需要至少创建两个以上的代理，
        // 我们需要通过访问模型实例引用 `userRef.current` 来创建代理 
        const { agent,connect,disconnect } = create(userRef.current);
        const { agent:another,connect:anotherConnect,disconnect:anotherDisConnect } = create(userRef.current);
        // 连接代理
        connect();
        anotherConnect();
        // 登录用户
        await agent.login();
        expect(agent.state).toEqual(remoteUser);
        expect(another.state).toEqual(remoteUser);
        // 切换用户
        const switchOperation = agent.switchUser();
        // 在切换完成前，断开连接，并销毁代理
        disconnect();
        anotherDisConnect();
        await switchOperation;
        // 使用 API `sharing` 创建的强共享，不会丢失 state 变更
        const { agent:tester,connect:testConnect,disconnect:testDisconnect } = create(userRef.current);
        testConnect();
        expect(tester.state).toEqual(anotherRemoteUser);
        testDisconnect();
    });

    test('使用 API `weakSharing` 创建一个可自动重置的弱共享',async ()=>{
        // 创建 `模型实例引用`
        const userRef = weakSharing(()=>new UserModel());
        // 为了体验模型共享，我们需要至少创建两个以上的代理，
        // 我们需要通过访问模型实例引用 `userRef.current` 来创建代理 
        const { agent,connect,disconnect } = create(userRef.current);
        const { agent:another,connect:anotherConnect,disconnect:anotherDisConnect } = create(userRef.current);
        // 连接代理
        connect();
        anotherConnect();
        // 登录用户
        await agent.login();
        expect(agent.state).toEqual(remoteUser);
        expect(another.state).toEqual(remoteUser);
        // 切换用户
        const switchOperation = agent.switchUser();
        // 在切换完成前，断开连接，并销毁代理
        disconnect();
        anotherDisConnect();
        await switchOperation;
        // 弱共享全量销毁 `代理` 后，会被重置
        const { agent:tester,connect:testConnect,disconnect:testDisconnect } = create(userRef.current);
        testConnect();
        expect(tester.state).toEqual(defaultUser);
        testDisconnect();
    });

});
```

#### 为模型共享设置初始值

 有时候我们需要为参与模型共享的 `模型实例` 传入外部参数。在使用 API `sharing` 或 `weakSharing` 时，我们可以调用其返回模型引用中的 `initial` 方法进行初始化。

```typescript
import {
    create,
    middleWare,
    MiddleWarePresets,
    Action,
    Model,
    sharing,
    weakSharing
} from 'agent-reducer';

describe('使用 initial',()=>{

    class Counter implements Model<number>{

        state:number;

        constructor(initialState:number = 0) {
            this.state = initialState;
        }

        stepUp(){
            return this.state+1;
        }

        stepDown(){
            return this.state-1;
        }

    }

    test('使用 API `sharing` 返回引用中的 initial 函数进行初始化',()=>{
        const counterRef = sharing((count:number)=>new Counter(count));
        const {agent,connect,disconnect} = create(counterRef.initial(1));
        connect();
        expect(agent.state).toBe(1);
        agent.stepUp();
        expect(agent.state).toBe(2);
        disconnect();
    });

    test('使用 API `weakSharing` 返回引用中的 initial 函数进行初始化',()=>{
        const counterRef = weakSharing((count:number)=>new Counter(count));
        const {agent,connect,disconnect} = create(counterRef.initial(1));
        connect();
        expect(agent.state).toBe(1);
        agent.stepUp();
        expect(agent.state).toBe(2);
        disconnect();
    });

});
```

至此，我们已经了解了 `agent-reducer` 中几乎所有的功能特性，如果想要了解更深入的高级用法，请[继续](/zh/advanced?id=高级用法)一下内容。如果希望直接预览 [API](/zh/api?id=api-文档)，可直接进入 API 章节进行预览，如果希望进一步学习普通用法，建议使用 [use-agent-reducer](https://filefoxper.github.io/use-agent-reducer/#/zh/tutorial)教程。
