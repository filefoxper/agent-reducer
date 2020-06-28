import {Resolver} from "./resolver.type";

export type BranchApi = {
    reject: () => void,
    rebuild: () => void
};

export type BranchResolver = (branchApi: BranchApi) => Resolver;