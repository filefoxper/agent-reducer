import {createAgentReducer} from "../../../src";
import {Action, OriginAgent, Reducer} from "../../../index";

describe("use with other reducer tools", () => {
    //simulate a simple redux
    function createStore<S>(reducer: Reducer<S, Action>, initialState: S) {
        let listener: undefined | (() => any) = undefined;
        let state = initialState;
        return {
            dispatch(action: Action) {
                state = reducer(state, action);
                if (listener) {
                    listener();
                }
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

    class CountAgent implements OriginAgent<number> {

        state = 0;

        stepUp = (): number => this.state + 1;

        stepDown = (): number => this.state - 1;

        step = (isUp: boolean) => (isUp ? this.stepUp() : this.stepDown());

        sum = (...counts: number[]): number => {
            return this.state + counts.reduce((r, c): number => r + c, 0);
        };

    }

    test("use update function to update the state and dispatch function from simple redux", () => {
        // create a 'AgentReducer' function.
        // And if we want the 'AgentReducer' function working with 'redux',
        // please set env.updateBy to 'manual',
        // so 'agent-reducer' will stop its own state updating,
        // and wait for the 'redux' state updating.
        const reducer = createAgentReducer(CountAgent, { updateBy: "manual" });
        // 'AgentReducer' function is a reducer function,
        // so, it can be used with reducer tool as 'redux'.
        // creating a store by using 'createStore',
        // and this store object has interface function 'getState', 'dispatch' and 'subscribe'
        const store = createStore(reducer, reducer.agent.state);
        const { agent, update } = reducer;
        // use store.subscribe to listen 'redux' running
        const unListen = store.subscribe(() => {
            // when 'redux' run 'AgentReducer',
            // update state by using 'getState' interface,
            // and do not forget to provide the dispatch function too.
            update(store.getState(), store.dispatch);
        });
        // change agent state
        agent.stepUp();
        // state changed
        expect(agent.state).toBe(1);
        // state in 'redux' store changed too,
        // and it is equal with agent state,
        // or it is better to say agent state is changed by redux 'state'
        expect(store.getState()).toBe(agent.state);
        // do not forget unListen to 'redux'
        unListen();
    });

});