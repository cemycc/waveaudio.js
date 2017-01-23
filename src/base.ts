import * as randomColor from '../node_modules/randomcolor/randomColor.js';

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

export class BaseClass {
    private properties: IProperties;

    constructor(properties: IProperties, validate?: boolean) {
        this.properties = properties;
        if (validate) {
            this.validateProperties();
        }
    }

    public validateProperties() {
        if (typeof this.properties.wrapper === "string") {
            this.properties.wrapper = <HTMLElement> document.querySelector(<string> this.properties.wrapper);
            if (!this.properties.wrapper) {
                throw new Error("No wrapper element was found");
            }
        } else if (!(this.properties.wrapper instanceof HTMLElement)) {
            throw new Error("Invalid wrapper element");
        }

        if (typeof this.properties.audioFiles !== "string" && !(this.properties.audioFiles instanceof Array)) {
            throw new Error("Invalid data for audio files");
        }
        this.properties.audioFiles = [].concat(this.properties.audioFiles);
    }

    public setProperties(extended: BaseClass) {
        for (let prop in this.properties) {
            if (extended.hasOwnProperty(prop) && this.properties.hasOwnProperty(prop)) {
                extended[prop] = this.properties[prop];
            }
        }
    }

    public getProperties(): IProperties {
        return this.properties;
    }

    public getDiff(first: Array<any>, second: Array<any>) {
        return first.filter((i) => second.indexOf(i) < 0);
    }

    public getColorAt(idx: number): string {
        if ((this.properties.colors instanceof Array) && this.properties.colors[idx]) {
            return this.properties.colors[idx];
        } else {
            return randomColor({luminosity: 'light'});
            //return '#' + Math.floor(Math.random()*16777215).toString(16);
        }
    }
}
