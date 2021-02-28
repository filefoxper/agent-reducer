import {Action, createAgentReducer, OriginAgent, Reducer} from "../../../src";

describe("try env usage", () => {
    //simulate a simple redux
    function createStore<S>(reducer: Reducer<S, Action>, initialState: S) {
        let listener: undefined | (() => any) = undefined;
        let state = initialState;
        return {
            dispatch(action: Action) {
                // make a little delay to trigger updating
                Promise.resolve().then(() => {
                    state = reducer(state, action);
                    if (listener) {
                        listener();
                    }
                });
            },
            getState(): S {
                return state;
            },
            subscribe(l: () => any) {
                listener = l;
                l();
                return () => {
                    listener = undefined;
                };
            },
        };
    }

    class CountAgent implements OriginAgent<number | undefined> {

        state = 0;

        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        step(isUp: boolean){
            return isUp ? this.stepUp() : this.stepDown();
        }

        sum = (...counts: number[]): number => {
            return this.state + counts.reduce((r, c): number => r + c, 0);
        };

    }

    test("set env.updateBy to 'manual', 'agent-reducer' will stop its own state updating, and wait for the 'redux' state updating", async () => {
        // create a 'AgentReducer' function, set env.updateBy to 'manual',
        // so 'agent-reducer' will stop its own state updating,
        // and wait for the 'redux' state updating.
        const reducer = createAgentReducer(CountAgent, {updateBy: "manual"});

        const store = createStore(reducer, 1);
        const {agent, update} = reducer;

        const unListen = store.subscribe(() => {
            update(store.getState(), store.dispatch);
        });
        // change agent state
        agent.stepUp();
        // state is not changed, for redux delaying a state updating
        expect(agent.state).toBe(1);
        // make a delay
        await Promise.resolve();
        // state is changed by redux state updating
        expect(agent.state).toBe(2);
        expect(store.getState()).toBe(agent.state);
        unListen();
    });

    it("set env.strict to 'false', 'agent-reducer' will update 'Agent' state immediately", async () => {
        // base at the code before,
        // set env.strict to be 'false'
        const reducer = createAgentReducer(CountAgent, {updateBy: "manual", strict: false});

        const store = createStore(reducer, 1);
        const {agent, update} = reducer;

        const unListen = store.subscribe(() => {
            update(store.getState(), store.dispatch);
        });
        // change agent state
        agent.stepUp();
        // state is changed immediately
        expect(agent.state).toBe(2);
        // redux have not changed state, it is delayed,
        // so, state of 'Agent' object is not equal with 'redux' state now
        expect(store.getState()).not.toBe(agent.state);
        expect(store.getState()).toBe(1);
        // make a delay
        await Promise.resolve();
        // state is equal with redux state now
        expect(agent.state).toBe(2);
        expect(store.getState()).toBe(agent.state);
        unListen();
    });

    it("set env.expired to 'true', 'agent-reducer' will not update 'Agent' state", async () => {
        // base at the code before,
        // we do not set env.expired to be 'true' directly,
        // for 'agent-reducer' will stop updating 'Agent' state at beginning.
        const reducer = createAgentReducer(CountAgent, {updateBy: "manual"});

        const store = createStore(reducer, 1);
        const {agent, update} = reducer;

        const unListen = store.subscribe(() => {
            update(store.getState(), store.dispatch);
        });
        // change agent state
        agent.stepUp();
        // make a delay
        await Promise.resolve();
        // state is equal with redux state now
        expect(agent.state).toBe(2);
        expect(store.getState()).toBe(agent.state);

        // set env.expired to be 'true' now
        reducer.env.expired=true;
        // change agent state again
        agent.stepUp();
        // make a delay again
        await Promise.resolve();
        // env.expired is 'true', so the last change agent state method did not work.
        expect(agent.state).toBe(2);
        expect(store.getState()).toBe(agent.state);
        unListen();
    });

    it("set env.legacy to be 'true', 'agent-reducer' feature will switch to a legacy version feature",()=>{
        // create a 'AgentReducer' function, set env.legacy to 'true'
        const {agent,env,recordChanges} = createAgentReducer(CountAgent, {legacy:true});
        const unRecord=recordChanges();
        agent.step(true);
        const changes=unRecord();
        // In the legacy version 'agent-reducer' method,
        // calling another method may lead another changing.
        // So, it is not safe to call another method in a method.
        expect(changes.length).toBe(2);
        // set env.legacy to 'false'
        env.legacy=false;
        const unRecordUnLegacy=recordChanges();
        agent.step(true);
        const unLegacyChanges=unRecordUnLegacy();
        // In the current version 'agent-reducer' method,
        // calling another method is safe.
        expect(unLegacyChanges.length).toBe(1);
    });

});