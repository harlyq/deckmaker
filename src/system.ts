// Copyright 2014 Reece Elliott

module DeckMaker {

    var env: {
        [key: string]: any
    } = {};

    export

    function setEnv(key: string, value: any) {
        env[key] = value;
    }

    export

    function getEnv(key: string): any {
        return env[key];
    }

    export

    function find(array, predicate: (element: any, index: number, array: any[]) => boolean): number {
        for (var i = 0; i < array.length; ++i) {
            if (predicate(array[i], i, array))
                return i;
        }
        return -1;
    }

    export

    function distance(x1: number, y1: number, x2: number, y2: number) {
        var dx = x2 - x1;
        var dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    export

    function getImageCol(imageData: ImageData, pixel: number): Color {
        pixel *= 4;
        return new Color(
            imageData.data[pixel],
            imageData.data[pixel + 1],
            imageData.data[pixel + 2],
            imageData.data[pixel + 3]);
    }

    export

    function setImageCol(imageData: ImageData, pixel: number, color: Color) {
        pixel *= 4;
        imageData.data[pixel] = color.r;
        imageData.data[pixel + 1] = color.g;
        imageData.data[pixel + 2] = color.b;
        imageData.data[pixel + 3] = color.a;
    }

    // note: change() must modify the pixel, such that match() for that pixel will be false
    export interface FloodFillOptions {
        ctx: CanvasRenderingContext2D;
        x: number;
        y: number;
        match: (col: Color) => boolean;
        change: (imageData: ImageData, x: number, y: number, pixel: number) => void;
    }

    export

    function floodFill(options: FloodFillOptions): ImageData {
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
            return null; // first pixel does not match, cannot fill

        var pixelStack = [];
        pixelStack.push(x, y);

        while (pixelStack.length) {
            y = pixelStack.pop();
            x = pixelStack.pop();

            var startX = x;
            pixel = (y * width + x);

            // find the left most matching pixel
            do {
                --x;
                --pixel;
            } while (x >= 0 && match(getImageCol(imageData, pixel)));
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
            } while (x < width && (x <= startX || match(getImageCol(imageData, pixel))));
        }

        return imageData;
    }

    //---------------------------------
    // values in range [0,255]
    export class Color {
        constructor(public r: number, public g: number, public b: number, public a: number = 255) {}

        copy(other: Color): Color {
            this.r = other.r;
            this.g = other.g;
            this.b = other.b;
            this.a = other.a;
            return this;
        }

        clone(): Color {
            return new Color(this.r, this.g, this.b, this.a);
        }
    }

    //---------------------------------
    export interface XY {
        x: number;
        y: number;
    }

    //---------------------------------
    export class Transform {
        sx: number = 1;
        sy: number = 1;
        tx: number = 0;
        ty: number = 0;

        copy(other: Transform): Transform {
            this.sx = other.sx;
            this.sy = other.sy;
            this.tx = other.tx;
            this.ty = other.ty;
            return this;
        }

        clone(): Transform {
            return new Transform().copy(this);
        }

        translate(x: number, y: number): Transform {
            this.tx += x;
            this.ty += y;
            return this;
        }

        scale(sx: number, sy: number): Transform {
            this.sx *= sx;
            this.sy *= sy;
            return this;
        }

        multiply(other: Transform): Transform {
            this.sx *= other.sx;
            this.sy *= other.sy;
            this.tx += other.tx;
            this.ty += other.ty;
            return this;
        }

        setIdentity(): Transform {
            this.sx = this.sy = 1;
            this.tx = this.ty = 0;
            return this;
        }

        draw(ctx: CanvasRenderingContext2D) {
            ctx.transform(this.sx, 0, 0, this.sy, this.tx, this.ty);
        }

        getLocal(x: number, y: number): XY {
            return {
                x: (x - this.tx) / this.sx,
                y: (y - this.ty) / this.sy
            };
        }

        getGlobal(lx: number, ly: number): XY {
            return {
                x: lx * this.sx + this.tx,
                y: ly * this.sy + this.ty
            };
        }
    }


}
