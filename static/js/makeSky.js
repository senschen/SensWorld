/**
 * Created by sens on 2017/2/17.
 */

//封装一下事件绑定函数，其实没啥意义啊，反正IE9以下都GG。主要还是封装滚轮事件。
var addEvent = (function(window, undefined) {  //强行模仿jQuery源码 - -
    var _eventCompat = function(event) {
        var type = event.type;
        //火狐和chrome的delta居然值差那么远。。。
        if (type == 'DOMMouseScroll' || type == 'mousewheel') {
            event.delta = (event.wheelDelta) ? event.wheelDelta / 120 : -(event.detail || 0) / 3;
        }
        if (event.srcElement && !event.target) {
            event.target = event.srcElement;
        }
        if (!event.preventDefault && event.returnValue !== undefined) {
            event.preventDefault = function() {
                event.returnValue = false;
            };
        }

        return event;
    };
    if (window.addEventListener) {
        return function(el, type, fn, capture) {
            if (type === "mousewheel" && document.mozHidden !== undefined) {
                type = "DOMMouseScroll";
            }
            el.addEventListener(type, function(event) {
                fn.call(this, _eventCompat(event));
            }, capture || false);
        }
    } else if (window.attachEvent) {
        return function(el, type, fn) {
            el.attachEvent("on" + type, function(event) {
                event = event || window.event;
                fn.call(el, _eventCompat(event));
            });
        }
    }
    return function() {};
})(window);

