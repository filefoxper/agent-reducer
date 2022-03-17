import {Action, MiddleWare, Model, Runtime, StateProcess} from "../../index";
import {create, middleWare} from "../../src";

export function takeReactive(): MiddleWare {
    return function reactiveMiddleWare<T>(runtime: Runtime<T>) {
        let nextCallback: null | ((state: any) => any) = null;
        let cache: null | { state: any } = null;
        runtime.mapModel({
            get(target: T, p: PropertyKey, receiver: any): any {
                const value = target[p as keyof T];
                if (p === 'state') {
                    return cache ? cache.state : value;
                }
                return value;
            },
            set(target: T, p: PropertyKey, value: any, receiver: any): boolean {
                if (p === 'state') {
                    cache = cache || {state: value};
                    if (nextCallback) {
                        nextCallback(cache.state);
                        cache = null;
                    }
                }
                return true;
            }
        });
        return function nextProcess(next: StateProcess) {
            nextCallback = next;
            return function stateProcess(result: any) {
                if (cache) {
                    next(cache.state);
                    cache = null;
                }
                return result;
            };
        };
    };
}

describe('reactive', () => {

    type UserState = {
        id?: number,
        name?: string,
        errorName?: { name: string },
        sex?: 'male' | 'female',
        age?: number
    }

    @middleWare(takeReactive())
    class User implements Model<UserState> {

        state: UserState = {};

        async fetchById(id: number) {
            this.state = {id};
            const name = await Promise.resolve('xiao.M');
            this.state = {id, name};
            const age = await Promise.resolve(24);
            this.state = {id, name, age};
            const sex: 'male' | 'female' = await Promise.resolve('male');
            this.state = {id, name, age, sex};
        }

        errorChange() {
            this.state = {...this.state, name: this.state.errorName!.name};
        }

    }

    test('try reactive', async () => {
        const processStates: UserState[] = [];
        const dispatch = (action: Action) => {
            processStates.push(action.state);
        }
        const basic = {
            name: 'xiao.M',
            age: 24,
            sex: 'male',
        }
        const {agent, connect, disconnect} = create(User);
        connect(dispatch);
        await agent.fetchById(2);
        expect(processStates).toEqual([
            {id: 2},
            {id: 2, name: 'xiao.M'},
            {id: 2, name: 'xiao.M', age: 24},
            {id: 2, name: 'xiao.M', age: 24, sex: 'male'},
        ]);
        expect(agent.state).toEqual({...basic, id: 2});
        disconnect();
    });

    test('try error',()=>{
        const {agent, connect, disconnect} = create(User);
        connect();
        expect(()=>agent.errorChange()).toThrow();
        disconnect();
    });

});