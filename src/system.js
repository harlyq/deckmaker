// Copyright 2014 Reece Elliott
var DeckMaker;
(function (DeckMaker) {
    var env = {};

    function setEnv(key, value) {
        env[key] = value;
    }
    DeckMaker.setEnv = setEnv;

    function getEnv(key) {
        return env[key];
    }
    DeckMaker.getEnv = getEnv;

    function find(array, predicate) {
        for (var i = 0; i < array.length; ++i) {
            if (predicate(array[i], i, array))
                return i;
        }
        return -1;
    }
    DeckMaker.find = find;

    function distance(x1, y1, x2, y2) {
        var dx = x2 - x1;
        var dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }
    DeckMaker.distance = distance;

    function getImageCol(imageData, pixel) {
        pixel *= 4;
        return new Color(imageData.data[pixel], imageData.data[pixel + 1], imageData.data[pixel + 2], imageData.data[pixel + 3]);
    }
    DeckMaker.getImageCol = getImageCol;

    function setImageCol(imageData, pixel, color) {
        pixel *= 4;
        imageData.data[pixel] = color.r;
        imageData.data[pixel + 1] = color.g;
        imageData.data[pixel + 2] = color.b;
        imageData.data[pixel + 3] = color.a;
    }
    DeckMaker.setImageCol = setImageCol;

    

    function floodFill(options) {
        var x = ~~options.x;
        var y = ~~options.y;
        var match = options.match;
        var change = options.change;
        var ctx = options.ctx;

        var width = ctx.canvas.width;
        var height = ctx.canvas.height;
        var imageData = ctx.getImageData(0, 0, width, height);
        var pixel = (y * width + x);

        if (!match(getImageCol(imageData, pixel)))
            return null;

        var pixelStack = [];
        pixelStack.push(x, y);

        while (pixelStack.length) {
            y = pixelStack.pop();
            x = pixelStack.pop();

            var startX = x;
            pixel = (y * width + x);

            do {
                --x;
                --pixel;
            } while(x >= 0 && match(getImageCol(imageData, pixel)));
            ++x;
            ++pixel;

            var captureUp = true;
            var captureDown = true;
            var matchUp = false;
            var matchDown = false;
            do {
                change(imageData, x, y, pixel);

                matchUp = y > 0 && match(getImageCol(imageData, pixel - width));
                matchDown = y < height - 1 && match(getImageCol(imageData, pixel + width));

                // if we are capturing and there is a free space above or below then remember it
                if (captureUp && matchUp)
                    pixelStack.push(x, y - 1);

                if (captureDown && matchDown)
                    pixelStack.push(x, y + 1);

                // if there is not a free space above or below then start a capture
                captureUp = !matchUp;
                captureDown = !matchDown;
                ++x;
                ++pixel;
                // don't need to match while x <= startX because we have already matched it before
            } while(x < width && (x <= startX || match(getImageCol(imageData, pixel))));
        }

        return imageData;
    }
    DeckMaker.floodFill = floodFill;

    //---------------------------------
    // values in range [0,255]
    var Color = (function () {
        function Color(r, g, b, a) {
            if (typeof a === "undefined") { a = 255; }
            this.r = r;
            this.g = g;
            this.b = b;
            this.a = a;
        }
        Color.prototype.copy = function (other) {
            this.r = other.r;
            this.g = other.g;
            this.b = other.b;
            this.a = other.a;
            return this;
        };

        Color.prototype.clone = function () {
            return new Color(this.r, this.g, this.b, this.a);
        };
        return Color;
    })();
    DeckMaker.Color = Color;

    

    //---------------------------------
    var Transform = (function () {
        function Transform() {
            this.sx = 1;
            this.sy = 1;
            this.tx = 0;
            this.ty = 0;
        }
        Transform.prototype.copy = function (other) {
            this.sx = other.sx;
            this.sy = other.sy;
            this.tx = other.tx;
            this.ty = other.ty;
            return this;
        };

        Transform.prototype.clone = function () {
            return new Transform().copy(this);
        };

        Transform.prototype.translate = function (x, y) {
            this.tx += x;
            this.ty += y;
            return this;
        };

        Transform.prototype.scale = function (sx, sy) {
            this.sx *= sx;
            this.sy *= sy;
            return this;
        };

        Transform.prototype.multiply = function (other) {
            this.sx *= other.sx;
            this.sy *= other.sy;
            this.tx += other.tx;
            this.ty += other.ty;
            return this;
        };

        Transform.prototype.setIdentity = function () {
            this.sx = this.sy = 1;
            this.tx = this.ty = 0;
            return this;
        };

        Transform.prototype.draw = function (ctx) {
            ctx.transform(this.sx, 0, 0, this.sy, this.tx, this.ty);
        };

        Transform.prototype.getLocal = function (x, y) {
            return {
                x: (x - this.tx) / this.sx,
                y: (y - this.ty) / this.sy
            };
        };

        Transform.prototype.getGlobal = function (lx, ly) {
            return {
                x: lx * this.sx + this.tx,
                y: ly * this.sy + this.ty
            };
        };
        return Transform;
    })();
    DeckMaker.Transform = Transform;
})(DeckMaker || (DeckMaker = {}));
