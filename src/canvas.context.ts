import {IProperties, IFile, BaseClass} from "./base";

interface CanvasRectObject {
    x: number;
    y: number;
    width: number;
    height: number;
}

export class CanvasContext extends BaseClass {
    public framesColor: string = "rgb(208, 215, 220)";
    public framesElapsedColor: string = "rgb(47,79,79)";
    public framesWidthBar: number = 5;
    public framesWidthSpacer: number = 2;
    public timelineHeight: number = 40;
    public timelineFont: string = "11px Arial";
    public timelineTimeColor: string = "rgb(47,79,79)";
    public timelineBarColor: string = "rgb(128,128,128)";
    public barHeight: number = 12;
    public barWidth: number = 1;
    public barLargeGroupCount: number = 10;
    public barSmallGroupCount: number = 5;
    public wrapper: HTMLElement = undefined;

    private staticEl: HTMLCanvasElement;
    private framesEl: HTMLCanvasElement;
    private staticCtx: CanvasRenderingContext2D;
    private framesCtx: CanvasRenderingContext2D;
    private ratio: number;
    private renderRectData: Array<CanvasRectObject>;
    private rafId: number;

    private step: number;
    private audioData: Array<Array<number>>;
    private audioFiles: Array<IFile>;
    private audioDuration: number;
    private audioProgress: Function;
    private audioCompletedStatus: Function;

    constructor(properties: IProperties) {
        super(properties);
        super.setProperties(this);

        this.staticEl = <HTMLCanvasElement> document.createElement("canvas");
        this.staticCtx = this.staticEl.getContext("2d");

        this.framesEl = <HTMLCanvasElement> document.createElement("canvas");
        this.framesEl.style.position = "absolute";
        this.framesEl.style.top = "0";
        this.framesEl.style.left = "0";

        this.framesCtx = this.framesEl.getContext("2d");

        let backingStoreRatio: number = this.staticCtx['webkitBackingStorePixelRatio'] ||
                                    this.staticCtx['mozBackingStorePixelRatio'] ||
                                    this.staticCtx['msBackingStorePixelRatio'] ||
                                    this.staticCtx['oBackingStorePixelRatio'] ||
                                    this.staticCtx['backingStorePixelRatio'] || 1;
        this.ratio = window.devicePixelRatio / backingStoreRatio;

        this.resize();
        this.wrapper.appendChild(this.staticEl);
        this.wrapper.appendChild(this.framesEl);
    }

    public get width(): number {
        return this.staticEl.width / this.ratio;
    }

    public set width(value: number) {
        for (let el of ["staticEl", "framesEl"]) {
            this[el].width = value * this.ratio;
            this[el].style.width = value + "px";
        }
    }

    public get height(): number {
        return this.staticEl.height / this.ratio;
    }

    public set height(value: number) {
        for (let el of ["staticEl", "framesEl"]) {
            this[el].height = value * this.ratio;
            this[el].style.height = value + "px";
        }
    }

    public resize() {
        this.width = this.wrapper.offsetWidth;
        this.height = this.wrapper.offsetHeight;

        this.staticCtx.scale(this.ratio, this.ratio);
        this.framesCtx.scale(this.ratio, this.ratio);
    }

    public loadAudioData(
            bufferData: Float32Array,
            duration: number,
            files: Array<IFile>,
            positions: Array<number>,
            progress: () => number,
            completed: () => boolean) {
        this.audioProgress = progress;
        this.audioCompletedStatus = completed;
        this.audioDuration = duration;
        this.audioFiles = files;
        this.computeValues(bufferData, positions);

        this.clear();
    }

    public draw() {
        this.computeRenderData((rectObj: CanvasRectObject, idx: number, fileIdx: number) => {
            this.staticCtx.fillStyle = this.audioFiles.length ? this.audioFiles[fileIdx].color : this.framesColor;
            this.staticCtx.fillRect(rectObj.x, rectObj.y, rectObj.width, rectObj.height);
        });
        this.drawTimeline(this.audioDuration);
    }

    public startRenderingProgress() {
        let rafFct = () => {
            this.drawFrames(this.audioProgress());

            if (this.audioCompletedStatus()) {
                this.stopRenderingProgress();
            } else {
                this.rafId = requestAnimationFrame(rafFct);
            }
        };
        this.rafId = requestAnimationFrame(rafFct);
    }

    public stopRenderingProgress() {
        if (this.rafId) {
            this.framesCtx.clearRect(0, 0, this.width, this.height);
            cancelAnimationFrame(this.rafId);
        }
    }

    private drawFrames(fillTo: number) {
        this.clear(true);

        for (let rectObj of this.renderRectData) {
            this.framesCtx.fillStyle = this.framesElapsedColor;
            this.framesCtx.fillRect(rectObj.x, rectObj.y, rectObj.width, rectObj.height);

            if (rectObj.x > fillTo) {
                break;
            }
        }
    }

