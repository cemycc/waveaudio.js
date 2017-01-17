(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (factory((global.waveaudiojs = global.waveaudiojs || {})));
}(this, (function (exports) { 'use strict';

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
    BaseClass.prototype.getDiff = function (first, second) {
        return first.filter(function (i) { return second.indexOf(i) < 0; });
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
        this.sourceFiles = [];
        this.onDecodedBuffers = new EventDispatcher();
        _super.prototype.setProperties.call(this, this);
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    AudioContext.prototype.decodeBuffersFromPromises = function (files) {
        var _this = this;
        Promise.all(files.map(function (file) { return file.promise; }))
            .then(function (buffers) {
            _this.decodeBuffers(buffers, files);
        }).catch(function (error) {
            console.error(error);
        });
    };
    AudioContext.prototype.decodeBuffers = function (buffers, files) {
        var _this = this;
        var promises = buffers.map(function (buffer) { return _this.ctx.decodeAudioData(buffer); });
        Promise.all(promises)
            .then(function (bfs) {
            bfs = bfs.map(function (buffer, idx) {
                var file = files[idx];
                file.buffer = buffer;
                return file;
            });
            _this.sourceFiles = _this.sourceFiles.concat(bfs);
            //TODO: check if this is added at begining ??
            // if (this.buffer !== undefined) {
            //     bfs = bfs.concat(this.buffer); 
            // }
            // TODO: when the buffer is changed, the source.buffer assignation should be also changed !
            _this.buffer = _this.createAudioBuffer(_this.sourceFiles);
            _this.onDecodedBuffers.trigger(_this.buffer);
            // let source = this.ctx.createBufferSource();
            // source.buffer = this.buffer;
            // source.connect(this.ctx.destination);
            // source.start();
        }).catch(function (error) {
            console.error(error);
        });
    };
    AudioContext.prototype.removeFiles = function (filesNames, fireEvent) {
        if (fireEvent === void 0) { fireEvent = true; }
        var _loop_1 = function(fileName) {
            var fileObj = this_1.sourceFiles.find(function (f) { return f.url === fileName; });
            this_1.sourceFiles.splice(this_1.sourceFiles.indexOf(fileObj), 1);
        };
        var this_1 = this;
        for (var _i = 0, filesNames_1 = filesNames; _i < filesNames_1.length; _i++) {
            var fileName = filesNames_1[_i];
            _loop_1(fileName);
        }
        this.buffer = this.createAudioBuffer(this.sourceFiles);
        fireEvent && this.onDecodedBuffers.trigger(this.buffer);
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
    Object.defineProperty(AudioContext.prototype, "fileNames", {
        get: function () {
            return this.sourceFiles.map(function (f) { return f.url; });
        },
        enumerable: true,
        configurable: true
    });
    AudioContext.prototype.findStartPositionsOnChannel = function (channel) {
        var positions = [];
        var sum = 0;
        for (var _i = 0, _a = this.sourceFiles; _i < _a.length; _i++) {
            var file = _a[_i];
            var ch = channel > file.buffer.numberOfChannels - 1 ? 0 : channel;
            var startAt = sum;
            positions.push(startAt);
            sum += file.buffer.getChannelData(ch).length;
        }
        return positions;
    };
    AudioContext.prototype.createAudioBuffer = function (fromAudioBuffers) {
        var maxChannels = 0;
        var totalDuration = 0;
        for (var _i = 0, fromAudioBuffers_1 = fromAudioBuffers; _i < fromAudioBuffers_1.length; _i++) {
            var file = fromAudioBuffers_1[_i];
            var abf = file.buffer;
            if (abf.numberOfChannels > maxChannels) {
                maxChannels = abf.numberOfChannels;
            }
            totalDuration += abf.duration;
        }
        if (maxChannels === 0) {
            return this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
        }
        var resultBuffer = this.ctx.createBuffer(maxChannels, this.ctx.sampleRate * totalDuration, this.ctx.sampleRate);
        var idx = 0;
        var _loop_2 = function() {
            var data = [];
            fromAudioBuffers.forEach(function (file) {
                var abf = file.buffer;
                if (idx <= abf.numberOfChannels - 1) {
                    data.push(abf.getChannelData(idx));
                }
                else {
                    data.push(new Float32Array(abf.getChannelData(0).length));
                }
            });
            resultBuffer.copyToChannel(this_2.concatBuffersData(data), idx, 0);
        };
        var this_2 = this;
        do {
            _loop_2();
        } while (++idx < maxChannels);
        return resultBuffer;
    };
    AudioContext.prototype.concatBuffersData = function (buffersData) {
        var resultLength = buffersData.reduce(function (base, item) { return base + item.length; }, 0);
        var currLength = 0;
        var resultArray = new Float32Array(resultLength);
        for (var _i = 0, buffersData_1 = buffersData; _i < buffersData_1.length; _i++) {
            var bf = buffersData_1[_i];
            resultArray.set(bf, currLength);
            currLength += bf.length;
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
        this.framesWidthBar = 5;
        this.framesWidthSpacer = 2;
        this.timelineHeight = 40;
        this.timelineFont = "9px Arial";
        this.timelineTimeColor = "rgb(47,79,79)";
        this.timelineBarColor = "rgb(128,128,128)";
        this.barHeight = 10;
        this.barWidth = 1;
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
    CanvasContext.prototype.loadAudioData = function (bufferData, duration, files, positions, progress, completed) {
        this.audioProgress = progress;
        this.audioCompletedStatus = completed;
        this.audioDuration = duration;
        this.audioFiles = files;
        this.computeValues(bufferData, positions);
        this.clear();
    };
    CanvasContext.prototype.draw = function () {
        var _this = this;
        this.computeRenderData(function (rectObj, idx, fileIdx) {
            //this.staticCtx.fillStyle = this.framesColor;
            _this.staticCtx.fillStyle = _this.audioFiles.length ? _this.audioFiles[fileIdx].color : _this.framesColor;
            _this.staticCtx.fillRect(rectObj.x, rectObj.y, rectObj.width, rectObj.height);
        });
        this.drawTimeline(this.audioDuration);
        //this.startRenderingProgress();
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
        var idx = 0;
        for (var _i = 0, _a = this.audioData; _i < _a.length; _i++) {
            var data = _a[_i];
            var sample = isNaN(data[0]) ? 0 : data[0];
            var fileIdx = data[1];
            var posX = idx * this.framesWidthBar;
            var posY = (this.height / 2 - this.timelineHeight / 2) - sample;
            var negY = (this.height / 2 - this.timelineHeight / 2) + sample;
            var width = this.framesWidthBar - this.framesWidthSpacer;
            var rectObj = {
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
    };
    CanvasContext.prototype.computeValues = function (bufferData, positions) {
        var numSubsets = Math.floor(this.width / this.framesWidthBar);
        var subsetLength = bufferData.length / numSubsets;
        this.audioData = new Array(numSubsets);
        var bufferIdx = 0;
        var normal = 0;
        for (var i = 0; i < this.audioData.length; i++) {
            var sum = 0;
            for (var k = 0; k < subsetLength; k++) {
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
        for (var i = 0; i < this.audioData.length; i++) {
            this.audioData[i][0] *= normal;
            this.audioData[i][0] = (this.audioData[i][0] / 32768) * ((this.height - this.timelineHeight) / 2);
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

var DEFAULT_AUDIO_CHANNEL = 0;
var WaveAudioJS = (function (_super) {
    __extends(WaveAudioJS, _super);
    function WaveAudioJS(properties) {
        var _this = this;
        _super.call(this, properties, true);
        this.canvasCtx = new CanvasContext(_super.prototype.getProperties.call(this));
        this.audioCtx = new AudioContext(_super.prototype.getProperties.call(this));
        this.audioCtx.decodedBuffers.on(function (audioBuffer) { return _this.render(audioBuffer); });
        this.addFiles(_super.prototype.getProperties.call(this).audioFiles);
    }
    WaveAudioJS.prototype.files = function (files) {
        var removedFiles = this.getDiff(this.audioCtx.fileNames, files);
        var addedFiles = this.getDiff(files, this.audioCtx.fileNames);
        removedFiles.length && this.audioCtx.removeFiles(removedFiles, !(addedFiles.length > 0));
        addedFiles.length && this.addFiles(addedFiles);
    };
    WaveAudioJS.prototype.render = function (audioBuffer) {
        var _this = this;
        this.canvasCtx.loadAudioData(audioBuffer.getChannelData(DEFAULT_AUDIO_CHANNEL), audioBuffer.duration, this.audioCtx.sourceFiles, this.audioCtx.findStartPositionsOnChannel(DEFAULT_AUDIO_CHANNEL), function () { return _this.audioCtx.currentTime / audioBuffer.duration * _this.canvasCtx.width; }, function () { return _this.audioCtx.currentTime > audioBuffer.duration; });
        this.canvasCtx.draw();
    };
    WaveAudioJS.prototype.addFiles = function (filesNames) {
        var files = filesNames.map(this.sendRequest);
        this.audioCtx.decodeBuffersFromPromises(files);
    };
    WaveAudioJS.prototype.sendRequest = function (fileURL) {
        var filePromise = new Promise(function (resolve, reject) {
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
        var getRandomColor = function () {
            var letters = '0123456789ABCDEF';
            var color = '#';
            for (var i = 0; i < 6; i++) {
                color += letters[Math.floor(Math.random() * 16)];
            }
            return color;
        };
        return {
            url: fileURL,
            promise: filePromise,
            color: getRandomColor()
        };
    };
    return WaveAudioJS;
}(BaseClass));

exports.WaveAudioJS = WaveAudioJS;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=waveaudio.js.map
