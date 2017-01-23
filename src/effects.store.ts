import {IEffect, IFile} from "./base";
import {AudioBufferContext} from "./audio.context";
import {Effects, Property} from "./effects.data";

import * as Tuna from '../node_modules/tunajs/tuna.js';

export class EffectsStore {
    private effects: Array<IEffect> = [];
    private audioCtx: AudioBufferContext;
    private totalLoadedFiles: number = 0;
    constructor(activeChannel: number, audioCtx: AudioBufferContext) {
        this.audioCtx = audioCtx;
        this.audioCtx.decodedBuffers.on((buffer) => {
            if (this.totalLoadedFiles !== this.audioCtx.sourceFiles.length) {
                this.sync();
            }
            this.totalLoadedFiles = this.audioCtx.sourceFiles.length;
        });
    }

    public get(): Array<IEffect> {
        return this.effects;
    }

    public add(type: string, start: number, end: number): boolean {
        let properties = {};

        for (let p of Effects.list[type].properties) {
            properties[p.name] = p.defaultValue;
        }

        this.effects.push(<IEffect> {
            effect: type,
            properties: properties,
            indexStart: start,
            indexEnd: end,
            seconds: this.calculateSeconds(start, end)
        });

        return true;
    }

    public apply() {
        let interval = this.getSecondsInterval();
        this.applyEffectPerSecond(interval[0], interval[1]);
    }

    public remove(effect: IEffect, changeBuffer: boolean  = true): boolean {
        this.effects.splice(this.effects.indexOf(effect), 1);
        if (changeBuffer && this.effects.length > 0) {
            this.apply();
        }
        if (changeBuffer && this.effects.length === 0) {
            this.audioCtx.revertBufferChanges();
        }

        return true;
    }

    private sync() {
        let i = this.effects.length;
        while (i--) {
            let effect = this.effects[i];
            this.remove(effect, false);
        }
    }

    private calculateSeconds(startIndex: number, endIndex: number): Array<number> {
        let start = startIndex / this.audioCtx.sampleRate;
        let seconds = [];
        for (let i = start; i < endIndex / this.audioCtx.sampleRate; i++) {
            seconds.push(i);
        }
        return seconds;
    }

    private getSecondsInterval() {
        if (!this.effects.length) {
            return [0, 0];
        }

        let start = this.effects[0].indexStart;
        let end = this.effects[0].indexEnd;
        for (let effect of this.effects) {
            if (effect.indexStart < start) {
                start = effect.indexStart;
            }
            if (effect.indexEnd > end) {
                end = effect.indexEnd;
            }
        }
        return [start, end];
    }

    private applyEffectPerSecond(start: number, end: number) {
        let seconds = [];
        let secondIdx:number = 0; 
        let assignOutput = (idx: number, audioBuffer: AudioBuffer) => {
            if (audioBuffer) {
                seconds[idx].outputBuffer = audioBuffer.getChannelData(0);
            }
        }
        let p: Promise<AudioBuffer> = new Promise<AudioBuffer>((resolve) => resolve());
        start = Math.floor(start / this.audioCtx.sampleRate);
        end = Math.ceil(end / this.audioCtx.sampleRate);

        for (let i = start; i < end; i++) {
            let offlineContext = new OfflineAudioContext(1, this.audioCtx.sampleRate, this.audioCtx.sampleRate);
            let tuna = new Tuna(offlineContext);

            let second = {
                idx: this.audioCtx.sampleRate * i,
                effectsList: this.effectsForSecond(i, tuna),
                inputBuffer: this.audioCtx.extractBufferAt(
                    this.audioCtx.sampleRate * i,
                    this.audioCtx.sampleRate * (i + 1)),
                outputBuffer: null
            };
            if (!second.effectsList.length) {
                continue;
            }
            seconds.push(second);

            let buff = offlineContext.createBuffer(1, second.inputBuffer.length, this.audioCtx.sampleRate);
            buff.copyToChannel(second.inputBuffer, 0, 0);
            let offlineSource = offlineContext.createBufferSource();
            offlineSource.buffer = buff;
            offlineSource.connect(second.effectsList[0].input);
            second.effectsList[second.effectsList.length - 1].connect(offlineContext.destination);
            offlineSource.start(0);

            p = p.then((audioBuffer) => {
                if (audioBuffer) {
                    seconds[secondIdx].outputBuffer = audioBuffer.getChannelData(0);
                    secondIdx++;
                }
                return offlineContext.startRendering();
            });
            
        }
        p.then((audioBuffer) => {
            if (audioBuffer) {
                seconds[seconds.length - 1].outputBuffer = audioBuffer.getChannelData(0);
            }
            return this.audioCtx.applyBufferChanges(seconds);
        });
    }

    private effectsForSecond(second: number, tuna: any): any {
        let effects = [];
        let effectsIdx = 0;
        for (let effect of this.effects) {
            if (effect.seconds.indexOf(second) !== -1) {
                let tunaEffect = new tuna[effect.effect](effect.properties);
                if (effectsIdx > 0) {
                    effects[effectsIdx - 1].connect(tunaEffect.input);
                }
                effects.push(tunaEffect);
                effectsIdx++;
            }
        }
        return effects;
    }
}
