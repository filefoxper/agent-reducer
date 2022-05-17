import {act, flow, Flows, strict,experience,create} from "../../src";
import {Model} from "../../index";

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
