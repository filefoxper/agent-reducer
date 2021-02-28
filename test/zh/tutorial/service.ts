import {FetchParams, FetchResult, PriorLevel, Todo} from "./type";

const simulator = (total: number): Array<Todo> => {

    const simulateByMax = (i: number, max: number) => {
        const s = (i + 1) % max;
        const d = s || max;
        return d.toString().padStart(2, '0');
    };

    return Array.from({length: total}).map((d, i) => {
        return {
            content: `todo ${i}`,
            remindTime: `2021-${simulateByMax(i, 12)}-${simulateByMax(i, 28)} 12:00:00`,
            createTime: '2020-12-12 12:00:00',
            priorLevel: i % 2 ? PriorLevel.NORMAL : PriorLevel.EMERGENCY
        }
    });
}

export const fetchTodoList = (params: FetchParams, total: number = 100): Promise<FetchResult> => {
    const dataSource = simulator(total);
    const {pageSize, currentPage, content, remindRange, priorLevel: pl} = params;
    const contentStarts = (content || '').trim();
    const matches = dataSource.filter(({content, remindTime, priorLevel}) => {
        const contentMatched = contentStarts ? content.startsWith(contentStarts) : true;
        const priorLevelMatched = pl !== undefined ? priorLevel === pl : true;
        const remindTimeMatched = remindRange ?
            new Date(remindRange[0]) < new Date(remindTime!) && new Date(remindTime!) < new Date(remindRange[1]) :
            true;
        return contentMatched && priorLevelMatched && remindTimeMatched;
    });
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return Promise.resolve({content: matches.slice(start, end), total});
}