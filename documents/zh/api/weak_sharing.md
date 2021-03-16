#### weakSharing(factory)

用于创建一个弱持久化共享模型。[参考概念](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/introduction/concept.md)

```typescript
function weakSharing<
    S,
    T extends OriginAgent<S> = OriginAgent<S>
    >(
  factory:()=>T|{new ():T},
):{current:T}
```

* factory - 生成共享模型的工厂方法，通过该方法返回一个被共享的模型（class 或 object）
  
该方法返回一个弱持久化共享模型包装，从返回值的 `current` 属性中可取出模型，当模型生成的 `Agent` 代理全被销毁时，模型会通过传入的  factory 工厂方法进行模型重置。