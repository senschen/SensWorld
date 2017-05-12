/**
 * Created by sens on 2017/2/17.
 */
function MusicVisualizer(obj) {
    this.source = null;

    this.count = 0;

    this.analyser = this.audioCtx.createAnalyser();
    this.size = obj.size;
    this.analyser.fftSize = this.size * 2;

    this.gainNode = this.audioCtx[this.audioCtx.createGain ? "createGain" : "createGainNode"]();
    this.gainNode.connect(this.audioCtx.destination);

    // this.filter = this.audioCtx.createBiquadFilter();
    // this.filter.frequency.value = 800;
    // this.filter.connect(this.gainNode);

    this.analyser.connect(this.gainNode);

    this.xhr = new XMLHttpRequest();

    this.visualizer = obj.visualizer;

    this.visualize();
}

MusicVisualizer.prototype = {
    audioCtx: new (window.AudioContext || window.webkitAudioContext)(),
    load: function (url, fun) {
        var self = this;
        this.xhr.abort();
        this.xhr.open("GET", url);
        this.xhr.responseType = "arraybuffer";
        this.xhr.onload = function () {
            fun(self.xhr.response);
        };
        this.xhr.send();
    },
    decode: function (arraybuffer, fun) {
        this.audioCtx.decodeAudioData(arraybuffer, function (buffer) {
            fun(buffer);
        }, function (err) {
            console.error(err);
        });
    },
    play: function (url,callback) {
        var self = this;
        var n = ++this.count;
        this.source && this.stop();
        this.load(url, function (arraybuffer) {
            self.decode(arraybuffer, function (buffer) {
                if (n != self.count) return;
                var bs = self.audioCtx.createBufferSource();
                bs.loop = true;
                bs.connect(self.analyser);
                bs.buffer = buffer;
                self.source = bs;
                callback && callback();
            })
        });
    },
    start: function () {
        this.source[this.source.start ? "start" : "noteOn"](0);
    },
    stop: function () {
        this.source[this.source.stop ? "stop" : "noteOff"](0);
    },
    changeVolume: function (percent) {
        this.gainNode.gain.value = percent * percent;
    },
    visualize: function () {
        var arr = new Uint8Array(this.analyser.frequencyBinCount);

        requestAnimationFrame = window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame;
        var self = this;

        function v() {
            self.analyser.getByteFrequencyData(arr);
            self.visualizer(arr);
            requestAnimationFrame(v);
        }

        requestAnimationFrame(v);
    },
    slow: function () {
        var self = this;
        self.source.playbackRate.value = 0.5;
    }
};