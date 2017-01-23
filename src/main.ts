import {IProperties, IFile, IEffect, BaseClass} from "./base";
import {AudioBufferContext} from "./audio.context";
import {CanvasContext} from "./canvas.context";
import {Effects, Property} from "./effects.data";
import {EffectsStore} from "./effects.store";

/**
 * At this moment the library suports only the audio from a single channel
 */
const DEFAULT_AUDIO_CHANNEL:number = 0;

export class WaveAudioJS extends BaseClass {

    private audioCtx: AudioBufferContext;
    private canvasCtx: CanvasContext;
    private effectsStore: EffectsStore;

    constructor(properties: IProperties) {
        super(properties, true);

        this.canvasCtx      = new CanvasContext(super.getProperties());
        this.audioCtx       = new AudioBufferContext(DEFAULT_AUDIO_CHANNEL, super.getProperties());
        this.effectsStore   = new EffectsStore(DEFAULT_AUDIO_CHANNEL, this.audioCtx);

        this.audioCtx.decodedBuffers.on(buffer => this.render(buffer));

        this.addFiles(<Array<string>> super.getProperties().audioFiles);
    }

    public files(files: Array<string>) {
        let removedFiles: Array<string> = this.getDiff(this.audioCtx.fileNames, files);
        let addedFiles: Array<string> = this.getDiff(files, this.audioCtx.fileNames);

        removedFiles.length && this.audioCtx.removeFiles(removedFiles, !(addedFiles.length > 0));
        addedFiles.length && this.addFiles(addedFiles);
    }

    public get loadedFiles() {
        return this.audioCtx.sourceFiles;
    }

    public get effects(): Array<IEffect> {
        return this.effectsStore.get();
    }

    public get effectsList() {
        return Effects.list;
    }

    public addEffect(type: string, start: number, end: number): boolean {
        return this.effectsStore.add(type, start, end);
    }

    public removeEffect(effect: IEffect): boolean {
        return this.effectsStore.remove(effect);
    }

    public applyEffect(effect: IEffect) {
        return this.effectsStore.apply();
    }

    public playAudio(startAt: number = 0, callback?: Function) {
        this.canvasCtx.startRenderingProgress();
        let callbackWrap = () => {
            this.canvasCtx.stopRenderingProgress();
            callback && callback();
        }
        return this.audioCtx.playSound(startAt, callbackWrap);
    }

    public stopAudio() {
        this.canvasCtx.stopRenderingProgress();
        return this.audioCtx.stopSound();
    } 

    public get duration() {
        return this.audioCtx.duration;
    }

    public get sampleRate() {
        return this.audioCtx.sampleRate;
    }

    public getLengthAt(url: string): number {
        let file = this.audioCtx.sourceFiles.find(f => f.url == url);
        let idx = this.audioCtx.sourceFiles.indexOf(file);
        return this.audioCtx.sourceFiles.reduce(((prev, curr, currIdx) => currIdx < idx ? prev + curr.buffer.duration : prev), 0);
    }

    public getAudioFileDuration(url: string) {
        let file = this.audioCtx.sourceFiles.find(f => f.url == url);
        return file ? file.buffer.duration : 0;
    }

    private render(audioBuffer: AudioBuffer) {
        this.canvasCtx.loadAudioData(
            audioBuffer.getChannelData(DEFAULT_AUDIO_CHANNEL),
            audioBuffer.duration,
            this.audioCtx.sourceFiles,
            this.audioCtx.positons,
            () => this.audioCtx.currentTime / audioBuffer.duration * this.canvasCtx.width,
            () => this.audioCtx.currentTime > audioBuffer.duration
        );
        this.canvasCtx.draw();
    }

    private addFiles(filesNames: Array<string>) {
        let files: Array<IFile> = filesNames.map((url, idx) => this.sendRequest(url, idx));
        this.audioCtx.addFiles(files);
    }

    private sendRequest(fileURL: string, fileIdx: number): IFile {
        let filePromise = new Promise<ArrayBuffer>((resolve, reject) => {
            let request = new XMLHttpRequest();

            request.open("GET", fileURL, true);
            request.responseType = "arraybuffer";
            request.onload = () => {
                resolve(request.response);
            };
            request.onerror = function() {
                reject("Invalid audio file " + fileURL);
            };
            request.send();
        });

        return <IFile> {
            url: fileURL,
            promise: filePromise,
            color: super.getColorAt(fileIdx)
        }
    }
}
