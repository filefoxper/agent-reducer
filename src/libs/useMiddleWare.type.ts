import {MiddleWare} from "./global.type";

export type middleWareAbleFunction = ((...args: any[]) => any) & { middleWare?: MiddleWare };