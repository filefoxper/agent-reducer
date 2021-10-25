import {
    create, middleWare, MiddleWarePresets,
} from '../../src';
import {Action, Model} from '../../src/libs/global.type'
import {OriginAgent} from "../../index";

describe('object pattern model',()=>{

    // this is a counter model,
    // we can increase or decrease its state
    const counter={

        state: 0, // initial state

        // consider what the method returns as a next state for model
        increase():number {
            return this.state + 1;
        }

    }

    test('an object with a state property can be a model too',()=>{
        // use create api, you can create an `Agent` object from its `Model`
        const {agent,connect,disconnect} = create(counter);
        // before call the methods,
        // you need to connect it first
        connect();
        // the result returned by method `agent.increase` will be next state
        agent.increase();
        // if there is no more work for `Agent`,
        // you should disconnect it.
        disconnect();
        expect(agent.state).toBe(1);
    });

});

describe('class pattern model',()=>{

    // this is a counter model,
    // we can increase or decrease its state
    class Counter implements Model<number>{

        state: number;

        constructor(){
            // initial state
            this.state = 0;
        }

        // consider what the method returns as a next state for model
        increase():number {
            return this.state + 1;
        }

    }

    test('an class model is simple and classify',()=>{
        // use create api, you can create an `Agent` object from its `Model`
        const {agent,connect,disconnect} = create(Counter);
        // before call the methods,
        // you need to connect it first
        connect();
        // the result returned by method `agent.increase` will be next state
        agent.increase();
        // if there is no more work for `Agent`,
        // you should disconnect it.
        disconnect();
        expect(agent.state).toBe(1);
    });

});

describe('how to use `MiddleWare`',()=>{

    type Todo ={
        content:string,
        status:'new'|'doing'|'done'
    };

    const todoList:Array<Todo> = [
        {content:'create project structure',status:'done'},
        {content:'coding',status:'done'},
        {content:'unit test',status:'doing'},
        {content:'write docs',status:'new'},
    ];

    // this is a to-do list model,
    // we can fetch list from server
    class TodoList implements Model<Array<Todo>>{

        state = [];

        // method fetch returns a promise object,
        // we should use MiddleWare to take the promise resolve data as a new state
        fetch():Promise<Array<Todo>>{
            return new Promise((resolve)=>{
                resolve([...todoList]);
            });
        }

        clear():Promise<Array<Todo>>{
            return new Promise((resolve)=>{
                resolve([]);
            });
        }

    }

    test('do nothing, agent will use the default state taking, that make new state to be a promise',async ()=>{
        const {agent,connect,disconnect} = create(TodoList);
        connect();
        await agent.fetch();
        // the agent.state is changed to be a promise object
        expect(Object.getPrototypeOf(agent.state)).toBe(Promise.prototype);
        disconnect();
    });

    test('use `MiddleWarePresets.takePromiseResolve()` can take the promise resolve data as new state ',async ()=>{
        // create api can accept a MiddleWare param,
        // and all methods from agent will reproduce state with the same MiddleWare feature.
        const {agent,connect,disconnect} = create(TodoList,MiddleWarePresets.takePromiseResolve());
        connect();
        await agent.fetch();
        // the agent.state is changed to be the promise resolve data.
        expect(agent.state).toEqual(todoList);
        await agent.clear();
        // the agent.state is changed to be the promise resolve data.
        expect(agent.state).toEqual([]);
        disconnect();
    })

});

describe('use method decorator `MiddleWare`',()=>{

    type Todo ={
        content:string,
        status:'new'|'doing'|'done'
    };

    const todoList:Array<Todo> = [
        {content:'create project structure',status:'done'},
        {content:'coding',status:'done'},
        {content:'unit test',status:'doing'},
        {content:'write docs',status:'new'},
    ];

    // this is a to-do list model,
    // we can fetch list from server
    class TodoList implements Model<Array<Todo>>{

        state = [];

        // method fetch returns a promise object,
        // we should use MiddleWare to take the promise resolve data as a new state.
        // Use method decorator can reduce the scope of MiddleWare to the exact method you want to effect on.
        @middleWare(MiddleWarePresets.takePromiseResolve())
        fetch():Promise<Array<Todo>>{
            return new Promise((resolve)=>{
                resolve([...todoList]);
            });
        }

        // do nothing, and use the default state taking feature
        clear():Promise<Array<Todo>>{
            return Promise.resolve([]);
        }

    }

    test('use method decorator can reduce the scope of `MiddleWare` to the exact method ',async ()=>{
        const {agent,connect,disconnect} = create(TodoList);
        connect();
        // the method MiddleWare only effect on method `fetch`
        await agent.fetch();
        // the agent.state is changed to be the promise resolve data.
        expect(agent.state).toEqual(todoList);
        // no MiddleWare effect on method `clear`
        await agent.clear();
        // the agent.state is changed to be a promise object
        expect(Object.getPrototypeOf(agent.state)).toBe(Promise.prototype);
        disconnect();
    });

});

