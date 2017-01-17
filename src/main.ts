import {IProperties, IFile, BaseClass} from "./base";
import {AudioContext} from "./audio.context";
import {CanvasContext} from "./canvas.context";

/**
 * At this moment the library suports only the audio from a single channel
 */
const DEFAULT_AUDIO_CHANNEL:number = 0;

export class WaveAudioJS extends BaseClass {

    private audioCtx: AudioContext;
    private canvasCtx: CanvasContext;

    constructor(properties: IProperties) {
        super(properties, true);

        this.canvasCtx  = new CanvasContext(super.getProperties());
        this.audioCtx   = new AudioContext(super.getProperties());
        
        this.audioCtx.decodedBuffers.on(audioBuffer => this.render(audioBuffer));

        this.addFiles(<Array<string>> super.getProperties().audioFiles);
    }

    public files(files: Array<string>) {
        let removedFiles: Array<string> = this.getDiff(this.audioCtx.fileNames, files);
        let addedFiles: Array<string> = this.getDiff(files, this.audioCtx.fileNames);
        
        removedFiles.length && this.audioCtx.removeFiles(removedFiles, !(addedFiles.length > 0));
        addedFiles.length && this.addFiles(addedFiles);
    }

    private render(audioBuffer: AudioBuffer) {
        this.canvasCtx.loadAudioData(
            audioBuffer.getChannelData(DEFAULT_AUDIO_CHANNEL),
            audioBuffer.duration,
            this.audioCtx.sourceFiles,
            this.audioCtx.findStartPositionsOnChannel(DEFAULT_AUDIO_CHANNEL),
            () => this.audioCtx.currentTime / audioBuffer.duration * this.canvasCtx.width,
            () => this.audioCtx.currentTime > audioBuffer.duration
        );
        this.canvasCtx.draw();
    }


    private addFiles(filesNames: Array<string>) {
        let files: Array<IFile> = filesNames.map(this.sendRequest);
        this.audioCtx.decodeBuffersFromPromises(files);
    }

    private sendRequest(fileURL): IFile {
        let filePromise = new Promise((resolve, reject) => {
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
        var getRandomColor = function () {
            var letters = '0123456789ABCDEF';
            var color = '#';
            for (var i = 0; i < 6; i++ ) {
                color += letters[Math.floor(Math.random() * 16)];
            }
            return color;
        }
        return <IFile> {
            url: fileURL,
            promise: filePromise,
            color: getRandomColor()
        }
    }
}

