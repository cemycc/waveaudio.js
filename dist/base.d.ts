export interface IEffect {
    effect: string;
    properties: any;
    indexStart: number;
    indexEnd: number;
    seconds: Array<number>;
}
export interface IFile {
    url: string;
    promise: Promise<ArrayBuffer>;
    buffer: AudioBuffer;
    color: string;
}
export interface IProperties {
    wrapper: HTMLElement | string;
    audioFiles: Array<string> | string;
    audioChannel: number;
    colors: Array<string>;
}
export declare class BaseClass {
    private properties;
    constructor(properties: IProperties, validate?: boolean);
    validateProperties(): void;
    setProperties(extended: BaseClass): void;
    getProperties(): IProperties;
    getDiff(first: Array<any>, second: Array<any>): any[];
    getColorAt(idx: number): string;
}
