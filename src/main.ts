import {IProperties, BaseClass} from "./base";
import {AudioContext} from "./audio.context";
import {CanvasContext} from "./canvas.context";

export class Main extends BaseClass {

    private audioCtx: AudioContext;
    private canvasCtx: CanvasContext;

    constructor(properties: IProperties) {
        super(properties, true);

        this.canvasCtx  = new CanvasContext(super.getProperties());
        this.audioCtx   = new AudioContext(super.getProperties());

        let promises: Array<Promise<any>> = this.audioCtx.audioFiles.map(this.sendRequest);

        this.audioCtx.decodedBuffers.on(audioBuffer => this.render(audioBuffer));

        this.audioCtx.decodeBuffersFromPromises(promises);
    }

    private render(audioBuffer: AudioBuffer) {
        this.canvasCtx.loadAudioData(
            audioBuffer.getChannelData(0),
            audioBuffer.duration,
            () => this.audioCtx.currentTime / audioBuffer.duration * this.canvasCtx.width,
            () => this.audioCtx.currentTime > audioBuffer.duration
        );
        this.canvasCtx.draw();
    }

    private sendRequest(fileURL): Promise<any> {
        return new Promise((resolve, reject) => {
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
    }
}
