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

// service 查询条件
export interface FetchParams extends SearchParams{
    readonly currentPage:number,
    readonly pageSize:number
}

// service 返回数据
export interface FetchResult {
    readonly content:Array<Todo>,
    readonly total:number
}
