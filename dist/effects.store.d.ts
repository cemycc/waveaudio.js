import { IEffect } from "./base";
import { AudioBufferContext } from "./audio.context";
export declare class EffectsStore {
    private effects;
    private audioCtx;
    private totalLoadedFiles;
    constructor(activeChannel: number, audioCtx: AudioBufferContext);
    get(): Array<IEffect>;
    add(type: string, start: number, end: number): boolean;
    apply(): void;
    remove(effect: IEffect, changeBuffer?: boolean): boolean;
    private sync();
    private calculateSeconds(startIndex, endIndex);
    private getSecondsInterval();
    private applyEffectPerSecond(start, end);
    private effectsForSecond(second, tuna);
}
