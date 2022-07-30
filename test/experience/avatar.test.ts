import {Flows, flow, create, effect, experience, avatar} from "../../src";
import {Model} from '../../index';

experience();

describe('how to use global avatar', () => {

    type User = {
        id: number,
        name: string
    };

    type UserListState = {
        source: User[] | null,
        loading: boolean,
    }

    const dataSource: User[] = [
        {id: 1, name: 'Jimmy'},
        {id: 2, name: 'Jacky'},
        {id: 3, name: 'Lucy'},
        {id: 4, name: 'Lily'},
        {id: 5, name: 'Nike'},
    ];

    const prompt = avatar({
        success:(info:string)=>undefined,
        error:(e:any)=>undefined
    });

    class UserListModel implements Model<UserListState> {

        state: UserListState = {
            source: [],
            loading: false,
        };

        private load() {
            return {...this.state, loading: true};
        }

        private changeSource(source: User[] | null) {
            return {...this.state, source};
        }

        private unload() {
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
                // use prompt.current.success to popup a message `fetch success`
                prompt.current.success('fetch success!');
            } catch (e) {
                // use prompt.current.error to popup a error message
                prompt.current.error(e);
            }finally {
                this.unload();
            }
        }

    }

    test('if you want to call outside effect function in model, you can use API `avatar`', async () => {
        const success = jest.fn().mockImplementation((info:string)=>console.log(info));
        // implement the interfaces of prompt avatar
        const destroy = prompt.implement({
            success,
        });
        const {agent, connect, disconnect} = create(UserListModel);
        connect();
        await agent.loadSource();
        expect(success).toBeCalledTimes(1);
        disconnect();
        // if you do not need this avatar,
        // please destroy it finally
        destroy();
    });

});

describe('how to use model avatar', () => {

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

        prompt = avatar({
            success:(info:string)=>undefined,
            error:(e:any)=>undefined
        });

        private load() {
            return {...this.state, loading: true};
        }

        private changeSource(source: User[] | null) {
            return {...this.state,source}
        }

        private unload() {
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
                // use prompt.current.success to popup a message `fetch success`
                this.prompt.current.success('fetch success!');
            } catch (e) {
                // use prompt.current.error to popup a error message
                this.prompt.current.error(e);
            }finally {
                this.unload();
            }
        }

        @flow(Flows.latest())
        async errorLoadSource(){
            this.load();
            try {
                const source: User[] = await new Promise((resolve,reject) => {
                    reject('error');
                });
                this.changeSource(source);
                // use prompt.current.success to popup a message `fetch success`
                this.prompt.current.success('fetch success!');
            } catch (e) {
                // use prompt.current.error to popup a error message
                this.prompt.current.error(e);
            }finally {
                this.unload();
            }
        }

    }

    test('If you want to use `avatar` in model, please build avatar inside model', async () => {
        const success = jest.fn().mockImplementation((info:string)=>console.log(info));

        const {agent, connect, disconnect} = create(UserListModel);
        const {agent:another, connect:anotherConnect, disconnect:anotherDisconnect} = create(UserListModel);
        // implement avatar for different models
        const destroy = agent.prompt.implement({
            success,
        });
        connect();
        anotherConnect();
        await agent.loadSource();
        await another.loadSource();
        // the agent.prompt is implemented with avatar,
        // the another one is not.
        expect(success).toBeCalledTimes(1);
        disconnect();
        anotherDisconnect();
        // if you do not need this avatar,
        // please destroy it finally
        destroy();
    });

    test('You can implement parts of an avatar object at different times.', async () => {
        const success = jest.fn().mockImplementation((info:string)=>console.log(info));
        const error = jest.fn().mockImplementation((info:string)=>console.log(info));

        const {agent, connect, disconnect} = create(UserListModel);
        // implement avatar for different models
        const destroy = agent.prompt.implement({
            success,
        });
        connect();
        await agent.loadSource();
        // the agent.prompt is implemented with avatar,
        // the another one is not.
        expect(success).toBeCalledTimes(1);
        // implements parts of avatar at different times
        agent.prompt.implement({
            error,
        });
        await agent.errorLoadSource();
        await agent.loadSource();
        expect(success).toBeCalledTimes(2);
        expect(error).toBeCalledTimes(1);
        disconnect();
        // if you do not need this avatar,
        // please destroy it finally
        destroy();
    });

});
