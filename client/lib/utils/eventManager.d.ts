export declare class EventManager {
    #private;
    constructor();
    on: (eventName: string, event: Function) => boolean;
    emit: (eventName: string, value: any) => boolean;
    asyncEmit: (eventName: string, value: any) => Promise<boolean>;
}
