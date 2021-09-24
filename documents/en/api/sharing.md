#### sharing(factory)

This api function is used for generating a persistent model. [check concept](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/introduction/concept.md)

```typescript
function sharing<
    S,
    T extends OriginAgent<S> = OriginAgent<S>
    >(
       factory: (...args:any[]) => T | { new (): T; },
     ):{current:T,initial:(...args:any[])=>T}
```

* factory - a factory callback function for generating a model（class or object）
  
It returns a wrap object which contains a persistent model at property `current`. Another property function from the object is `initial` , and this function is used to pass params into model, when you need to initial it. The `initial` function always runs when your model hasn't initialed or it has been reseted yet, otherwise it returns the weak persistent model just like `current` .