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
  
该方法返回一个持久化共享模型包装，从返回值的 `current` 属性中可取出模型。`initial` 属性允许使用者在首次初始化时进行传参。注意只有在agent未初始化或被重置后，初始化才有效，否则  `initial` 直接返回当前已初始化好的模型对象。