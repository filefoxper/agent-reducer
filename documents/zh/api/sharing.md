#### sharing(factory)

用于创建一个持久化共享模型。[参考概念](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/introduction/concept.md)

```typescript
function sharing<
    S,
    T extends OriginAgent<S> = OriginAgent<S>
    >(
  factory:()=>T|{new ():T},
):{current:T}
```

* factory - 生成共享模型的工厂方法，通过该方法返回一个被共享的模型（class 或 object）
  
该方法返回一个持久化共享模型包装，从返回值的 `current` 属性中可取出模型。