
/**
 * Credits for event dispatcher class
 * http://stackoverflow.com/questions/12881212/does-typescript-support-events-on-classes
 */

interface IEventDispatcher<T> {
    on(handler: { (data?: T): void }): void;
    off(handler: { (data?: T): void }): void;
}

export class EventDispatcher<T> implements EventDispatcher<T> {
    private handlers: { (data?: T): void; }[] = [];

    public on(handler: { (data?: T): void }) {
        this.handlers.push(handler);
    }

    public off(handler: { (data?: T): void }) {
        this.handlers = this.handlers.filter(h => h !== handler);
    }

    public trigger(data?: T) {
        this.handlers.slice(0).forEach(h => h(data));
    }
}