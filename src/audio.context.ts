import {IProperties, BaseClass} from "./base";
import {EventDispatcher} from "./event.dispatcher";

export class AudioContext extends BaseClass {
    public audioFiles: Array<string> = undefined;

    private ctx: AudioContext;
    private sourceBuffers: Array<AudioBuffer> = [];
    private buffer: AudioBuffer;

    private onDecodedBuffers = new EventDispatcher<AudioBuffer>();

    constructor(properties: IProperties) {
        super(properties);
        super.setProperties(this);

        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    public decodeBuffersFromPromises(promises: Array<Promise<any>>)  {
        Promise.all(promises).then((buffers: any) => {
            this.decodeBuffers(buffers);
        }).catch((error: Error) => {
            console.error(error);
        });
    }

    public decodeBuffers(buffers: Array<ArrayBuffer>) {
        let promises: Array<AudioBuffer> = buffers.map((buffer) => this.ctx.decodeAudioData(buffer));

        Promise.all(promises)
            .then(bfs => {
                this.sourceBuffers = this.sourceBuffers.concat(bfs);

                if (this.buffer !== undefined) {
                    bfs = bfs.concat(this.buffer);
                }
                // TODO: when the buffer is changed, the source.buffer assignation should be also changed !
                this.buffer = this.createAudioBuffer(bfs);
                this.onDecodedBuffers.trigger(this.buffer);

                // let source = this.ctx.createBufferSource();
                // source.buffer = this.buffer;
                // source.connect(this.ctx.destination);
                // source.start();
            }).catch((error: Error) => {
                console.error(error);
            });
    }

    public get decodedBuffers(): EventDispatcher<AudioBuffer> {
        return this.onDecodedBuffers;
    };

    public get currentTime(): number {
        return this.ctx.currentTime;
    }

    private createAudioBuffer(fromAudioBuffers: Array<AudioBuffer>) {
        let maxChannels: number = 0;
        let totalDuration: number = 0;

        for (let abf of fromAudioBuffers) {
            if (abf.numberOfChannels > maxChannels) {
                maxChannels = abf.numberOfChannels;
            }
            totalDuration += abf.duration;
        }

        let resultBuffer: AudioBuffer = this.ctx.createBuffer(maxChannels,
            this.ctx.sampleRate * totalDuration,
            this.ctx.sampleRate);

        let idx = 0;
        do {
            let data: Array<Float32Array> = [];
            fromAudioBuffers.forEach(abf => {
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
        let resultArray: Float32Array = new Float32Array(resultLength);
        let idx: number = 0;

        for (let bf of buffersData) {
            if (idx === 0) {
                resultArray.set(bf);
            } else {
                resultArray.set(bf, buffersData[idx - 1].length);
            }
            idx++;
        }

        return resultArray;
    }
}
