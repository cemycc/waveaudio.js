(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (factory((global.waveaudiojs = global.waveaudiojs || {})));
}(this, function (exports) { 'use strict';

    function __extends(d, b) {
        for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    var BaseClass = (function () {
        function BaseClass(properties, validate) {
            this.properties = properties;
            if (validate) {
                this.validateProperties();
            }
        }
        BaseClass.prototype.validateProperties = function () {
            if (typeof this.properties.wrapper === "string") {
                this.properties.wrapper = document.querySelector(this.properties.wrapper);
                if (!this.properties.wrapper) {
                    throw new Error("No wrapper element was found");
                }
            }
            else if (!(this.properties.wrapper instanceof HTMLElement)) {
                throw new Error("Invalid wrapper element");
            }
            if (typeof this.properties.audioFiles !== "string" && !(this.properties.audioFiles instanceof Array)) {
                throw new Error("Invalid data for audio files");
            }
            this.properties.audioFiles = [].concat(this.properties.audioFiles);
        };
        BaseClass.prototype.setProperties = function (extended) {
            for (var prop in this.properties) {
                if (extended.hasOwnProperty(prop) && this.properties.hasOwnProperty(prop)) {
                    extended[prop] = this.properties[prop];
                }
            }
        };
        BaseClass.prototype.getProperties = function () {
            return this.properties;
        };
        return BaseClass;
    }());

    /**
     * Credits for event dispatcher class
     * http://stackoverflow.com/questions/12881212/does-typescript-support-events-on-classes
     */
    var EventDispatcher = (function () {
        function EventDispatcher() {
            this.handlers = [];
        }
        EventDispatcher.prototype.on = function (handler) {
            this.handlers.push(handler);
        };
        EventDispatcher.prototype.off = function (handler) {
            this.handlers = this.handlers.filter(function (h) { return h !== handler; });
        };
        EventDispatcher.prototype.trigger = function (data) {
            this.handlers.slice(0).forEach(function (h) { return h(data); });
        };
        return EventDispatcher;
    }());

    var AudioContext = (function (_super) {
        __extends(AudioContext, _super);
        function AudioContext(properties) {
            _super.call(this, properties);
            this.audioFiles = undefined;
            this.sourceBuffers = [];
            this.onDecodedBuffers = new EventDispatcher();
            _super.prototype.setProperties.call(this, this);
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        AudioContext.prototype.decodeBuffersFromPromises = function (promises) {
            var _this = this;
            Promise.all(promises).then(function (buffers) {
                _this.decodeBuffers(buffers);
            }).catch(function (error) {
                console.error(error);
            });
        };
        AudioContext.prototype.decodeBuffers = function (buffers) {
            var _this = this;
            var promises = buffers.map(function (buffer) { return _this.ctx.decodeAudioData(buffer); });
            Promise.all(promises)
                .then(function (bfs) {
                _this.sourceBuffers = _this.sourceBuffers.concat(bfs);
                if (_this.buffer !== undefined) {
                    bfs = bfs.concat(_this.buffer);
                }
                // TODO: when the buffer is changed, the source.buffer assignation should be also changed !
                _this.buffer = _this.createAudioBuffer(bfs);
                _this.onDecodedBuffers.trigger(_this.buffer);
                // let source = this.ctx.createBufferSource();
                // source.buffer = this.buffer;
                // source.connect(this.ctx.destination);
                // source.start();
            }).catch(function (error) {
                console.error(error);
            });
        };
        Object.defineProperty(AudioContext.prototype, "decodedBuffers", {
            get: function () {
                return this.onDecodedBuffers;
            },
            enumerable: true,
            configurable: true
        });
        ;
        Object.defineProperty(AudioContext.prototype, "currentTime", {
            get: function () {
                return this.ctx.currentTime;
            },
            enumerable: true,
            configurable: true
        });
        AudioContext.prototype.createAudioBuffer = function (fromAudioBuffers) {
            var maxChannels = 0;
            var totalDuration = 0;
            for (var _i = 0, fromAudioBuffers_1 = fromAudioBuffers; _i < fromAudioBuffers_1.length; _i++) {
                var abf = fromAudioBuffers_1[_i];
                if (abf.numberOfChannels > maxChannels) {
                    maxChannels = abf.numberOfChannels;
                }
                totalDuration += abf.duration;
            }
            var resultBuffer = this.ctx.createBuffer(maxChannels, this.ctx.sampleRate * totalDuration, this.ctx.sampleRate);
            var idx = 0;
            var _loop_1 = function() {
                var data = [];
                fromAudioBuffers.forEach(function (abf) {
                    if (idx <= abf.numberOfChannels - 1) {
                        data.push(abf.getChannelData(idx));
                    }
                    else {
                        data.push(new Float32Array(abf.getChannelData(0).length));
                    }
                });
                resultBuffer.copyToChannel(this_1.concatBuffersData(data), idx, 0);
            };
            var this_1 = this;
            do {
                _loop_1();
            } while (++idx < maxChannels);
            return resultBuffer;
        };
        AudioContext.prototype.concatBuffersData = function (buffersData) {
            var resultLength = buffersData.reduce(function (base, item) { return base + item.length; }, 0);
            var resultArray = new Float32Array(resultLength);
            var idx = 0;
            for (var _i = 0, buffersData_1 = buffersData; _i < buffersData_1.length; _i++) {
                var bf = buffersData_1[_i];
                if (idx === 0) {
                    resultArray.set(bf);
                }
                else {
                    resultArray.set(bf, buffersData[idx - 1].length);
                }
                idx++;
            }
            return resultArray;
        };
        return AudioContext;
    }(BaseClass));

    var CanvasContext = (function (_super) {
        __extends(CanvasContext, _super);
        function CanvasContext(properties) {
            _super.call(this, properties);
            this.framesColor = "rgb(208, 215, 220)";
            this.framesElapsedColor = "rgb(47,79,79)";
            this.framesWidthBar = 1;
            this.timelineHeight = 40;
            this.timelineFont = "9px Arial";
            this.timelineTimeColor = "rgb(47,79,79)";
            this.timelineBarColor = "rgb(128,128,128)";
            this.barHeight = 7;
            this.barWidth = 0.5;
            this.barLargeGroupCount = 10;
            this.barSmallGroupCount = 5;
            this.wrapper = undefined;
            _super.prototype.setProperties.call(this, this);
            this.staticEl = document.createElement("canvas");
            this.staticCtx = this.staticEl.getContext("2d");
            this.framesEl = document.createElement("canvas");
            this.framesEl.style.position = "absolute";
            this.framesEl.style.top = "0";
            this.framesEl.style.left = "0";
            this.framesCtx = this.framesEl.getContext("2d");
            var backingStoreRatio = this.staticCtx.webkitBackingStorePixelRatio ||
                this.staticCtx.mozBackingStorePixelRatio ||
                this.staticCtx.msBackingStorePixelRatio ||
                this.staticCtx.oBackingStorePixelRatio ||
                this.staticCtx.backingStorePixelRatio || 1;
            this.ratio = window.devicePixelRatio / backingStoreRatio;
            this.resize();
            this.wrapper.appendChild(this.staticEl);
            this.wrapper.appendChild(this.framesEl);
        }
        Object.defineProperty(CanvasContext.prototype, "width", {
            get: function () {
                return this.staticEl.width / this.ratio;
            },
            set: function (value) {
                for (var _i = 0, _a = ["staticEl", "framesEl"]; _i < _a.length; _i++) {
                    var el = _a[_i];
                    this[el].width = value * this.ratio;
                    this[el].style.width = value + "px";
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(CanvasContext.prototype, "height", {
            get: function () {
                return this.staticEl.height / this.ratio;
            },
            set: function (value) {
                for (var _i = 0, _a = ["staticEl", "framesEl"]; _i < _a.length; _i++) {
                    var el = _a[_i];
                    this[el].height = value * this.ratio;
                    this[el].style.height = value + "px";
                }
            },
            enumerable: true,
            configurable: true
        });
        CanvasContext.prototype.resize = function () {
            this.width = this.wrapper.offsetWidth;
            this.height = this.wrapper.offsetHeight;
            this.staticCtx.scale(this.ratio, this.ratio);
            this.framesCtx.scale(this.ratio, this.ratio);
        };
        CanvasContext.prototype.loadAudioData = function (bufferData, duration, progress, completed) {
            this.audioProgress = progress;
            this.audioCompletedStatus = completed;
            this.audioDuration = duration;
            this.computeValues(bufferData);
            this.clear();
        };
        CanvasContext.prototype.draw = function () {
            var _this = this;
            this.computeRenderData(function (rectObj, idx) {
                _this.staticCtx.fillStyle = _this.framesColor;
                _this.staticCtx.fillRect(rectObj.x, rectObj.y, rectObj.width, rectObj.height);
            });
            this.drawTimeline(this.audioDuration);
            this.startRenderingProgress();
        };
        CanvasContext.prototype.startRenderingProgress = function () {
            var _this = this;
            var rafFct = function () {
                _this.drawFrames(_this.audioProgress());
                if (_this.audioCompletedStatus()) {
                    _this.stopRenderingProgress();
                }
                else {
                    _this.rafId = requestAnimationFrame(rafFct);
                }
            };
            this.rafId = requestAnimationFrame(rafFct);
        };
        CanvasContext.prototype.stopRenderingProgress = function () {
            if (this.rafId) {
                cancelAnimationFrame(this.rafId);
            }
        };
        CanvasContext.prototype.drawFrames = function (fillTo) {
            this.clear(true);
            for (var _i = 0, _a = this.renderRectData; _i < _a.length; _i++) {
                var rectObj = _a[_i];
                this.framesCtx.fillStyle = this.framesElapsedColor;
                this.framesCtx.fillRect(rectObj.x, rectObj.y, rectObj.width, rectObj.height);
                if (rectObj.x > fillTo) {
                    break;
                }
            }
        };
        CanvasContext.prototype.computeRenderData = function (callback) {
            this.renderRectData = new Array();
            var middle = (this.height - this.timelineHeight) / 2;
            var idx = 0;
            for (var _i = 0, _a = this.audioData; _i < _a.length; _i++) {
                var interval = _a[_i];
                var rectObj = {
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
        };
        CanvasContext.prototype.computeValues = function (bufferData) {
            this.audioData = new Array(this.width);
            this.step = Math.ceil(bufferData.length / this.width);
            for (var i = 0; i < this.width; i += 1) {
                var min = 1.0;
                var max = -1.0;
                for (var j = 0; j < this.step; j += 1) {
                    var curr = bufferData[(i * this.step) + j];
                    if (curr < min) {
                        min = curr;
                    }
                    else if (curr > max) {
                        max = curr;
                    }
                }
                this.audioData[i] = [min, max];
            }
        };
        CanvasContext.prototype.drawTimeline = function (duration) {
            var _this = this;
            var secs = Math.ceil(duration);
            var gapSize = this.width / secs;
            var gapSizeBar = gapSize / this.barSmallGroupCount;
            var timelineMiddle = Math.floor(this.timelineHeight / 2);
            var drawTime = function (time, leftPadding) {
                var timeStr = _this.toHHMMSS(time);
                var timeStrW = _this.staticCtx.measureText(timeStr).width;
                var timeStrH = parseInt(_this.staticCtx.font, 10);
                var xPos;
                if (leftPadding === 0) {
                    xPos = 0;
                }
                else if (leftPadding === _this.width) {
                    xPos = leftPadding - timeStrW;
                }
                else {
                    xPos = leftPadding - timeStrW / 2;
                }
                _this.staticCtx.fillStyle = _this.timelineTimeColor;
                _this.staticCtx.fillText(timeStr, xPos, _this.height - timelineMiddle + timeStrH);
            };
            this.staticCtx.font = this.timelineFont;
            for (var sec = 0; sec <= secs; sec++) {
                var height = this.barHeight;
                var leftPadding = gapSize * sec;
                if (sec % this.barLargeGroupCount === 0 || sec === secs) {
                    height += this.barHeight / 2;
                    drawTime(sec, leftPadding);
                }
                var xPos = leftPadding === 0 ? 0 : leftPadding - 1;
                this.staticCtx.fillStyle = this.timelineBarColor;
                this.staticCtx.fillRect(xPos, this.height - timelineMiddle - height, this.barWidth, height);
                for (var bar = 1; bar < this.barSmallGroupCount; bar++) {
                    height = this.barHeight / 2;
                    this.staticCtx.fillRect(xPos + bar * gapSizeBar, this.height - timelineMiddle - height, this.barWidth, height);
                }
            }
        };
        CanvasContext.prototype.clear = function (onlyFramesCtx) {
            if (!onlyFramesCtx) {
                this.staticCtx.clearRect(0, 0, this.width, this.height);
            }
            this.framesCtx.clearRect(0, 0, this.width, this.height);
        };
        CanvasContext.prototype.toHHMMSS = function (secs) {
            var hours = Math.floor(secs / 3600);
            var minutes = Math.floor((secs - (hours * 3600)) / 60);
            var seconds = secs - (hours * 3600) - (minutes * 60);
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
            }
            else {
                return hours + ":" + minutes + ":" + seconds;
            }
        };
        return CanvasContext;
    }(BaseClass));

    var Main = (function (_super) {
        __extends(Main, _super);
        function Main(properties) {
            var _this = this;
            _super.call(this, properties, true);
            this.canvasCtx = new CanvasContext(_super.prototype.getProperties.call(this));
            this.audioCtx = new AudioContext(_super.prototype.getProperties.call(this));
            var promises = this.audioCtx.audioFiles.map(this.sendRequest);
            this.audioCtx.decodedBuffers.on(function (audioBuffer) { return _this.render(audioBuffer); });
            this.audioCtx.decodeBuffersFromPromises(promises);
        }
        Main.prototype.render = function (audioBuffer) {
            var _this = this;
            this.canvasCtx.loadAudioData(audioBuffer.getChannelData(0), audioBuffer.duration, function () { return _this.audioCtx.currentTime / audioBuffer.duration * _this.canvasCtx.width; }, function () { return _this.audioCtx.currentTime > audioBuffer.duration; });
            this.canvasCtx.draw();
        };
        Main.prototype.sendRequest = function (fileURL) {
            return new Promise(function (resolve, reject) {
                var request = new XMLHttpRequest();
                request.open("GET", fileURL, true);
                request.responseType = "arraybuffer";
                request.onload = function () {
                    resolve(request.response);
                };
                request.onerror = function () {
                    reject("Invalid audio file " + fileURL);
                };
                request.send();
            });
        };
        return Main;
    }(BaseClass));

    exports.Main = Main;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=waveaudio.js.map
