# Getting started

## Installation

`agent-reducer`包长期维护于[npm](https://www.npmjs.com/get-npm)包管理系统。 安装最新稳定版`agent-reducer`可以运行如下命令:
```
npm i agent-reducer
```

如果你想要在`react`或`redux`中使用它, 我们推荐使用:

1. [use-agent-reducer](https://www.npmjs.com/package/use-agent-reducer) react hook用来代替`react useReducer`.
2. [use-redux-agent](https://www.npmjs.com/package/use-redux-agent) react hook用来代替`react-redux`.

安装[use-agent-reducer](https://www.npmjs.com/package/use-agent-reducer):
```
npm i use-agent-reducer
```

安装[use-redux-agent](https://www.npmjs.com/package/use-redux-agent):
```
npm i use-redux-agent
```

## OriginAgent

`OriginAgent`作为模型可以写成class或object形式，我们需要对它添加`state`和一些`state`处理方法，让它可以正常通过`createAgentReducer`生成`reducer` function，并从`reducer` function中获取`agent`属性作为代理对象。

普通object模式:
```typescript
import {OriginAgent} from 'agent-reducer';

interface State{
    name?:string,
}

interface Model extends OriginAgent<State>{
    state:State
}

const model:Model={

    state:{}, // 存储持久化数据

    // 用于生成下一个state的方法
    setName( primaryName:string, secondaryName:string ):State {
        const name = `${primaryName}.${secondaryName}`;
        return { ...this.state, name };
    }

}

const agentReducer = createAgentReducer(model);
```
class模式:
```typescript
import {OriginAgent} from 'agent-reducer';

interface State{
    name?:string,
}

class Model implements OriginAgent<State>{

    state:State; // 存储持久化数据

    constructor(){
        this.state = {};
    }

    // 用于生成下一个state的方法
    setName( primaryName:string, secondaryName:string ):State {
        const name = `${primaryName}.${secondaryName}`;
        return { ...this.state, name };
    }

}

const agentReducer = createAgentReducer(new Model());
```
我们推荐使用class模式。

## AgentReducer

`AgentReducer`是模型`OriginAgent`通过调用`createAgentReducer`产生的`reducer` function。作为一个function，`AgentReducer`自带一些非常有用的属性。`agent` 作为最重要的属性，经常被广泛使用，它是连接模型`OriginAgent`和`AgentReducer`的关键，任何改变state的行为都需要通过调用`agent`方法来完成。

创建一个`AgentReducer`:
``` typescript
import {OriginAgent,createAgentReducer} from 'agent-reducer';

interface State{
    name?:string,
}

class Model implements OriginAgent<State>{

    state:State;

    constructor(){
        this.state = {}; // 存储持久化数据
    }

    // 用于生成下一个state的方法
    setName( primaryName:string, secondaryName:string ):State {
        const name = `${primaryName}.${secondaryName}`;
        return { ...this.state, name };
    }

}
// 生成一个'AgentReducer' function
const agentReducer = createAgentReducer(Model);

// 取出代理对象'agent'
const { agent } = agentReducer;

// 调用'agent'方法，生成下一个state
agent.setName('primary','secondary'); 

const name = agent.state.name; // 'primary.secondary'
```

## MiddleWare

`MiddleWare`可以让`agent`变得更灵活，它可以帮助`agent`处理诸如异步返回值(promise)等特殊情况，甚至可以让`agent`方法具有debounce等节流特性。

promise MiddleWare:
``` typescript
import {OriginAgent,createAgentReducer,MiddleWarePresets} from 'agent-reducer';

interface State{
    name?:string,
}

class Model implements OriginAgent<State>{

    state:State;

    constructor(){
        this.state = {}; // 存储持久化数据
    }
    // 这是一个异步方法，返回值是一个promise对象，
    // 如果什么都不做，当这个方法运行结束后，下一个state将变成返回的promise对象
    async fetchName():Promise<State> {
        const name = await Promise.resolve('primary.secondary');
        return { ...this.state, name };
    }

}

// 使用MiddleWarePresets.takePromiseResolve()后， 
// 方法调用产生的结果将在进入MiddleWare系统中通过takePromiseResolve的再加工, 
// promise的resolve值将作为下一个state被更新至agent。
const agentReducer = createAgentReducer(Model,MiddleWarePresets.takePromiseResolve());

// 取出代理对象'agent'
const { agent } = agentReducer;

// 调用'agent'方法，生成下一个state
await agent.fetchName(); 

const name = agent.state.name; // 'primary.secondary'
```
如果你在使用`Babel decorator plugin`，你可以让`MiddleWarePresets.takePromiseResolve()`的使用更简单：
``` typescript
import {OriginAgent,createAgentReducer,middleWare,MiddleWarePresets} from 'agent-reducer';

interface State{
    name?:string,
}

class Model implements OriginAgent<State>{

    state:State;

    constructor(){
        this.state = {}; // 存储持久化数据
    }
    // 这是一个异步方法，返回值是一个promise对象，
    // 如果什么都不做，当这个方法运行结束后，下一个state将变成返回的promise对象，
    // 使用MiddleWarePresets.takePromiseResolve()后， 
    // 方法调用产生的结果将在进入MiddleWare系统中通过takePromiseResolve的再加工, 
    // promise的resolve值将作为下一个state被更新至agent。
    @middleWare(MiddleWarePresets.takePromiseResolve())
    async fetchName():Promise<State> {
        const name = await Promise.resolve('primary.secondary');
        return { ...this.state, name };
    }

}

const agentReducer = createAgentReducer(Model);

// 取出代理对象'agent'
const { agent } = agentReducer;

// 调用'agent'方法，生成下一个state
await agent.fetchName(); 

const name = agent.state.name; // 'primary.secondary'
```
如果希望在处理完promise resolve数据之后再自动与`this.state` assign起来，我们可以使用`MiddleWarePresets.takePromiseResolveAssignable`:
``` typescript
import {OriginAgent,createAgentReducer,middleWare,MiddleWarePresets} from 'agent-reducer';

interface State{
    id:number;
    name?:string,
}

class Model implements OriginAgent<State>{

    state:State;

    constructor(){
        this.state = {id:0}; // 存储持久化数据
    }
    // takePromiseResolveAssignable在处理完promise resolve数据后，
    // 继续将resolve数据和this.state assign起来，成为下一个state
    @middleWare(MiddleWarePresets.takePromiseResolveAssignable())
    async fetchName():Promise<State> {
        const name = await Promise.resolve('primary.secondary');
        return { name };
    }

}

const agentReducer = createAgentReducer(Model);

// 取出代理对象'agent'
const { agent } = agentReducer;

// 调用'agent'方法，生成下一个state
await agent.fetchName(); 

const name = agent.state.name; // 'primary.secondary'
```
每个`MiddleWare`都有自己的特性，专注单一，如果把各种不同功能的`MiddleWare`连接在一起，它们的特性也将串行的工作起来，比如：`MiddleWarePresets.takePromiseResolveAssignable()`，它是由`MiddleWares.takePromiseResolve()`,`MiddleWares.takeAssignable()`这两个`MiddleWare`串行连接而成的`MiddleWare`。它的最终特性为：先处理promise resolve结果，然后提交给assignable做与当前state的合并处理。我们在之后会介绍如何串行多个`MiddleWare`，以及如何写一个自己的`MiddleWare`，当然目前`MiddleWarePresets`所提供的`MiddleWare`特性已经非常丰富了，可以直接拿来使用。

[下一节，快速教程](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/tutorial/intro.md)