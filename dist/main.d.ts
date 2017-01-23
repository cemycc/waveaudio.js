import { IProperties, IFile, IEffect, BaseClass } from "./base";
import { Property } from "./effects.data";
export declare class WaveAudioJS extends BaseClass {
    private audioCtx;
    private canvasCtx;
    private effectsStore;
    constructor(properties: IProperties);
    files(files: Array<string>): void;
    readonly loadedFiles: IFile[];
    readonly effects: Array<IEffect>;
    readonly effectsList: {
        Gain: {
            properties: Property[];
            description: string;
        };
        Panner: {
            properties: Property[];
            description: string;
        };
        Tremolo: {
            properties: Property[];
            description: string;
        };
        Chorus: {
            properties: Property[];
            description: string;
        };
        Phaser: {
            properties: Property[];
            description: string;
        };
        Overdrive: {
            properties: Property[];
            description: string;
        };
        Delay: {
            properties: Property[];
            description: string;
        };
        Compressor: {
            properties: Property[];
            description: string;
        };
        Bitcrusher: {
            properties: Property[];
            description: string;
        };
        MoogFilter: {
            properties: Property[];
            description: string;
        };
    };
    addEffect(type: string, start: number, end: number): boolean;
    removeEffect(effect: IEffect): boolean;
    applyEffect(effect: IEffect): void;
    playAudio(startAt?: number, callback?: Function): void;
    stopAudio(): void;
    readonly duration: number;
    readonly sampleRate: number;
    getLengthAt(url: string): number;
    getAudioFileDuration(url: string): number;
    private render(audioBuffer);
    private addFiles(filesNames);
    private sendRequest(fileURL, fileIdx);
}
