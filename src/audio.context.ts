import {IProperties, IFile, BaseClass} from "./base";
import {EventDispatcher} from "./event.dispatcher";

export class AudioContext extends BaseClass {
    public sourceFiles: Array<IFile> = [];

    private ctx: AudioContext;
    private buffer: AudioBuffer;

    private onDecodedBuffers = new EventDispatcher<AudioBuffer>();

    constructor(properties: IProperties) {
        super(properties);
        super.setProperties(this);

        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }


    public decodeBuffersFromPromises(files: Array<IFile>)  {
        Promise.all(files.map((file) => file.promise))
            .then((buffers: any) => {
                this.decodeBuffers(buffers, files);
            }).catch((error: Error) => {
                console.error(error);
            });
    }

    public decodeBuffers(buffers: Array<ArrayBuffer>, files: Array<IFile>) {
        let promises: Array<AudioBuffer> = buffers.map((buffer) => this.ctx.decodeAudioData(buffer));

        Promise.all(promises)
            .then(bfs => {
                bfs = bfs.map((buffer, idx) => {
                    let file = files[idx];
                    file.buffer = buffer;
                    return file;
                });
                this.sourceFiles = this.sourceFiles.concat(bfs);

                //TODO: check if this is added at begining ??
                // if (this.buffer !== undefined) {
                //     bfs = bfs.concat(this.buffer); 
                // }

                // TODO: when the buffer is changed, the source.buffer assignation should be also changed !
                this.buffer = this.createAudioBuffer(this.sourceFiles);
                this.onDecodedBuffers.trigger(this.buffer);
                


                // let source = this.ctx.createBufferSource();
                // source.buffer = this.buffer;
                // source.connect(this.ctx.destination);
                // source.start();
            }).catch((error: Error) => {
                console.error(error);
            });
    }

    public removeFiles(filesNames: Array<string>, fireEvent: boolean = true) {
        for(let fileName of filesNames) {
            let fileObj = this.sourceFiles.find(f => f.url === fileName);
            this.sourceFiles.splice(this.sourceFiles.indexOf(fileObj), 1);
        }

        this.buffer = this.createAudioBuffer(this.sourceFiles);
        fireEvent && this.onDecodedBuffers.trigger(this.buffer);
    }

    public get decodedBuffers(): EventDispatcher<AudioBuffer> {
        return this.onDecodedBuffers;
    };

    public get currentTime(): number {
        return this.ctx.currentTime;
    }

    public get fileNames(): Array<string> {
        return this.sourceFiles.map(f => f.url);
    }

    public findStartPositionsOnChannel(channel: number): Array<number> {
        let positions: Array<number> = [];
        
        let sum = 0;
        for (let file of this.sourceFiles) {
            let ch = channel > file.buffer.numberOfChannels - 1 ? 0 : channel;
            let startAt = sum;
            positions.push(startAt);
            sum += file.buffer.getChannelData(ch).length;
        }
        return positions;
    }

    private createAudioBuffer(fromAudioBuffers: Array<IFile>) {
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
            resultBuffer.copyToChannel(this.concatBuffersData(data), idx, 0);
        } while (++idx < maxChannels);
        
        return resultBuffer;
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
