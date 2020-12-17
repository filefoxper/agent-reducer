import {
    OriginAgent,
    createAgentReducer,
    useMiddleWare,
    useMiddleActions,
    MiddleActions,
    LifecycleMiddleWares, applyMiddleWares, MiddleWarePresets, Runtime, StateProcess
} from "../../src";

describe('agent的方法不能被修改', () => {

    class ObjectAgent implements OriginAgent<{ id: number, name: string }> {

        state = {id: 0, name: ''};

        rename = (name: string) => {
            return {...this.state, name};
        }

    }

    test('修改一个agent的任何方法将会得到一个异常', () => {
        const {agent} = createAgentReducer(ObjectAgent);
        expect(() => {
            agent.rename = (name: string) => {
                return {id: 1, name};
            };
        }).toThrowError();
    });

});

describe('其他reducer管理工具整合可能踩到的坑', () => {

    class ObjectAgent implements OriginAgent<{ id: number, name: string }> {

        state = {id: 0, name: ''};

        rename = (name: string) => {
            return {...this.state, name};
        }

    }

    const store = {
        getState() {
        },
        dispatch() {
        }
    }

    test('在env.updateBy==="auto"时直接调用useStoreSlot，将会得到一个错误信息', () => {
        const {agent, useStoreSlot} = createAgentReducer(ObjectAgent);
        expect(() => {
            useStoreSlot(store);
        }).toThrowError();
    });

    test('在env.updateBy==="auto"时直接调用update，将会得到一个错误信息', () => {
        const {agent, update} = createAgentReducer(ObjectAgent);
        expect(() => {
            update();
        }).toThrowError();
    });

    test('如果和其他reducer管理工具整合在一起，使用recordChanges记录功能，将会得到一个错误信息', () => {
        const {agent, useStoreSlot,recordChanges} = createAgentReducer(ObjectAgent,{updateBy:'manual'});
        useStoreSlot(store);
        expect(() => {
            recordChanges();
        }).toThrowError();
    });

});

describe('不要对一个 origin-agent 使用 useMiddleWare', () => {

    class ObjectAgent implements OriginAgent<{ id: number, name: string }> {

        state = {id: 0, name: ''};

        rename = (name: string) => {
            return {...this.state, name};
        }

    }

    test('对一个 origin-agent 使用 useMiddleWare，将会得到一个错误信息', () => {
        expect(() => {
            useMiddleWare(new ObjectAgent(), LifecycleMiddleWares.takeLatest());
        }).toThrowError();
    });

});

describe('createAgentReducer不能使用LifecycleMiddleWare',()=>{

    class ObjectAgent implements OriginAgent<{ id: number, name: string }> {

        state = {id: 0, name: ''};

        rename = (name: string) => {
            return {...this.state, name};
        }

    }

    test('createAgentReducer使用LifecycleMiddleWare，将会得到一个错误信息',()=>{
        expect(()=>{
            createAgentReducer(ObjectAgent,applyMiddleWares(LifecycleMiddleWares.takeLatest()));
        }).toThrowError();
    });

});

describe('不要修改一个useMiddleWare生成的agent拷贝对象的属性值', () => {

    class ObjectAgent implements OriginAgent<{ id: number, name: string }> {

        state = {id: 0, name: ''};

        props = 1;

        rename = (name: string) => {
            return {...this.state, name};
        }

    }

    test('修改一个useMiddleWare生成的agent拷贝对象的属性值，将会得到一个错误信息', () => {
        const {agent} = createAgentReducer(ObjectAgent);
        const b = useMiddleWare(agent, MiddleWarePresets.takeBlock());
        expect(() => {
            b.props = 2;
        }).toThrowError();
    });

});

describe('不要对一个 origin-agent 使用 useMiddleActions', () => {

    class ObjectAgent implements OriginAgent<{ id: number, name: string }> {

        state = {id: 0, name: ''};

        rename = (name: string) => {
            return {...this.state, name};
        }

    }

    class ObjectBesides extends MiddleActions<ObjectAgent> {

        async asyncRename() {
            const remoteName = await Promise.resolve('abc');
            this.agent.rename(remoteName);
        }

    }

    test('对一个 origin-agent 使用 useMiddleActions，将得到一个错误信息', () => {
        expect(() => {
            useMiddleActions(ObjectBesides,new ObjectAgent());
        }).toThrowError();
    });

});

describe('自定义MiddleWare的时候要注意，MiddleWare的runtime.env属性不允许修改',()=>{

    const customMiddleWare=(runtime:Runtime)=>{
        runtime.env.legacy=true;
        return (next:StateProcess):StateProcess=>{
            return (result:any)=>{
                next(result);
            }
        }
    };

    class ObjectAgent implements OriginAgent<{ id: number, name: string }> {

        state = {id: 0, name: ''};

        props = 1;

        rename = (name: string) => {
            return {...this.state, name};
        }

    }

    test('自定义MiddleWare的时候要注意，修改MiddleWare的runtime.env属性，在使用时将得到一个异常信息', () => {
        const {agent} = createAgentReducer(ObjectAgent);
        const b=useMiddleWare(agent, customMiddleWare);
        expect(() => {
            b.rename('agent');
        }).toThrowError();
    });

});