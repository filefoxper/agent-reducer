# Experience

We have add some experience features and APIs. These features and APIs may be changing in future, and we suppose you try them privately not in your production codes. If you want to use them please set `process.env.AGENT_REDUCER_EXPERIENCE` to `OPEN`, and use [manual compile](/introduction?id=manual-compile) to recompile agent-reducer. Or, you can use API [experience](/api?id=experience) to open it.

## Guides

Sometimes, we want to extract some common codes to be a common method for usage. But, it is not easy to distinguish the action methods (the methods which can update state) and common methods. 

To resolve this problem and support the common methods in model, we add some new decorators.

### Strict and Act

The decorator API `act` marks out the methods which you want to use as action methods, and it will force the model to a strict mode. 

If a model is working in a strict mode, only the methods with decorator `act` can update state.

If you want to force a model to strict mode, you can use class decorator `strict`. It can check out if there are some `act` decorated action methods, and throw error when no `act` decorated method is detected.

```typescript
import {act, flow, Flows, strict,experience,create,Model} from "agent-reducer";

experience();

describe('test of strict',()=>{

    type User = {
        id: number,
        name: string
    };

    type UserListState = {
        source: User[] | null,
        list: User[],
        loading: boolean,
    }

    const dataSource: User[] = [
        {id: 1, name: 'Jimmy'},
        {id: 2, name: 'Jacky'},
        {id: 3, name: 'Lucy'},
        {id: 4, name: 'Lily'},
        {id: 5, name: 'Nike'},
    ];

    test('When use `strict` mode, you have to mark out which `method` can generate a new state',async ()=>{
        @strict()
        class UserListModel implements Model<UserListState> {

            state: UserListState = {
                source: [],
                list: [],
                loading: false,
            };

            // in strict mode,
            // only the method with `act` decorator can generate new state
            @act()
            private load():UserListState {
                return {...this.state, loading: true};
            }

            private changeSource(source: User[]):UserListState {
                return {...this.state,source,list:source};
            }

            private unload():UserListState {
                return {...this.state, loading: false};
            }

            @flow(Flows.latest())
            async loadSource() {
                this.load();
                try {
                    const source: User[] = await new Promise((resolve) => {
                        resolve([...dataSource]);
                    });
                    this.changeSource(source);
                } finally {
                    this.unload();
                }
            }

        }

        const {agent,connect,disconnect} = create(UserListModel);
        connect();
        // only load method is act method,
        // so, only load method can generate new state
        await agent.loadSource();
        expect(agent.state.loading).toBe(true);
        disconnect();
    });

    test('The `act` decorator can lead model to strict automatically',async ()=>{
        // the `act` decorator can lead model to strict automatically
        class UserListModel implements Model<UserListState> {

            state: UserListState = {
                source: [],
                list: [],
                loading: false,
            };

            // in strict mode,
            // only the method with `act` decorator can generate new state
            @act()
            private load():UserListState {
                return {...this.state, loading: true};
            }

            private changeSource(source: User[]):UserListState {
                return {...this.state,source,list:source};
            }

            private unload():UserListState {
                return {...this.state, loading: false};
            }

            @flow(Flows.latest())
            async loadSource() {
                this.load();
                try {
                    const source: User[] = await new Promise((resolve) => {
                        resolve([...dataSource]);
                    });
                    this.changeSource(source);
                } finally {
                    this.unload();
                }
            }

        }

        const {agent,connect,disconnect} = create(UserListModel);
        connect();
        // only load method is act method,
        // so, only load method can generate new state
        await agent.loadSource();
        expect(agent.state.loading).toBe(true);
        disconnect();
    });

    test('In `strict` mode, if there is no `act` decorated method, it will lead to an error',()=>{
        @strict()
        class Counter {

            state = 0;

            increase(){
                return this.state+1;
            }
        }

        const {connect} = create(Counter);
        expect(()=>connect()).toThrow();
    })

})
```

## API

### act

Mark out the action methods, when a model detects there are methods with this decorator, it will force this model to strict working mode.

```typescript
export declare function act():MethodDecoratorCaller;
```

### strict

Mark out a model working in strict model. When the model working in a strict mode, only the methods with `act` decorator can update state. And this decorator can detect if there is any `act` decorated method.

```typescript
export declare function strict():DecoratorCaller;
```
