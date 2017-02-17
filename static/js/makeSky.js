/**
 * Created by sens on 2017/2/17.
 */
var addEvent = (function(window, undefined) {
    var _eventCompat = function(event) {
        var type = event.type;
        if (type == 'DOMMouseScroll' || type == 'mousewheel') {
            event.delta = (event.wheelDelta) ? event.wheelDelta / 120 : -(event.detail || 0) / 3;
        }
        //alert(event.delta);
        if (event.srcElement && !event.target) {
            event.target = event.srcElement;
        }
        if (!event.preventDefault && event.returnValue !== undefined) {
            event.preventDefault = function() {
                event.returnValue = false;
            };
        }
        /*
         ......其他一些兼容性处理 */
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
    var REQ = window.requestAnimationFrame || window.webkitRequestAnimationFrame;
    var cvs = doc.getElementById('wrapper-cvs');
    var ctx = cvs.getContext('2d');
    cvs.width = doc.documentElement.clientWidth;
    cvs.height = doc.documentElement.clientHeight;

    var stageBack = doc.getElementById('j-stage-block-back'),
        hue = 217,
        stars = [],
        count = 0,
        far = 0,
        maxStars = 500,
        canvas2 = document.createElement('canvas'),
        ctx2 = canvas2.getContext('2d');

    canvas2.width = 100;
    canvas2.height = 100;
    var half = canvas2.width / 2;
    var gradient2 = ctx2.createRadialGradient(half, half, 0, half, half, half);
    var flagRestartStar = false;
    var flagRestartSky = false;

    gradient2.addColorStop(0.025, '#CCC');
    gradient2.addColorStop(0.1, 'hsl(' + hue + ', 61%, 33%)');
    gradient2.addColorStop(0.25, 'hsl(' + hue + ', 64%, 6%)');
    gradient2.addColorStop(1, 'transparent');

    ctx2.fillStyle = gradient2;
    ctx2.beginPath();
    ctx2.arc(half, half, half, 0, Math.PI * 2);
    ctx2.fill();

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

    Star = function (w,h) {
        this.orbitRadius = random(maxOrbit(w, h));
        this.radius = random(60, this.orbitRadius) / 8;
        this.orbitX = w / 2;
        this.orbitY = h / 2;
        this.timePassed = random(0, maxStars);
        this.speed = random(this.orbitRadius) / 50000;
        this.alpha = random(2, 10) / 10;

        count++;
        stars[count] = this;
    };

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


    var isMouseWheel = false;
    var synMouseWheel;
    var minAniSpeed = 0.2;
    var ratioAniSpeed = 1 / minAniSpeed;
    var maxAniSpeed = 1;
    var mouseAniSpeed = minAniSpeed;

    function animation(w,h) {
        if(flagRestartStar) {
            flagRestartStar = false;
            return;
        }
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

    function skyAnimation() {
        if(flagRestartSky) {
            flagRestartSky = false;
            return;
        }
        if (far < 800) {
            if (isMouseWheel) {
                mouseAniSpeed = maxAniSpeed;
                far += maxAniSpeed;
            }
            else {
                mouseAniSpeed = mouseAniSpeed > minAniSpeed ? mouseAniSpeed - 0.01 : minAniSpeed;
                far += mouseAniSpeed;
            }
            stageBack.style.transform = 'translate3d(0,0,' + far + 'px)';
            REQ(skyAnimation);
        }
    }

    function makeStars(w,h) {
        count = 0;
        for (var i = 0; i < maxStars; i++) {
            new Star(w,h);
        }
    }

    function init() {
        addEvent(doc.body, "mousewheel", function (event) {
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

    return {
        init: init,
        restart: restart
    };

})(document, window, addEvent);