import {
    createAgentReducer,
    LifecycleMiddleWares,
    MiddleActions,
    middleWare, MiddleWarePresets,
    useMiddleActions
} from "../../src";
import {OriginAgent} from "../../index";

describe('修补middleActions测试',()=>{

    class CountAgent implements OriginAgent<number> {

        state = 0;

        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        sum = (...counts: number[]): number => {
            return this.state + counts.reduce((r, c): number => r + c, 0);
        };

        @middleWare(MiddleWarePresets.takeLatest())
        async callingStepUpAfterRequest(tms: number) {
            await new Promise((r) => setTimeout(r, tms * 100));
            return this.sum(tms);
        }

    }

    class CountBesides extends MiddleActions<CountAgent> {

        id=1;

        @middleWare(MiddleWarePresets.takeLatestAssignable())
        async callingStepUpAfterRequest(tms: number) {
            await new Promise((r) => setTimeout(r, tms * 100));
            return this.agent.sum(tms);
        }

    }

    test('middle-action一旦获取过，以后将从获取缓存中读取',()=>{
        const {agent} = createAgentReducer(CountAgent);
        const actions = useMiddleActions(CountBesides,agent);
        expect(actions.callingStepUpAfterRequest).toBe(actions.callingStepUpAfterRequest);
        expect(actions.agent).toBe(agent);
    });

});

describe('补全MiddleActions上的MiddleWare测试',()=>{

    class ObjectAgent implements OriginAgent<{ id: number, name: string }> {

        state = {id: 0, name: ''};

        @middleWare(MiddleWarePresets.takeLatestAssignable())
        resetId(id:number){
            return new Promise((resolve)=> {
                setTimeout(function () {
                    resolve({id});
                },id*100);
            });
        }

        rename(name: string) {
            return {name};
        }

    }

    class ObjectMiddleActions extends MiddleActions<ObjectAgent>{

        @middleWare(MiddleWarePresets.takeAssignable())
        async remoteRename(ms:number){
            const name:string=await new Promise((r)=>setTimeout(()=>r('name'+ms),ms*100));
            return this.agent.rename(name);
        }

        remoteId(id:number){
            return this.agent.resetId(id);
        }

    }

    it('MiddleActions的MiddleWare只对MiddleActions有效，对agent无效',async ()=>{
        const {agent}=createAgentReducer(ObjectAgent);
        const actions=useMiddleActions(ObjectMiddleActions,agent);
        await actions.remoteRename(2);
        expect(agent.state.id).toBe(undefined);
        expect(agent.state.name).toBe('name2');
    });

    it('通常MiddleWare加在agent上更好些',async ()=>{
        const {agent}=createAgentReducer(ObjectAgent);
        const actions=useMiddleActions(ObjectMiddleActions,agent);
        const f= actions.remoteId(5);
        const s= actions.remoteId(2);
        await Promise.all([f,s]);
        expect(agent.state.id).toBe(2);
        expect(agent.state.name).toBe('');
    });

});