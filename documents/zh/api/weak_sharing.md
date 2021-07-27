#### weakSharing(factory)

用于创建一个弱持久化共享模型。[参考概念](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/introduction/concept.md)

```typescript
function weakSharing<
    S,
    T extends OriginAgent<S> = OriginAgent<S>
    >(
  factory: (...args:any[]) => T | { new (): T; },
):{current:T,initial:(...args:any[])=>T}
```

* factory - 生成共享模型的工厂方法，通过该方法返回一个被共享的模型（class 或 object）
  
该方法返回一个弱持久化共享模型包装，从返回值的 `current` 属性中可取出模型，当模型生成的 `Agent` 代理全被销毁时，模型会通过传入的 factory 工厂方法进行模型重置；`initial` 属性允许使用者在首次初始化时进行传参。注意只有在agent未初始化或被重置后，初始化才有效，否则  `initial` 直接返回当前已初始化好的模型对象。

```typescript
import {createAgentReducer,weakSharing,OriginAgent} from 'agent-reducer';

class Model implements OriginAgent<State>{

  constructor(param:any){
    this.state = doSomeThing(param);
  }

  method(){
    return doSomeThing(this.state);
  }

}

const modelRef = weakSharing((param:any)=>new Model(param));

// 在需要初始化的地方进行初始化，注意只有在agent未初始化或被重置后，初始化才有效，
// 否则 modelRef.initial({data:...}) 直接返回当前已初始化好的模型对象
const {agent} = createAgentReducer(modelRef.initial({data:...}));

const {agent:ag} = createAgentReducer(modelRef.current);
```