import {useMiddleWare} from './useMiddleWare';
import {LifecycleMiddleWares} from "./lifecycleMiddleWares";
import {MiddleWares} from "./middleWares";

/**
 * @deprecated
 */
export const branch = useMiddleWare;

/**
 * @deprecated
 */
export class BranchResolvers {

    static takeLatest = LifecycleMiddleWares.takeLatest;

    static takeBlock = MiddleWares.takeBlock;

    static takeLazy = MiddleWares.takeLazy;

}

