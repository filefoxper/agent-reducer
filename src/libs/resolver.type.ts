export type ResultProcessor=(result:any)=>any;

export type NextLink=(next:ResultProcessor)=>ResultProcessor;

export type Resolver=(cache:any)=>NextLink|void;