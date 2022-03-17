import {Model} from "../../index";
import {create, effect, middleWare, MiddleWarePresets} from "../../src";

describe('guard middleWarePresets', () => {

    type User = {
        login?:boolean,
        username?: string,
        password?: string,
        id?: number,
        name?: string,
        lazyTime?: number
    }

    class UserModel implements Model<User> {

        state: User = {};

        login(username: string, password: string, lazyTime: number): User {
            return {username, password, lazyTime};
        }

        logout(lazyTime: number): User {
            return {...this.state,lazyTime};
        }

        @middleWare(MiddleWarePresets.takeUnstableDebounceAssignable(200))
        changeName(name:string){
            return {name};
        }

        @middleWare(MiddleWarePresets.takeLatestAssignable())
        private fetchUser() {
            const {lazyTime, username} = this.state;
            return new Promise((resolve) => setTimeout(() => {
                resolve({id: 1, name: username,login:true, lazyTime: undefined});
            }, lazyTime));
        }

        @middleWare(MiddleWarePresets.takeUnstableBlockAssignable())
        private cleanUser(){
            const {lazyTime} = this.state;
            return new Promise((resolve) => setTimeout(() => {
                resolve({id: undefined, name: undefined,login:false,username:undefined, lazyTime});
            }, lazyTime));
        }

        @effect(()=>UserModel.prototype.login)
        loginEffect() {
            this.fetchUser();
        }

        @effect(()=>UserModel.prototype.logout)
        logoutEffect(){
            this.cleanUser();
        }

    }

    test('takeLatestAssignable', async () => {
        const {agent, connect, disconnect} = create(UserModel);
        connect();
        agent.login('name', '', 200);
        agent.login('name1', '', 100);
        await new Promise((r) => setTimeout(r, 210));
        expect(agent.state).toEqual({
            id: 1,
            name: 'name1',
            username: 'name1',
            password: '',
            lazyTime: undefined,
            login:true
        });
        disconnect();
    });

    test('takeUnstableBlockAssignable', async () => {
        const {agent, connect, disconnect} = create(UserModel);
        connect();
        agent.login('name','',0);
        agent.logout(200);
        agent.logout(2);
        await new Promise((r) => setTimeout(r, 210));
        expect(agent.state.lazyTime).toBe(200);
        expect(agent.state.id).toBe(undefined);
        disconnect();
    });

    test('takeUnstableDebounceAssignable', async () => {
        const {agent, connect, disconnect} = create(UserModel);
        connect();
        agent.login('name','',0);
        await new Promise((r) => setTimeout(r, 20));
        agent.changeName('name1');
        expect(agent.state.name).not.toBe('name1');
        agent.changeName('name2');
        await new Promise((r) => setTimeout(r, 210));
        expect(agent.state.name).toBe('name2');
        disconnect();
    });

});