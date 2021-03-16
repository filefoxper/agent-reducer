#### sharing(factory)

This api function is used for generating a persistent model. [check concept](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/introduction/concept.md)

```typescript
function sharing<
    S,
    T extends OriginAgent<S> = OriginAgent<S>
    >(
  factory:()=>T|{new ():T},
):{current:T}
```

* factory - a factory callback function for generating a model（class or object）
  
It returns a wrap object which contains a persistent model at property `current`.