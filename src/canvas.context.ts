import {IProperties, BaseClass} from "./base";

interface CanvasRectObject {
    x: number;
    y: number;
    width: number;
    height: number;
}

export class CanvasContext extends BaseClass {
    public framesColor: string = "rgb(208, 215, 220)";
    public framesElapsedColor: string = "rgb(47,79,79)";
    public framesWidthBar: number = 1;
    public timelineHeight: number = 40;
    public timelineFont: string = "9px Arial";
    public timelineTimeColor: string = "rgb(47,79,79)";
    public timelineBarColor: string = "rgb(128,128,128)";
    public barHeight: number = 7;
    public barWidth: number = 0.5;
    public barLargeGroupCount: number = 10;
    public barSmallGroupCount: number = 5;
    public wrapper: HTMLElement = undefined;

    private staticEl: HTMLElement;
    private framesEl: HTMLElement;
    private staticCtx: CanvasRenderingContext2D;
    private framesCtx: CanvasRenderingContext2D;
    private ratio: number;
    private renderRectData: Array<CanvasRectObject>;
    private rafId: number;

    private step: number;
    private audioData: Array<Array<number>>;
    private audioDuration: number;
    private audioProgress: Function;
    private audioCompletedStatus: Function;

    constructor(properties: IProperties) {
        super(properties);
        super.setProperties(this);

        this.staticEl = document.createElement("canvas");
        this.staticCtx = this.staticEl.getContext("2d");

        this.framesEl = document.createElement("canvas");
        this.framesEl.style.position = "absolute";
        this.framesEl.style.top = "0";
        this.framesEl.style.left = "0";

        this.framesCtx = this.framesEl.getContext("2d");

        let backingStoreRatio: number = this.staticCtx.webkitBackingStorePixelRatio ||
                                    this.staticCtx.mozBackingStorePixelRatio ||
                                    this.staticCtx.msBackingStorePixelRatio ||
                                    this.staticCtx.oBackingStorePixelRatio ||
                                    this.staticCtx.backingStorePixelRatio || 1;
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

    public loadAudioData(bufferData: Float32Array,
            duration: number,
            progress: () => number,
            completed: () => boolean) {
        this.audioProgress = progress;
        this.audioCompletedStatus = completed;
        this.audioDuration = duration;
        this.computeValues(bufferData);

        this.clear();
    }

    public draw() {
        this.computeRenderData((rectObj: CanvasRectObject, idx: number) => {
            this.staticCtx.fillStyle = this.framesColor;
            this.staticCtx.fillRect(rectObj.x, rectObj.y, rectObj.width, rectObj.height);
        });

        this.drawTimeline(this.audioDuration);
        this.startRenderingProgress();
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

    private computeRenderData(callback?: (rectObj, idx) => void) {
        this.renderRectData = new Array();

        let middle: number = (this.height - this.timelineHeight) / 2;
        let idx: number = 0;
        for (let interval of this.audioData) {
            let rectObj: CanvasRectObject = {
                x: idx,
                y: Math.ceil((1 + interval[0]) * middle),
                width: this.framesWidthBar,
                height: Math.max(1, (interval[1] - interval[0]) * middle),
            };
            this.renderRectData.push(rectObj);

            if (typeof callback === "function") {
                callback(rectObj, idx);
            }
            idx++;
        }
    }

    private computeValues(bufferData: Float32Array) {
        this.audioData = new Array(this.width);
        this.step = Math.ceil(bufferData.length / this.width);

        for (let i = 0; i < this.width; i += 1) {
            let min = 1.0;
            let max = -1.0;
            for (let j = 0; j < this.step; j += 1) {
                let curr = bufferData[(i * this.step) + j];
                if (curr < min) {
                    min = curr;
                } else if (curr > max) {
                    max = curr;
                }
            }
            this.audioData[i] = [min, max];
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
