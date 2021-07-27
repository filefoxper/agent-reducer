#### weakSharing(factory)

This api function is used for generating a weak persistent model. [check concept](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/introduction/concept.md)

```typescript
function weakSharing<
    S,
    T extends OriginAgent<S> = OriginAgent<S>
    >(
  factory: (...args:any[]) => T | { new (): T; },
):{current:T,initial:(...args:any[])=>T}
```

* factory - a factory callback function for generating a model（class or object）
  
It returns a wrap object which contains a weak persistent model at property `current`. When `Agents` from this model are all destroyed, the factory callback generates a new one. Another property function from the object is `initial` , and this function is used to pass params into model, when you need to initial it. The `initial` function always runs when your model hasn't initialed or it has been reseted yet, otherwise it returns the weak persistent model just like `current` .

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

// The `initial` function always runs when your model hasn't initialed or it has been reseted yet,
// otherwise it returns the weak persistent model just like `current` .
const {agent} = createAgentReducer(modelRef.initial({data:...}));

const {agent:ag} = createAgentReducer(modelRef.current);
```