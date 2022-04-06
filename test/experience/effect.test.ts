import {flow, create, effect, experience, middleWare, MiddleWarePresets, Flows} from "../../src";
import {Model} from '../../index';

experience();

describe('try decorator effect', () => {

    type User = {
        id: number,
        name: string
    };

    type UserListState = {
        source: User[]|null,
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

        fetchSource() {
            return {...this.state, loading: true};
        }

        changeFilterName(filterName: string) {
            return {...this.state, filterName};
        }

        changeSource(source: User[]|null) {
            return {...this.state, source, list: source};
        }

        finishLoading(){
            return {...this.state,loading: false};
        }

        private filter() {
            const {filterName, source} = this.state;
            const list = source!.filter(({name}) => name.startsWith(filterName));
            return {...this.state, list};
        }

        // listen state changes from special methods.
        @flow(Flows.debounce(200))
        @effect(()=>UserListModel.prototype.changeSource)
        @effect(() => UserListModel.prototype.changeFilterName)
        filterEffect() {
            // if the `filterName` or `source` in state changes,
            // invoke filter to change state.
            // In effect, we can call state change methods to change state.
            // And `this` now is an agent object.
            this.filter();
        }

        // listen state changes from all methods,
        // all the effect method can not be called directly from `agent`,
        // so, make it a `private` method is a good idea.
        @effect('*')
        private async loadingEffect(prevSate: UserListState) {
            const {loading} = this.state;
            if (prevSate.loading === loading ||!loading) {
                return;
            }
            try {
                const source:User[] = await new Promise((resolve)=>{
                    resolve([...dataSource]);
                });
                // fetch source
                this.changeSource(source);
            }finally {
                // after all jobs, we need to set loading to 'false'
                this.finishLoading();
            }

        }

    }

    test('try effect listen to all methods ', async () => {
        const {agent, connect, disconnect} = create(UserListModel);
        connect();
        agent.fetchSource();
        expect(agent.state.loading).toBe(true);
        await new Promise((r)=>setTimeout(r));
        // the `loadingEffect` finally set loading to 'false'
        expect(agent.state.loading).toBe(false);
        disconnect();
    });

    test('try effect listen to a special method', async () => {
        const {agent, connect, disconnect} = create(UserListModel);
        connect();
        agent.fetchSource();
        expect(agent.state.loading).toBe(true);
        await new Promise((r)=>setTimeout(r));
        expect(agent.state.loading).toBe(false);
        agent.changeFilterName('L');
        await new Promise((r)=>setTimeout(r,220));
        // the `filterEffect` filter list by `filter` method
        expect(agent.state.list).toEqual([
            {id: 3, name: 'Lucy'},
            {id: 4, name: 'Lily'},
        ]);
        disconnect();
    });

    test('the method effect can not be used from `agent` directly',()=>{
        const {agent, connect, disconnect} = create(UserListModel);
        connect();
        // the method effect can not be used from `agent` directly
        expect(()=>agent.filterEffect).toThrow();
        disconnect();
    });

    test('the only way to catch error from effect method is use API `flow.error`', async ()=>{
        const {agent, connect, disconnect} = create(UserListModel);
        connect();
        let exception = '';
        // the only way to catch error from effect method is use API `act.error`
        flow.error(agent,(error, methodName)=>{
            exception = `[${methodName}]: ${error.message}`;
        });
        agent.changeSource(null);
        await new Promise((r)=>setTimeout(r,220));
        expect(exception).not.toBe('');
        disconnect();
    });

});
