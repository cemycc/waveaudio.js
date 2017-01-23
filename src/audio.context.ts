import {IProperties, IFile, BaseClass} from "./base";
import {EventDispatcher} from "./event.dispatcher";

export class AudioBufferContext extends BaseClass {
    public sourceFiles: Array<IFile> = [];

    private ctx: AudioContext;
    private buffer: AudioBuffer;
    private originalBuffer: Float32Array;
    private activeChannel: number;
    private filesPositions: Array<number> = [];
    private playAudioSource: AudioBufferSourceNode;
    private audioContextLoad: number;
    private audioContextPlay: number;

    private onDecodedBuffers = new EventDispatcher<AudioBuffer>();

    constructor(activeChannel: number, properties: IProperties) {
        super(properties);
        super.setProperties(this);

        this.activeChannel = activeChannel;
        this.ctx = new (window.AudioContext)();
        this.audioContextLoad = Date.now();
    }

    public addFiles(files: Array<IFile>)  {
        Promise.all(files.map((file) => file.promise))
            .then((buffers: any) => {
                this.loadAudioFilesBuffers(buffers, files);
            }).catch((error: Error) => {
                console.error(error);
            });
    }

    public removeFiles(filesNames: Array<string>, fireEvent: boolean = true) {
        for(let fileName of filesNames) {
            let fileObj = this.sourceFiles.find(f => f.url === fileName);
            this.sourceFiles.splice(this.sourceFiles.indexOf(fileObj), 1);
        }
        this.assignBuffer(this.createAudioBuffer(this.sourceFiles), true, true, fireEvent);
    }

    public extractBufferAt(startIndex: number, endIndex: number): Float32Array {
        return this.originalBuffer.slice(startIndex, endIndex);
    }

    public applyBufferChanges(changes: Array<any>) {
        let arr = this.buffer.getChannelData(this.activeChannel);
        for (let item of changes) {
            if (item.idx + item.outputBuffer.length > arr.length) {
                arr.set(item.outputBuffer.slice(0, arr.length - item.idx), item.idx);
            } else {
                arr.set(item.outputBuffer, item.idx);
            }
        }
        this.assignBuffer(this.createAudioBuffer(this.sourceFiles, [arr]), false, false, true);
    }

    public revertBufferChanges() {
        let arr = this.originalBuffer.slice();
        this.assignBuffer(this.createAudioBuffer(this.sourceFiles, [arr]), false, false, true);
    }

    public playSound(startAtSecond: number = 0, callback?: Function) {
        this.playAudioSource = this.ctx.createBufferSource();
        this.playAudioSource.buffer = this.buffer;
        this.playAudioSource.connect(this.ctx.destination);
        if (callback) {
            this.playAudioSource.onended = () => callback();
        }
        this.audioContextPlay = ((Date.now() - this.audioContextLoad) / 1000) - startAtSecond;
        this.playAudioSource.start(0, startAtSecond);
    }

    public stopSound() {
        if (this.playAudioSource) {
            if (this.playAudioSource.onended) {
                this.playAudioSource.onended();                
            }
            this.playAudioSource.stop();
        }
    }

    public get currentTime(): number {
        return this.ctx.currentTime - this.audioContextPlay;
    }

    public get decodedBuffers(): EventDispatcher<AudioBuffer> {
        return this.onDecodedBuffers;
    };

    public get fileNames(): Array<string> {
        return this.sourceFiles.map(f => f.url);
    }

    public get positons(): Array<number> {
        return this.filesPositions;
    }

    public get sampleRate(): number {
        return this.ctx.sampleRate;
    }

    public get duration(): number {
        return this.buffer.duration;
    }

    public findFileIndex(file: IFile): number {
        return this.sourceFiles.indexOf(file);
    }

    private loadAudioFilesBuffers(buffers: Array<ArrayBuffer>, files: Array<IFile>) {
        let promises = buffers.map((buffer) => this.ctx.decodeAudioData(buffer));

        Promise.all(promises)
            .then(bfs => {
                let latestSourceFiles = bfs.map((buffer, idx) => {
                    let file = files[idx];
                    file.buffer = buffer;
                    return file;
                });

                this.sourceFiles = this.sourceFiles.concat(latestSourceFiles);
                this.assignBuffer(this.createAudioBuffer(this.sourceFiles));
            }).catch((error: Error) => {
                console.error(error);
            });
    }

    private findFilesPositionsOnBuffer() {
        this.filesPositions = [];

        let sum = 0;
        for (let file of this.sourceFiles) {
            let ch = this.activeChannel > file.buffer.numberOfChannels - 1 ? 0 : this.activeChannel;
            let startAt = sum;
            this.filesPositions.push(startAt);
            sum += file.buffer.getChannelData(ch).length;
        }
    }

    private createAudioBuffer(fromAudioBuffers: Array<IFile>, channelBuffers: Array<Float32Array> = []) {
        let maxChannels: number = 0;
        let totalDuration: number = 0;

        for (let file of fromAudioBuffers) {
            let abf = file.buffer;
            if (abf.numberOfChannels > maxChannels) {
                maxChannels = abf.numberOfChannels;
            }
            totalDuration += abf.duration;
        }

        if (maxChannels === 0) {
            return this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
        }

        let resultBuffer: AudioBuffer = this.ctx.createBuffer(maxChannels,
            this.ctx.sampleRate * totalDuration,
            this.ctx.sampleRate);

        let idx = 0;
        do {
            let data: Array<Float32Array> = [];
            fromAudioBuffers.forEach(file => {
                let abf = file.buffer;
                if (idx <= abf.numberOfChannels - 1) {
                    data.push(abf.getChannelData(idx));
                } else {
                    data.push(new Float32Array(abf.getChannelData(0).length));
                }
            });
            if (channelBuffers[idx] && Object.prototype.toString.call(channelBuffers[idx]) === "[object Float32Array]") {
                resultBuffer.copyToChannel(channelBuffers[idx], idx, 0);
            } else {
                resultBuffer.copyToChannel(this.concatBuffersData(data), idx, 0);
            }
        } while (++idx < maxChannels);

        return resultBuffer;
    }

    private assignBuffer(audioBuffer: AudioBuffer, setOriginal: boolean = true, reloadPos: boolean = true, fireEvent: boolean = true) {
        this.stopSound();
        this.buffer = audioBuffer;
        if (setOriginal) {
            this.originalBuffer = this.buffer.getChannelData(this.activeChannel).slice();
        }
        reloadPos && this.findFilesPositionsOnBuffer();
        fireEvent && this.onDecodedBuffers.trigger(this.buffer);
    }

    private concatBuffersData(buffersData: Array<Float32Array>): Float32Array {
        let resultLength: number = buffersData.reduce((base, item) => base + item.length, 0);
        let currLength: number = 0;
        let resultArray: Float32Array = new Float32Array(resultLength);

        for (let bf of buffersData) {
            resultArray.set(bf, currLength);
            currLength += bf.length;
        }
        return resultArray;
    }
}
