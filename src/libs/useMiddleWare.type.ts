import { MiddleWare } from "./global.type";

export type MiddleWareAbleFunction = ((...args: any[]) => any) & {
  middleWare?: MiddleWare;
};