describe('use class decorator `MiddleWare`',()=>{

    type Todo ={
        content:string,
        status:'new'|'doing'|'done'
    };

    const todoList:Array<Todo> = [
        {content:'create project structure',status:'done'},
        {content:'coding',status:'done'},
        {content:'unit test',status:'doing'},
        {content:'write docs',status:'new'},
    ];

    // this is a to-do list model,
    // we can fetch list from server.
    // use class decorator to add MiddleWare,
    // can make this MiddleWare effect on all methods in this class
    @middleWare(MiddleWarePresets.takePromiseResolve())
    class TodoList implements Model<Array<Todo>>{

        state = [];

        fetch():Promise<Array<Todo>>{
            return new Promise((resolve)=>{
                resolve([...todoList]);
            });
        }

        clear():Promise<Array<Todo>>{
            return Promise.resolve([]);
        }

    }

    test('use class decorator can make `MiddleWare` effect on all methods in this class ',async ()=>{
        const {agent,connect,disconnect} = create(TodoList);
        connect();
        // the class MiddleWare effect on method `fetch`
        await agent.fetch();
        // the agent.state is changed to be the promise resolve data.
        expect(agent.state).toEqual(todoList);
        // the class MiddleWare effect on method `clear`
        await agent.clear();
        // the agent.state is changed to be the promise resolve data.
        expect(agent.state).toEqual([]);
        disconnect();
    });

});

describe('use model sharing',()=>{

    type Todo ={
        content:string,
        status:'new'|'doing'|'done'
    };

    const todoList:Array<Todo> = [
        {content:'create project structure',status:'done'},
        {content:'coding',status:'done'},
        {content:'unit test',status:'doing'},
        {content:'write docs',status:'new'},
    ];

    // this is a to-do list model,
    // we can fetch list from server.
    // use class decorator to add MiddleWare,
    // can make this MiddleWare effect on all methods in this class
    @middleWare(MiddleWarePresets.takePromiseResolve())
    class TodoList implements Model<Array<Todo>>{

        state = [];

        fetch():Promise<Array<Todo>>{
            return new Promise((resolve)=>{
                resolve([...todoList]);
            });
        }

        clear():Promise<Array<Todo>>{
            return Promise.resolve([]);
        }

    }

    // same `Model instance`
    const todoListInstance = new TodoList();

    test('The `Model class` is just for reuse',async ()=>{
        // we create two listeners `dispatch1` and `dispatch2` for different agent reducer function
        const dispatch1 = jest.fn().mockImplementation((action:Action)=>{
            // the agent action contains a `state` property,
            // this state is what the model state should be now.
            expect(action.state).toEqual(todoList);
        });
        const dispatch2 = jest.fn().mockImplementation((action:Action)=>{
            expect(action.state).toEqual(todoList);
        });
        // same `Model class`
        const {agent:a1,connect:c1,disconnect:d1} = create(TodoList);
        // same `Model class`
        const {agent:a2,connect:c2,disconnect:d2} = create(TodoList);
        // before call the methods,
        // you need to connect it first,
        // you can add a listener to listen the agent action,
        // by using connect function
        c1(dispatch1);
        c2(dispatch2);
        // the a1 just work itself.
        await a1.fetch();
        expect(dispatch1).toBeCalled();     // dispatch1 work
        expect(dispatch2).not.toBeCalled();     // dispatch2 not work
        expect(a1.state).not.toEqual(a2.state);
        d1();
        d2();
    });

    test('The model sharing feature makes state change of `Agents` work synchronously',async ()=>{
        // we create two listeners `dispatch1` and `dispatch2` for different agent reducer function
        const dispatch1 = jest.fn().mockImplementation((action:Action)=>{
            // the agent action contains a `state` property,
            // this state is what the model state should be now.
            expect(action.state).toEqual(todoList);
        });
        const dispatch2 = jest.fn().mockImplementation((action:Action)=>{
            expect(action.state).toEqual(todoList);
        });
        // same `Model instance`
        const {agent:a1,connect:c1,disconnect:d1} = create(todoListInstance);
        // same `Model instance`
        const {agent:a2,connect:c2,disconnect:d2} = create(todoListInstance);
        // before call the methods,
        // you need to connect it first,
        // you can add a listener to listen the agent action,
        // by using connect function
        c1(dispatch1);
        c2(dispatch2);
        // the a1 will notify state change to a2.
        await a1.fetch();
        expect(dispatch1).toBeCalled();     // dispatch1 work
        expect(dispatch2).toBeCalled();     // dispatch2 work
        expect(a1.state).toEqual(a2.state);
        d1();
        d2();
    });

});