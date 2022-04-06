import {Flows,flow, create, effect, experience} from "../../src";
import {Model} from '../../index';

experience();

describe('how to use act', () => {

    type User = {
        id: number,
        name: string
    };

    type UserListState = {
        source: User[] | null,
        list: User[],
        filterName: string,
        loading: boolean,
    }

    const dataSource: User[] = [
        {id: 1, name: 'Jimmy'},
        {id: 2, name: 'Jacky'},
        {id: 3, name: 'Lucy'},
        {id: 4, name: 'Lily'},
        {id: 5, name: 'Nike'},
    ];

    class UserListModel implements Model<UserListState> {

        state: UserListState = {
            source: [],
            list: [],
            filterName: '',
            loading: false,
        };

        private load() {
            return {...this.state, loading: true};
        }

        private changeFilterName(filterName: string) {
            return {...this.state, filterName};
        }

        private changeSource(source: User[] | null) {
            const {filterName} = this.state;
            return this.filterList(source || [], filterName);
        }

        private unload() {
            return {...this.state, loading: false};
        }

        private filterList(source: User[], filterName: string) {
            const list = source!.filter(({name}) => name.startsWith(filterName));
            return {...this.state, source, filterName, list};
        }

        // use `Flows` to set a debounce work flow
        @flow(Flows.debounce(200))
        private filterDebounce() {
            const {source, filterName} = this.state;
            this.filterList(source || [], filterName);
        }

        // use decorator flow to make a flow method
        @flow(Flows.latest())
        async loadSource() {
            // flow method can call action method to change state,
            // and make `state.loading` to be `true`.
            this.load();
            try {
                // fetch users from remote service
                const source: User[] = await new Promise((resolve) => {
                    resolve([...dataSource]);
                });
                // flow method can call action method to change state,
                // and change source
                this.changeSource(source);
            } finally {
                // after all jobs, we need to set loading to 'false'
                this.unload();
            }
        }

        @flow()
        changeFilterNameThenFilter(filterName:string){
            this.changeFilterName(filterName);
            // the flow method called by others,
            // can not keep its own `WorkFlow`,
            // it shares a new `WorkFlow` from the current one.
            this.filterDebounce();
        }

        @flow()
        changeFilterNameThenFilterDebounce(filterName:string){
            this.changeFilterName(filterName);
            // `flow.on` can keep `WorkFlow` inside the flow method.
            flow.on(this).filterDebounce();
        }

    }

    test('try flow method, it can organize action methods together as a work flow', async () => {
        const {agent, connect, disconnect} = create(UserListModel);
        const changes: string[] = [];
        connect((action) => {
            changes.push(action.type);
        });
        // there are 3 action methods: load, changeSource, unload
        await agent.loadSource();
        expect(agent.state.source).toEqual(dataSource);
        expect(changes.length).toBe(3);
        disconnect();
    });

    test('An flow method can call another one with the same `WorkFlow`', async () => {
        const {agent, connect, disconnect} = create(UserListModel);
        const changes: string[] = [];
        connect(({state}) => {
            changes.push(state);
        });
        await agent.loadSource();
        agent.changeFilterNameThenFilter('Lucy');
        agent.changeFilterNameThenFilter('Lily');
        await new Promise((resolve) => setTimeout(resolve,500));

        expect(changes.length).toBe(7);
        expect(agent.state.list).toEqual([{id: 4, name: 'Lily'}]);
        disconnect();
    });

    test('An flow method can call another one, if we want to keep the origin `WorkFlow` of the inside one, we can use API `flow.on`', async () => {
        const {agent, connect, disconnect} = create(UserListModel);
        const changes: string[] = [];
        connect(({state}) => {
            changes.push(state);
        });
        await agent.loadSource();
        agent.changeFilterNameThenFilterDebounce('Lucy');
        agent.changeFilterNameThenFilterDebounce('Lily');
        await new Promise((resolve) => setTimeout(resolve, 500));

        expect(changes.length).toBe(6);
        expect(agent.state.list).toEqual([{id: 4, name: 'Lily'}]);
        disconnect();
    });

});

describe('try `flow.on` in effect method', () => {

    type User = {
        id?: number,
        username: string,
        role?: 'master' | 'user' | 'guest',
        password?: string
        name?: string,
        age?: number,
        sex?: 'male' | 'female'
    };

    class UserModel implements Model<User> {

        state: User = {
            username: 'guest'
        };

        changeUserName(username: string) {
            return {...this.state, username};
        }

        updateUser(user: User): User {
            return user;
        }

        @flow(Flows.debounce(200))
        async fetchUser(username: string) {
            const user: User = await new Promise((resolve, reject) => {
                setTimeout(() => {
                    resolve({
                        id: 1,
                        username: username,
                        name: username,
                        role: 'user',
                        age: 20
                    } as User);
                });
            });
            this.updateUser(user);
        }

        @effect(() => UserModel.prototype.changeUserName)
        effectOfKeyUsername() {
            flow.on(this).fetchUser(this.state.username);
        }

    }

    test('The API `flow.on` works in `@effect` too', async () => {
        const {agent, connect, disconnect} = create(UserModel);
        const nameChanges: string[] = [];
        connect(({state}) => {
            if (!state.name) {
                return;
            }
            nameChanges.push(state.name);
        });
        agent.changeUserName('a');
        agent.changeUserName('ab');
        await new Promise((resolve) => setTimeout(resolve, 300));

        expect(nameChanges).toEqual(['ab']);
        disconnect();
    });

});
