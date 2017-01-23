export declare class EventDispatcher<T> implements EventDispatcher<T> {
    private handlers;
    on(handler: {
        (data?: T): void;
    }): void;
    off(handler: {
        (data?: T): void;
    }): void;
    trigger(data?: T): void;
}
