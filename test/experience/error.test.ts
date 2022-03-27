import {create, effect, middleWare, MiddleWarePresets, subscribeError} from "../../src";
import {Model} from '../../index';

describe('subscribe error',()=>{

    type User = {
        id?:number,
        username:string,
        role?:'master'|'user'|'guest',
        password?:string
        name?:string,
        age?:number,
        sex?:'male'|'female'
    };

    class UserModel implements Model<User>{

        state:User = {
            username:'guest'
        };

        login(username:string,password:string):User{
            return {username,password};
        }

        loginSuccess(user:User):User{
            return user;
        }

        @middleWare(MiddleWarePresets.takePromiseResolve())
        modifyPassword(oldPassword:string){
            const {username} = this.state;
            return new Promise((resolve, reject)=>{
                if(username=='nike'&&oldPassword==='123'){
                    resolve({id:1,username:'nike',name:'nick',age:18,sex:'male',role:'guest'});
                }else{
                    reject('error username or password');
                }
            });
        }

        @effect(()=>UserModel.prototype.login)
        async loginEffect(prevState:User){
            const {username,password} = this.state;
            const user:User = await new Promise((resolve, reject)=>{
                if(username=='nike'&&password==='123'){
                    resolve({id:1,username:'nike',name:'nick',age:18,sex:'male',role:'guest'});
                }else{
                    reject('error username or password');
                }
            });
            this.loginSuccess(user);
        }

    }

    test('try error username, and catch error by use API `subscribeError`',async ()=>{
        const {agent, connect, disconnect} = create(UserModel);
        connect();
        let exception:string='';
        subscribeError(agent,(error,methodName)=>{
            exception = `error from method "${methodName}":${error}`;
        });
        agent.login('nik','123');
        await new Promise((resolve)=>setTimeout(resolve));

        expect(exception).toBe(`error from method "loginEffect":error username or password`);
        disconnect();
    });

    test('try error method',async ()=>{
        const {agent, connect, disconnect} = create(UserModel);
        connect();
        let exception:string='';
        subscribeError(agent,(error,methodName)=>{
            exception = `error from method "${methodName}":${error}`;
        });
        agent.login('nike','123');
        await Promise.resolve();
        await agent.modifyPassword('12');

        expect(exception).toBe(`error from method "modifyPassword":error username or password`);
        disconnect();
    });

    test('try unsubscribeError',async ()=>{
        const {agent, connect, disconnect} = create(UserModel);
        connect();
        let exception:string='';
        const unsubscribe = subscribeError(agent,(error,methodName)=>{
            exception = `error from method "${methodName}":${error}`;
        });
        agent.login('nike','123');
        await Promise.resolve();
        unsubscribe();
        try {
            await agent.modifyPassword('12');
        }catch (e) {
            expect(e).toBe('error username or password');
        }
        expect(exception).toBe('');
        disconnect();
    });
})