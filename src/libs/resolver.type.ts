import {CallerCache} from "./reducer.type";

export type ResultProcessor=(result:any)=>any;

export type NextLink=(next:ResultProcessor)=>ResultProcessor;

export type Resolver=(cache:CallerCache)=>NextLink|void;