    private computeRenderData(callback?: (rectObj: CanvasRectObject, idx: number, fileIdx: number) => void) {
        this.renderRectData = new Array();

        let idx: number = 0;
        for (let data of this.audioData) {
            let sample = isNaN(data[0]) ? 0 : data[0];
            let fileIdx = data[1];
            let posX = idx * this.framesWidthBar;
            let posY = (this.height / 2 - this.timelineHeight / 2) - sample;
            let negY = (this.height / 2 - this.timelineHeight / 2) + sample;
            let width = this.framesWidthBar - this.framesWidthSpacer;

            let rectObj: CanvasRectObject = {
                x: posX,
                y: posY,
                width: width,
                height: negY - posY > 0 ? negY - posY : width,
            };
            this.renderRectData.push(rectObj);

            if (typeof callback === "function") {
                callback(rectObj, idx, fileIdx);
            }
            idx++;
        }
    }

    private computeValues(bufferData: Float32Array, positions: Array<number>) {
        let numSubsets = Math.floor(this.width / this.framesWidthBar);
        let subsetLength = bufferData.length / numSubsets;

        this.audioData = new Array(numSubsets);

        let bufferIdx = 0;
        let normal = 0;
        for (let i = 0; i < this.audioData.length; i++) {
            let sum = 0;

            for (let k = 0; k < subsetLength; k++) {
                if (bufferData[bufferIdx]) {
                    sum += Math.abs(bufferData[bufferIdx]);
                }
                bufferIdx++;
            }

            var leftClosestIdx = positions.length ? positions.indexOf(positions.reduce(function (prev, curr) {
                return prev <= bufferIdx && curr > bufferIdx ? prev : curr;
            })) : 0;

            this.audioData[i] = [sum / subsetLength, leftClosestIdx];
            if (this.audioData[i][0] > normal) {
                normal = this.audioData[i][0];
            }
        }

        normal = 32768 / normal;
        for (let i = 0; i < this.audioData.length; i++) {
            this.audioData[i][0] *= normal;
            this.audioData[i][0] = (this.audioData[i][0] / 32768) * ((this.height - this.timelineHeight) / 2);

        }
    }

    private drawTimeline(duration: number) {
        let secs = Math.ceil(duration);
        let gapSize = this.width / secs;
        let gapSizeBar = gapSize / this.barSmallGroupCount;
        let timelineMiddle = Math.floor(this.timelineHeight / 2);

        let drawTime = (time: number, leftPadding: number): void => {
            let timeStr = this.toHHMMSS(time);
            let timeStrW = this.staticCtx.measureText(timeStr).width;
            let timeStrH = parseInt(this.staticCtx.font, 10);

            let xPos;
            if (leftPadding === 0) {
                xPos = 0;
            } else if (leftPadding === this.width) {
                xPos = leftPadding - timeStrW;
            } else {
                xPos = leftPadding - timeStrW / 2;
            }

            this.staticCtx.fillStyle = this.timelineTimeColor;
            this.staticCtx.fillText(timeStr,
                xPos,
                this.height - timelineMiddle + timeStrH);
        };

        this.staticCtx.font = this.timelineFont;
        for (let sec = 0; sec <= secs; sec++) {
            let height = this.barHeight;
            let leftPadding = gapSize * sec;
            if (sec % this.barLargeGroupCount === 0 || sec === secs) {
                height += this.barHeight / 2;
                drawTime(sec, leftPadding);
            }

            let xPos = leftPadding === 0 ? 0 : leftPadding - 1;

            this.staticCtx.fillStyle = this.timelineBarColor;
            this.staticCtx.fillRect(xPos,
                this.height - timelineMiddle - height,
                this.barWidth,
                height);
            for (let bar = 1; bar < this.barSmallGroupCount; bar++) {
                height = this.barHeight / 2;
                this.staticCtx.fillRect(xPos + bar * gapSizeBar,
                    this.height - timelineMiddle - height,
                    this.barWidth,
                    height);
            }
        }

    }

    private clear(onlyFramesCtx?: boolean) {
        if (!onlyFramesCtx) {
            this.staticCtx.clearRect(0, 0, this.width, this.height);
        }
        this.framesCtx.clearRect(0, 0, this.width, this.height);
    }

    private toHHMMSS(secs: number) {
        let hours: any = Math.floor(secs / 3600);
        let minutes: any = Math.floor((secs - (hours * 3600)) / 60);
        let seconds: any = secs - (hours * 3600) - (minutes * 60);

        if (hours < 10) {
            hours = "0" + hours.toString();
        }
        if (minutes < 10) {
            minutes = "0" + minutes.toString();
        }
        if (seconds < 10) {
            seconds = "0" + seconds.toString();
        }
        if (hours === "00") {
            return minutes + ":" + seconds;
        } else {
            return hours + ":" + minutes + ":" + seconds;
        }

    }

}
