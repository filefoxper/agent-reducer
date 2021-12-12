import { Action, OriginAgent } from './global.type';

export type Factory<
    S,
    T extends OriginAgent<S> = OriginAgent<S>
    > = (...args:any[])=>T|{new ():T};

export type Ref<
    S,
    T extends OriginAgent<S> = OriginAgent<S>,
    > = {
    current: T | null,
    initial?: Factory<S, T>
}

export type SharingRef<
    S,
    T extends OriginAgent<S>= OriginAgent<S>,
    > = {
    current:T,
    initial:Factory<S, T>
}

export type ModelConnector<
    S,
    T extends OriginAgent<S> = OriginAgent<S>
    > = {
    connect:(l:(s:S)=>any)=>void,
    notify:(action:Action, dispatch:(ac:Action)=>void)=>void,
    disconnect:()=>void,
}
