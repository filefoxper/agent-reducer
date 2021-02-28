# 简单页面模型

我们将创建一个简单的TodoList数据查询页面模型，在开始前，我们应该先搞清楚这个模型需要维护的数据模型。

1. 基础查询条件
2. 列表数据
3. 分页信息

列出数据模型:
```typescript
// 优先级别 : normal, emergency
export enum PriorLevel {
    NORMAL,
    EMERGENCY
}

// 单条列表数据模型
export interface Todo {
    // todo 内容
    readonly content: string,
    // 提醒时间
    readonly remindTime?: string,
    readonly createTime: string,
    // 优先级别
    readonly priorLevel: PriorLevel
}

// 基础查询条件
export interface SearchParams {
    // 匹配 'content'
    readonly content?: string,
    // 匹配 'remindTime'
    readonly remindRange?: [string, string],
    // 匹配 'priorLevel'
    readonly priorLevel?: PriorLevel
}

// 页面数据模型
export interface State {
    // 基础查询条件
    readonly searchParams: SearchParams,
    // 列表数据
    readonly dataSource:Array<Todo>|null,
    // 分页信息
    readonly currentPage:number,
    readonly pageSize:number,
    readonly total:number,
}
```
现在我们可以建立这个模型了，它拥有以下功能：修改基础查询条件，修改分页信息，修改列表数据。当列表请求返回时，可以通过调用`changeDataSource`方法修改`state.dataSource`，通过`changePageInfo`修改`state`中的分页信息。代码如下：

源码位置：[basic.spec.ts](https://github.com/filefoxper/agent-reducer/blob/master/test/zh/tutorial/basic.spec.ts).
```typescript
import {
    applyMiddleWares,
    createAgentReducer,
    middleWare,
    MiddleWarePresets,
    OriginAgent,
    useMiddleWare
} from "agent-reducer";
import {PriorLevel, SearchParams, State, Todo} from "./type";
import {fetchTodoList} from "./service";

describe("一个简单的TodoList查询页面模型", () => {

    const defaultState: State = {
        searchParams: {},
        dataSource: null,
        currentPage: 1,
        pageSize: 10,
        total: 0
    };

    /**
     * TodoList查询页面模型
     */
    class TodoList implements OriginAgent<State> {
        // 设置默认数据
        state = defaultState;

        // 'searchParams.content'修改方法
        changeSearchContent(content?: string): State {
            const {searchParams} = this.state;
            return {...this.state, searchParams: {...searchParams, content}};
        };

        // 'searchParams.remindRange'修改方法
        changeSearchRemindRange(remindRange?: [string, string]): State {
            const {searchParams} = this.state;
            return {...this.state, searchParams: {...searchParams, remindRange}};
        }

        // 'searchParams.priorLevel'修改方法
        changeSearchPriorLevel(priorLevel?: PriorLevel): State {
            const {searchParams} = this.state;
            return {...this.state, searchParams: {...searchParams, priorLevel}};
        }

        // 分页信息修改方法
        changePageInfo(currentPage: number, pageSize: number, total: number): State {
            return {...this.state, currentPage, pageSize, total};
        }

        // 列表修改方法
        changeDataSource(dataSource: Array<Todo>): State {
            return {...this.state, dataSource};
        }

    }

    it("当调用方法 'changeSearchContent'时， state.searchParams 会发生改变", () => {
        const {agent} = createAgentReducer(TodoList);
        const input = 'xxx';
        // 为什么要再包一层callback回调？
        // 我们需要模拟一套web事件环境,
        // 在一个事件中只调用一个`Agent`方法是一个好习惯，它有助于保证模型数据的修改一致性，
        // 不至于出现react hook中state的覆盖现象。
        const handleContentChange = (value: string) => agent.changeSearchContent(value);
        handleContentChange(input);
        expect(agent.state.searchParams.content).toBe(input);
    });


    it("调用 'changePageInfo'、'changeDataSource' 方法可以模拟一个查询返回数据修改过程", async () => {
        const {agent} = createAgentReducer(TodoList);
        const handlePriorLevelChange = (value: PriorLevel) => agent.changeSearchPriorLevel(value);
        // 获取 todoList 数据
        const handleFetchTodoList = async () => {
            const {state: {searchParams, currentPage, pageSize}} = agent;
            // 数据请求发生在'TodoList'模型外部，
            // 这不利于保持模型的完整性。
            const {content, total} = await fetchTodoList({...searchParams, currentPage, pageSize});
            // 在一个事件回调中连续多次调用`Agent`方法不是好现象，
            // 在类似`react hooks`系统中，多次调用`useState`产生的`setState`方法，
            // 容易出现数据覆盖现象，该现象对`use-agent-reducer`也是同样存在的。
            agent.changeDataSource(content);
            agent.changePageInfo(currentPage, pageSize, total);
        };
        // 修改查询参数优先级别
        handlePriorLevelChange(PriorLevel.EMERGENCY);
        // 获取 todoList 数据
        await handleFetchTodoList();
        // 看起来还不错，但其实有不少问题
        expect(agent.state.total).not.toBe(0);
        expect(agent.state.dataSource).not.toBeNull();
    });

});
```
以上代码可以完美的运行在当前`单元测试`环境中，但依然有不少问题：

1. 数据请求发生在'TodoList'模型外部，不利与保持模型的完整性，不利于模型重用。
2. 基础查询条件模型嵌套在主模型中，导致修改基础查询条件困难，需要双重assign。而且在主模型中修改完基础查询条件数据后，条件立即生效，并可以被查询接口使用，没有提交的过程，这会导致用户产生困惑。比如修改完查询条件就点翻页查询，基础条件在没提交的情况下就生效了。 
   
我们将在[下一节](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/tutorial/middle_ware.md)中，通过重构当前模型的方式来解决这两个问题。