var makeSky = (function (doc, window, addEvent) {
    //还是兼容一下国产浏览器用低版本chrome内核的情况吧。。。
    var REQ = window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame;
    var cancelREQ =
        window.cancelRequestAnimationFrame
        || window.cancelAnimationFrame
        || window.webkitCancelAnimationFrame
        || window.webkitCancelRequestAnimationFrame
        || window.mozCancelRequestAnimationFrame
        || window.oCancelRequestAnimationFrame
        || window.msCancelRequestAnimationFrame;
    var tReq = null;
    var flagStop = false;

    var cvs = doc.getElementById('wrapper-cvs');
    var ctx = cvs.getContext('2d');

    //那么多获取浏览器可用宽高的写法，感觉还是这个最靠谱
    cvs.width = doc.documentElement.clientWidth;
    cvs.height = doc.documentElement.clientHeight;

    var stageBack = doc.getElementById('j-stage-block-back'),
        hue = 217,
        stars = [],
        count = 0, //其实叫index更合适。。用来保存当前生成到了第count个星星。重绘时清0再来。
        far = 0,
        maxStars = 500,
        canvas2 = document.createElement('canvas'),
        ctx2 = canvas2.getContext('2d');
    //canvas2用来离屏画星星
    canvas2.width = 100;
    canvas2.height = 100;
    var half = canvas2.width / 2;
    var gradient2 = ctx2.createRadialGradient(half, half, 0, half, half, half);

    //缩放窗口触发重计算时会用上的flag
    var flagRestartStar = false;
    var flagRestartSky = false;

    //星星就是渐变的圆啦
    gradient2.addColorStop(0.025, '#CCC');
    gradient2.addColorStop(0.1, 'hsl(' + hue + ', 61%, 33%)');
    gradient2.addColorStop(0.25, 'hsl(' + hue + ', 64%, 6%)');
    gradient2.addColorStop(1, 'transparent');
    ctx2.fillStyle = gradient2;
    ctx2.beginPath();
    ctx2.arc(half, half, half, 0, Math.PI * 2);
    ctx2.fill();

    //这两个函数，生成星星的时候要用到
    function random(min, max) {
        if (arguments.length < 2) {
            max = min;
            min = 0;
        }
        if (min > max) {
            var hold = max;
            max = min;
            min = hold;
        }
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    function maxOrbit(x, y) {
        var max = Math.max(x, y),
            diameter = Math.round(Math.sqrt(max * max + max * max));
        return diameter / 2;
    }

    function Star(w,h) {
        this.orbitRadius = random(maxOrbit(w, h));
        this.radius = random(60, this.orbitRadius) / 8;
        this.orbitX = w / 2;
        this.orbitY = h / 2;
        this.timePassed = random(0, maxStars);
        this.speed = random(this.orbitRadius) / 50000;
        this.alpha = random(2, 10) / 10;

        count++;
        stars[count] = this;
    }
    //每帧都要给一堆星星遍历执行这些位置和透明度计算
    Star.prototype.draw = function () {
        var x = Math.sin(this.timePassed) * this.orbitRadius + this.orbitX,
            y = Math.cos(this.timePassed) * this.orbitRadius + this.orbitY,
            twinkle = random(10);

        if (twinkle === 1 && this.alpha > 0) {
            this.alpha -= 0.05;
        } else if (twinkle === 2 && this.alpha < 1) {
            this.alpha += 0.05;
        }

        ctx.globalAlpha = this.alpha;
        ctx.drawImage(canvas2, x - this.radius / 2, y - this.radius / 2, this.radius, this.radius);
        if (mouseAniSpeed > minAniSpeed) {
            this.timePassed += this.speed * mouseAniSpeed * ratioAniSpeed;
        }
        else {
            this.timePassed += this.speed;
        }
    };

    //用来判断是否正在滚动滚轮的flag以及计算动画速度的变量
    var isMouseWheel = false;
    var synMouseWheel;
    var minAniSpeed = 0.2;
    var ratioAniSpeed = 1 / minAniSpeed;
    var maxAniSpeed = 1;
    var mouseAniSpeed = minAniSpeed;

    //这个函数用来画旋转的星星，传入canvas的尺寸
    function animation(w,h) {
        if(flagRestartStar) {
            flagRestartStar = false;
            return;
        }
        //稍微保留一下之前的画面，形成星星的尾巴
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.3;

        ctx.fillRect(0, 0, w, h);

        ctx.globalCompositeOperation = 'lighter';
        for (var i = 1, l = stars.length; i < l; i++) {
            stars[i].draw();
        }

        REQ(function () {
            animation(w,h);
        });
    }

    //用来节流的时间戳
    var timestampRunEvent = +new Date();
    //触发play时候的回调函数，居然写成作一个全局变量，在init的时候赋值
    var onplayFunc = null;
    //这个函数控制离终点的距离
    function skyAnimation() {
        if(flagRestartSky) {
            flagRestartSky = false;
            return;
        }

        //这人是真的懒，懒得写window.cancelAnimationFrame来节省那一点性能了。。。要判断一辈子了。
        if (far < 800) {
            //正在滚动滚轮时达到最快速度
            if (isMouseWheel) {
                mouseAniSpeed = maxAniSpeed;
                far += maxAniSpeed;
            }
            //滚动停止时逐渐减速
            else {
                mouseAniSpeed = mouseAniSpeed > minAniSpeed ? mouseAniSpeed - 0.01 : minAniSpeed;
                far += mouseAniSpeed;
            }
            //改变画布在Z轴上的距离来制造接近是视觉，没有回流重绘应该性能还是可以的。。。吧？
            stageBack.style.transform = 'translate3d(0,0,' + far + 'px)';

            //触发play事件时还是节流一下吧。。。另外，没有引入jquery就懒得搞成发布订阅模式了- -，直接执行咯。
            if(+new Date() - timestampRunEvent > 1000){
                onplayFunc && onplayFunc(far);
                timestampRunEvent = +new Date();
            }
            tReq = REQ(skyAnimation);
        }
    }

    function makeStars(w,h) {
        count = 0;
        for (var i = 0; i < maxStars; i++) {
            new Star(w,h);
        }
    }

    function init(onplay) {
        if (typeof onplay === 'function'){
            onplayFunc = onplay;
        }
        addEvent(doc.body, "mousewheel", function (event) {
            if(flagStop) return;
            if (event.delta < 0 && far < 800) {
                clearTimeout(synMouseWheel);
                synMouseWheel = setTimeout(function () {
                    isMouseWheel = false;
                    mouseAniSpeed = maxAniSpeed;
                }, 500);
                if (isMouseWheel) {
                    return;
                }
                isMouseWheel = true;
            }
        });
        cvs.width = doc.documentElement.clientWidth;
        cvs.height = doc.documentElement.clientHeight;
        makeStars(cvs.width,cvs.height);
        REQ(function () {
            animation(cvs.width, cvs.height);
            skyAnimation();
        })
    }
    function restart() {
        flagRestartStar = true;
        flagRestartSky = true;
        cvs.width = doc.documentElement.clientWidth;
        cvs.height = doc.documentElement.clientHeight;
        makeStars(cvs.width, cvs.height);
        REQ(function () {
            animation(cvs.width, cvs.height);
            skyAnimation();
        })
    }
    function stop() {
        cancelREQ && cancelREQ(tReq);
        flagStop = true;
    }
    function backToStart(fun) {
        stageBack.style.transition = 'all 1s';
        stop();
        stageBack.style.transform = 'translate3d(0,0,0)';
        setTimeout(fun,1000);
    }

    return {
        init: init,
        restart: restart,
        stop: stop,
        backToStart: backToStart
    };

})(document, window, addEvent);