import {Action, createAgentReducer, DefaultActionType, OriginAgent, Reducer} from "../src";
import {ClassifyQueryState, Form, Position, Record, RequestParams} from "./testType";
import {fetchData} from "./testService";

const getDefaultClassifyQueryState = (): ClassifyQueryState => ({
    form: {
        name: '',
        position: Position.USER
    },
    loading: false,
    list: null,
    page: 1,
    size: 3
});

class ClassifyQueryAgent implements OriginAgent<ClassifyQueryState> {

    effectiveForm: Form = getDefaultClassifyQueryState().form;

    state: ClassifyQueryState = getDefaultClassifyQueryState();

    private handleFormChange(formLike: { name?: string, position?: Position }) {
        const {form} = this.state;
        const newForm = {...form, ...formLike};
        return {...this.state, form: newForm};
    }

    private loadingBeforeQuery() {
        return {...this.state, loading: true};
    }

    //this function return a state, and it will dispatch a next state to change the state in store or something remains reducer state.
    public handleFormNameChange(name: string) {
        //before this.handleFormChange running, the agent has hold a parent dispatch function for it,
        // so this.handleFormChange here will not run dispatch. it just compute the next state for it's parent 'handleFormNameChange'
        this.handleFormChange({name});
    }

    public handleFormPositionChange(position: Position) {
        this.handleFormChange({position});
    }

    private handleResultChange(list: Array<Record>, page: number, size: number) {
        return {...this.state, loading: false, list, page, size};
    }

    //this function returns a promise, so it will not be a dispatch function, but it can deploy dispatch functions to change next state.
    public async handlePageChange(page: number, size: number) {
        this.loadingBeforeQuery();
        const requestParams: RequestParams = {...this.effectiveForm, page, size};
        const {list, page: p, size: s} = await fetchData(requestParams);
        this.handleResultChange(list, p, s);
    }

    //this function returns void, so it will not be a dispatch function, but it can deploy dispatch functions or other functions to change next state.
    public handleQueryClick() {
        this.effectiveForm = this.state.form;
        this.handlePageChange(1, 10);
    }

}

describe('classify query test without update', () => {

    const agent = createAgentReducer(ClassifyQueryAgent).agent;

    //let's make agent work
    test('handleFormChange', () => {
        agent.handleFormNameChange('Jimm');
        agent.handleFormPositionChange(Position.MASTER);
        expect(agent.effectiveForm).toEqual({name: '', position: Position.USER});
        expect(agent.state.form).toEqual({name: 'Jimm', position: Position.MASTER});
    });

    test('handleQueryClick', () => {
        agent.handleQueryClick();
        expect(agent.state.loading).toBe(true);
        expect(agent.effectiveForm).toEqual(agent.state.form);
        setTimeout(() => {
            expect(agent.state.list.length).toBe(3);
            expect(agent.state.loading).toBe(false);
        });
    });

    test('handlePageChange', async () => {
        await agent.handlePageChange(2, 3);
        expect(agent.state.page).toBe(2);
        expect(agent.state.size).toBe(3);
        expect(agent.state.list.length).toBe(1);
    });

});

describe('record state', () => {

    const reducer = createAgentReducer<ClassifyQueryState, ClassifyQueryAgent>(ClassifyQueryAgent);

    const agent = reducer.agent;

    test('handlePageChange', async () => {
        const unRecord = reducer.recordStateChanges();
        await agent.handlePageChange(2, 3);
        const [loadingRecord, resultChangeRecord] = unRecord();
        expect(loadingRecord.state.loading).toBe(true);
        expect(resultChangeRecord.state.loading).toBe(false);

    });

});

