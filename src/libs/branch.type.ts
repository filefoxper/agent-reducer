export type StateDispatch = <S = any>(nextState: S) => void;

export type ResultProcessor = <R>(result: any, dispatch: StateDispatch, branchApi: BranchApi) => R | void;

export type BranchApiStatus = undefined | 'discarded';

export type BranchApi = {
    getPlugin: () => ResultProcessor,
    discard: () => void,
    getStatus: () => BranchApiStatus
};

export type BranchPlugin = (cache: any) => ResultProcessor;