describe('classify query test with env.updateBy `manual`', () => {

    //We create a simple outside store, and make the reducer work with this store.
    function createStore<S>(reducer: Reducer<S, Action>, initialState: S) {
        let listener = undefined;
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
            subscribe(l) {
                listener = l;
                return () => {
                    listener = undefined;
                }
            }
        }
    }

    //open manual mode by env.updateBy='manual'
    const reducer = createAgentReducer<ClassifyQueryState, ClassifyQueryAgent>(ClassifyQueryAgent, {updateBy: 'manual'});

    //update state to store after the agentReducer run.
    const store = createStore<ClassifyQueryState>(reducer, reducer.initialState);

    const agent = reducer.agent;

    //without using reducer.update, because we have opened updateBy:'manual', so the dispatch functions can not work auto now.
    test('handleFormChange without update', () => {
        agent.handleFormNameChange('Jimm');
        agent.handleFormPositionChange(Position.MASTER);
        expect(agent.state.form).toEqual({name: '', position: Position.USER});
    });

    //using reducer.update in store.subscribe listener, the dispatch will work by store.dispatch, and the store.getState() will be a next state for agent.
    test('handleFormChange with update', () => {
        const listener = () => reducer.update(store.getState(), store.dispatch);
        const unsubscribe = store.subscribe(listener);
        listener();

        agent.handleFormNameChange('Jimm');
        agent.handleFormPositionChange(Position.MASTER);
        expect(agent.state.form).toEqual({name: 'Jimm', position: Position.MASTER});
        expect(agent.state.form).toEqual(store.getState().form);
        unsubscribe();
    });

    test('initial state ', () => {
        const listener = () => reducer.update(store.getState(), store.dispatch);
        const unsubscribe = store.subscribe(listener);
        listener();

        store.dispatch({type: DefaultActionType.DX_INITIAL_STATE, args: getDefaultClassifyQueryState()});
        expect(agent.state).toEqual(getDefaultClassifyQueryState());

        unsubscribe();
    });

    test('dispatch no matches', () => {
        const listener = () => reducer.update(store.getState(), store.dispatch);
        const unsubscribe = store.subscribe(listener);
        listener();

        store.dispatch({type: DefaultActionType.DX_INITIAL_STATE, args: getDefaultClassifyQueryState()});
        store.dispatch({type: 'nothing', args: {}});
        expect(agent.state).toEqual(getDefaultClassifyQueryState());

        unsubscribe();
    });

    test('only updateBy:`auto` can record state changes', async () => {
        try{
            const unRecord = reducer.recordStateChanges();
            await agent.handlePageChange(2, 3);
            const [loadingRecord, resultChangeRecord] = unRecord();
            expect(loadingRecord.state.loading).toBe(true);
            expect(resultChangeRecord.state.loading).toBe(false);
        }catch (e) {
            expect(e.message.toString().includes('auto')).toBe(true);
        }

    });

});

describe('classify query test env.expired', () => {

    const reducer = createAgentReducer(ClassifyQueryAgent);

    const agent = reducer.agent;

    test('handleQueryClick', () => {
        //The first micro task will be run before other promise, but after the main callback `agent.handleQueryClick`,
        //So before the change about list,page,size,loading happening, the env.expired is true, then the rest dispatches can not work effective.
        new Promise((resolve) => {
            resolve();
        }).then(() => {
            reducer.env.expired = true;
        });
        agent.handleQueryClick();
        expect(agent.state.loading).toBe(true);
        expect(agent.effectiveForm).toEqual(agent.state.form);
        setTimeout(() => {
            //because the env.expired stop the rest dispatches, the loading state should keep true.
            expect(agent.state.loading).toBe(true);
        });
    });
});

class Counter implements OriginAgent<number> {

    state = 0;

    constructor(state: number) {
        this.state = state;
    }

    private addOne() {
        return this.state + 1;
    }

    private addOneFrom(state: number) {
        return state + 1;
    }

    public addTwice() {
        this.addOne();
        this.addOne();
    }

}

describe('agent test', () => {

    test('agent state outside change', () => {
        try {
            const agent = createAgentReducer(new Counter(0)).agent;
            agent.state = 2;
        } catch (e) {
            expect(e.message.toString().includes('proxy')).toBe(true);
        }

    });

});

class Json implements OriginAgent {

    state = {};

    parse(data: string) {
        return JSON.parse(data);
    }

}

describe('test error', () => {

    test('error parser', () => {
        try {
            const agent = createAgentReducer(Json).agent;
            agent.parse('{a:1')
        } catch (e) {
            expect(e.message).toBeTruthy();
        }

    });

});