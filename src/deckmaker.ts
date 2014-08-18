module DeckMaker {

    interface TouchEvent {
        touches: any[];
        preventDefault: () => void;
    }

    function find(array, predicate: (element: any, index: number, array: any[]) => boolean): number {
        for (var i = 0; i < array.length; ++i) {
            if (predicate(array[i], i, array))
                return i;
        }
        return -1;
    }

    function distance(x1: number, y1: number, x2: number, y2: number) {
        var dx = x2 - x1;
        var dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function getImageCol(imageData: ImageData, pixel: number): Color {
        pixel *= 4;
        return new Color(
            imageData.data[pixel],
            imageData.data[pixel + 1],
            imageData.data[pixel + 2],
            imageData.data[pixel + 3]);
    }

    function setImageCol(imageData: ImageData, pixel: number, color: Color) {
        pixel *= 4;
        imageData.data[pixel] = color.r;
        imageData.data[pixel + 1] = color.g;
        imageData.data[pixel + 2] = color.b;
        imageData.data[pixel + 3] = color.a;
    }

    // note: change() must modify the pixel, such that match() for that pixel will be false
    interface FloodFillOptions {
        ctx: CanvasRenderingContext2D;
        x: number;
        y: number;
        match: (col: Color) => boolean;
        change: (imageData: ImageData, x: number, y: number, pixel: number) => void;
    }

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

    export interface XY {
        x: number;
        y: number;
    }

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

    export class Shape {
        transform: Transform = new Transform();

        draw(ctx: CanvasRenderingContext2D) {}

        isInside(x: number, y: number): boolean {
            return false;
        }
    }

    export class Options {
        getGroupColor(group: number): string {
            switch (group) {
                case 1:
                    return 'red';
                case 2:
                    return 'blue';
                case 3:
                    return 'green';
                default:
                    return 'white';
            }
        }
    }
    var g_options: Options = new Options();

    export enum TouchState {
        Down, Move, Up, Wheel
    };

    //TODO needed for export on tool - no way to make it private?!!!
    export class Touch {
        constructor(public state: TouchState, public x: number, public y: number,
            public dx: number, public dy: number, public x2 ? : number, public y2 ? : number) {}
    }

    class TouchManager {
        lastX: number = 0;
        lastY: number = 0;
        mouseX: number = 0;
        mouseY: number = 0;
        mouseUpHandler = this.mouseUp.bind(this);
        mouseMoveHandler = this.mouseMove.bind(this);
        touchEndHandler = this.touchEnd.bind(this);
        touchMoveHandler = this.touchMove.bind(this);

        constructor(private parent: HTMLElement, private callback: (touch: Touch) => void) {
            if (typeof this.callback !== 'function')
                return;

            parent.addEventListener('mousedown', this.mouseDown.bind(this));
            parent.addEventListener('mousewheel', this.mouseWheel.bind(this));
            parent.addEventListener('mousemove', this.mouseTrack.bind(this));
            parent.addEventListener('touchstart', this.touchStart.bind(this));
        }

        private sendMouseEvent(e: MouseEvent, state: TouchState) {
            e.preventDefault();

            var x = e.pageX - this.parent.offsetLeft;
            var y = e.pageY - this.parent.offsetTop;

            if (state == TouchState.Down) {
                this.lastX = x;
                this.lastY = y;
            }

            this.callback(new Touch(state, x, y, x - this.lastX, y - this.lastY));

            this.lastX = x;
            this.lastY = y;
        }

        private mouseDown(e: MouseEvent) {
            document.addEventListener('mouseup', this.mouseUpHandler);
            document.addEventListener('mousemove', this.mouseMoveHandler);

            this.sendMouseEvent(e, TouchState.Down);
        }

        private mouseTrack(e: MouseEvent) {
            this.mouseX = e.pageX - this.parent.offsetLeft;
            this.mouseY = e.pageY - this.parent.offsetTop;
        }

        private mouseMove(e: MouseEvent) {
            this.sendMouseEvent(e, TouchState.Move);
        }

        private mouseUp(e: MouseEvent) {
            this.sendMouseEvent(e, TouchState.Up);

            document.removeEventListener('mousemove', this.mouseMoveHandler);
            document.removeEventListener('mouseup', this.mouseUpHandler);
        }

        private mouseWheel(e: WheelEvent) {
            this.callback(new Touch(TouchState.Wheel, this.lastX, this.lastY, e.deltaX, e.deltaY));
        }

        private sendTouchEvent(e: TouchEvent, state: TouchState) {
            e.preventDefault();

            var x;
            var y;

            if (e.touches.length > 0) {
                x = e.touches[0].pageX - this.parent.offsetLeft;
                y = e.touches[0].pageY - this.parent.offsetTop;
            }

            var x2;
            var y2;
            if (e.touches.length > 1) {
                x2 = e.touches[1].pageX - this.parent.offsetLeft;
                y2 = e.touches[1].pageY - this.parent.offsetTop;
            }

            if (state == TouchState.Down) {
                this.lastX = x;
                this.lastY = y;
            }

            this.callback(new Touch(state, x, y, x - this.lastX, y - this.lastY, x2, y2));
            this.lastX = x;
            this.lastY = y;
        }

        private touchStart(e: TouchEvent) {
            document.addEventListener('touchend', this.touchEndHandler);
            document.addEventListener('touchmove', this.touchMoveHandler);

            this.sendTouchEvent(e, TouchState.Down);
        }

        private touchMove(e: TouchEvent) {
            this.sendTouchEvent(e, TouchState.Move);
        }

        private touchEnd(e: TouchEvent) {
            this.sendTouchEvent(e, TouchState.Up);

            document.removeEventListener('touchmove', this.touchMoveHandler);
            document.removeEventListener('touchend', this.touchEndHandler);
        }
    }


    class Template extends Shape {
        private isBack: boolean = false;
        private group: number = 1;
        private count: number = 1;

        constructor(private vertices: number[]) {
            super();
        }

        draw(ctx: CanvasRenderingContext2D) {
            var vertices = this.vertices;
            if (vertices.length < 4)
                return;

            ctx.strokeStyle = g_options.getGroupColor(this.group);
            ctx.lineWidth = 3;

            ctx.beginPath();
            ctx.moveTo(vertices[0], vertices[1])
            for (var i = 2; i < this.vertices.length; i += 2) {
                ctx.lineTo(vertices[i], vertices[i + 1]);
            }
            ctx.closePath();
            ctx.stroke();
        }

        isInside(x: number, y: number): boolean {
            var pos = this.transform.getLocal(x, y);

            // ray-casting algorithm based on
            // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

            var v = this.vertices;
            var inside = false;
            for (var i = 0, j = v.length - 2; i < v.length; j = i, i += 2) {
                var xi = v[i],
                    yi = v[i + 1],
                    xj = v[j],
                    yj = v[j + 1];

                var intersect = ((yi > pos.y) !== (yj > pos.y)) &&
                    (pos.x < xi + (xj - xi) * (pos.y - yi) / (yj - yi));

                if (intersect)
                    inside = !inside;
            }

            return inside;
        }
    }

    class Picture extends Shape {
        private image = new Image();
        width: number = 0;
        height: number = 0;
        private templates: Template[] = [];

        constructor(src: string) {
            super();

            this.setsrc(src);
        }

        draw(ctx: CanvasRenderingContext2D) {
            ctx.drawImage(this.image, 0, 0);
        }

        isInside(x: number, y: number): boolean {
            var pos = this.transform.getLocal(x, y);
            return pos.x >= 0 && pos.x < this.width &&
                pos.y >= 0 && pos.y < this.height;
        }

        setsrc(src: string) {
            this.image.src = src;
            this.width = this.image.width;
            this.height = this.image.height;
        }
    }

    export class Tool {
        hasFocus: boolean = false; // what if two tools have focus???

        constructor(public name: string, public page: Page) {}

        draw(ctx: CanvasRenderingContext2D) {}

        touched(touch: Touch) {}

        isInside(x: number, y: number): boolean {
            return false;
        }
    }

    export class TemplateTool extends Tool {
        constructor(name: string, page: Page) {
            super(name, page);
        }
    }

    export class SelectTool extends Tool {
        constructor(name: string, page: Page) {
            super(name, page);
        }
    }

    export class PanZoomTool extends Tool {
        oldDistance: number;
        oldCX: number;
        oldCY: number;

        constructor(name: string, page: Page) {
            super(name, page);
        }

        touched(touch: Touch) {
            var panZoom = this.page.panZoom;
            var hasChanged = false;

            switch (touch.state) {
                case TouchState.Down:
                    this.hasFocus = true;
                    hasChanged = true;
                    if (typeof touch.x2 !== "undefined") {
                        this.oldDistance = distance(touch.x, touch.y, touch.x2, touch.y2);
                        this.oldCX = (touch.x + touch.x2) >> 1;
                        this.oldCY = (touch.y + touch.y2) >> 1;
                    }
                    break;

                case TouchState.Move:
                    if (typeof touch.x2 !== "undefined") {

                    }
                    panZoom.tx += touch.dx;
                    panZoom.ty += touch.dy;
                    hasChanged = true;
                    break;

                case TouchState.Up:
                    this.hasFocus = false;
                    hasChanged = true;
                    break;

                case TouchState.Wheel:
                    //this.hasFocus = true; wheel is one-shot
                    var scale = (touch.dy > 0 ? 1 / 1.15 : 1.15);
                    panZoom.tx = touch.x - (touch.x - panZoom.tx) * scale;
                    panZoom.ty = touch.y - (touch.y - panZoom.ty) * scale;
                    panZoom.sx *= scale;
                    panZoom.sy *= scale;
                    hasChanged = true;
                    break;
            }

            this.page.rebuildAll();
        }
    }

    export class AlphaFillTool extends Tool {
        private canvas: HTMLCanvasElement;
        private ctx: CanvasRenderingContext2D;

        constructor(name: string, page: Page) {
            super(name, page);

            this.canvas = document.createElement("canvas");
            this.ctx = this.canvas.getContext("2d");
        }

        touched(touch: Touch) {
            if (touch.state !== TouchState.Down)
                return;

            var pictureLayer = this.page.getLayer("picture");
            var picture: Picture = < Picture > pictureLayer.getShapeFromTouch(touch.x, touch.y);
            if (picture === null)
                return;

            var pos = pictureLayer.panZoom.getLocal(touch.x, touch.y);
            pos = picture.transform.getLocal(pos.x, pos.y);

            this.canvas.width = picture.width;
            this.canvas.height = picture.height;

            picture.draw(this.ctx);

            var firstColor: Color;
            var alphaColor = new Color(0, 0, 0, 0);
            var tolerance = 50;

            var imageData = floodFill({
                ctx: this.ctx,
                x: pos.x,
                y: pos.y,
                match: function(col: Color): boolean {
                    if (typeof firstColor === "undefined") {
                        firstColor = col.clone();
                        return true;
                    }
                    return col.a > 0 && // so col does not match alphaColor
                        Math.abs(col.r - firstColor.r) < tolerance &&
                        Math.abs(col.g - firstColor.g) < tolerance &&
                        Math.abs(col.b - firstColor.b) < tolerance;
                },
                change: function(imageData: ImageData, x: number, y: number, pixel: number) {
                    setImageCol(imageData, pixel, alphaColor);
                }
            });

            this.ctx.putImageData(imageData, 0, 0);
            picture.setsrc(this.canvas.toDataURL());

            this.page.rebuildLayer("picture");
        }
    }

    export class AutoTemplateTool extends Tool {
        private canvas: HTMLCanvasElement;
        private ctx: CanvasRenderingContext2D;

        constructor(name: string, page: Page) {
            super(name, page);

            this.canvas = document.createElement("canvas");
            this.ctx = this.canvas.getContext("2d");
        }

        draw(ctx: CanvasRenderingContext2D) {

        }

        touched(touch: Touch) {
            if (touch.state !== TouchState.Down)
                return;

            var pictureLayer = this.page.getLayer("picture");
            var picture: Picture = < Picture > pictureLayer.getShapeFromTouch(touch.x, touch.y);
            if (picture === null)
                return;

            var pos = pictureLayer.panZoom.getLocal(touch.x, touch.y);
            pos = picture.transform.getLocal(pos.x, pos.y);

            this.canvas.width = picture.width;
            this.canvas.height = picture.height;

            picture.draw(this.ctx);

            var used = new Color(0, 0, 0, 0);
            var minX = 1e10;
            var maxX = -1e10;
            var minY = 1e10;
            var maxY = -1e10;

            var imageData = floodFill({
                ctx: this.ctx,
                x: pos.x,
                y: pos.y,
                match: function(col: Color): boolean {
                    return col.a > 1;
                },
                change: function(imageData: ImageData, x: number, y: number, pixel: number) {
                    minX = Math.min(x, minX);
                    maxX = Math.max(x, maxX);
                    minY = Math.min(y, minY);
                    maxY = Math.max(y, maxY);
                    setImageCol(imageData, pixel, used);
                }
            });

            var templateLayer = this.page.getLayer("template");
            var newTemplate = new Template([minX, minY, maxX, minY, maxX, maxY, minX, maxY]);
            newTemplate.transform.copy(picture.transform);

            templateLayer.addShape(newTemplate);

            this.page.rebuildLayer("template");
        }
    }

    export class Layer {
        ctx: CanvasRenderingContext2D;
        canvas: HTMLCanvasElement;
        shapes: Shape[] = [];

        get width(): number {
            return this.canvas.width;
        }

        get height(): number {
            return this.canvas.height;
        }

        constructor(public name: string, public parent: HTMLCanvasElement, public panZoom: Transform) {
            this.canvas = document.createElement("canvas");
            this.canvas.width = parent.width;
            this.canvas.height = parent.height;
            this.ctx = this.canvas.getContext("2d");

            parent.appendChild(this.canvas);
        }

        addShape(shape: Shape) {
            this.shapes.push(shape);
        }

        removeShape(shape: Shape) {
            var i = this.shapes.indexOf(shape);
            if (i !== -1)
                this.shapes.splice(i, 1);
        }

        rebuild() {
            var ctx = this.ctx;
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            ctx.save();
            this.panZoom.draw(this.ctx);

            for (var i = 0; i < this.shapes.length; ++i) {
                ctx.save();
                this.shapes[i].transform.draw(ctx);
                this.shapes[i].draw(ctx);
                ctx.restore();
            }

            ctx.restore();
        }

        getShapeFromTouch(x: number, y: number) {
            var pos: XY = this.panZoom.getLocal(x, y);

            // loop backwards, if shapes overlap then pick the last one
            for (var i = this.shapes.length - 1; i >= 0; --i) {
                var shape = this.shapes[i];
                if (shape.isInside(pos.x, pos.y)) {
                    return shape;
                }
            }

            return null;
        }

        draw(ctx: CanvasRenderingContext2D) {
            ctx.drawImage(this.canvas, 0, 0);
        }
    }

    export class Page {
        private ctx: CanvasRenderingContext2D;
        public panZoom = new Transform();
        private layers: Layer[] = [];

        constructor(public name: string, public parent: HTMLCanvasElement) {
            this.ctx = parent.getContext("2d");
        }

        getLayer(name: string) {
            return this[name];
        }

        createLayer(name: string) {
            var layer = new Layer(name, this.parent, this.panZoom);
            this.layers.push(layer);
            this[name] = layer;
        }

        rebuildLayer(name) {
            var layer = this[name];
            if (!layer)
                return;

            layer.rebuild();
            this.refresh();
        }

        rebuildAll() {
            for (var i = 0; i < this.layers.length; ++i)
                this.layers[i].rebuild();

            this.refresh();
        }

        refresh() {
            this.ctx.clearRect(0, 0, this.parent.width, this.parent.height);

            for (var i = 0; i < this.layers.length; ++i)
                this.layers[i].draw(this.ctx);
        }
    }

    export class Board {
        private touchManager: TouchManager;
        private templates: Template[] = [];
        private tools: Tool[] = [];
        private currentTool: Tool = null;
        private pages: Page[] = [];
        private currentPage: Page = null;
        private toolSet: string = "";
        private alphaFillTool: Tool;
        private autoTemplateTool: Tool;
        private panZoomTool: Tool;


        constructor(public parent: HTMLCanvasElement) {
            this.touchManager = new TouchManager(parent, this.touched.bind(this));

            this.createPage("board");
            this.createPage("deck");
            var cutout1 = this.createPage("cutout1");
            cutout1.createLayer("picture");
            cutout1.createLayer("template");
            cutout1.createLayer("tool");

            this.alphaFillTool = new DeckMaker.AlphaFillTool("alphaFill", cutout1);
            this.autoTemplateTool = new DeckMaker.AutoTemplateTool("autoTemplate", cutout1);
            this.panZoomTool = new DeckMaker.PanZoomTool("panZoom", cutout1);
        }

        private touched(touch: Touch) {
            if (this.currentTool) {
                this.currentTool.touched(touch);

                if (!this.currentTool.hasFocus)
                    this.currentTool = null;
            }

            for (var i = 0; this.currentTool === null && i < this.tools.length; ++i) {
                var tool = this.tools[i];
                tool.touched(touch);
                if (tool.hasFocus)
                    this.currentTool = tool;
            }
        }

        addTool(tool: Tool): Board {
            this.tools.push(tool);
            return this;
        }

        setToolSet(name: string): Board {
            switch (name) {
                case "autoTemplate":
                    this.tools = [this.autoTemplateTool, this.panZoomTool];
                    break;
                case "alphaFill":
                    this.tools = [this.alphaFillTool, this.panZoomTool];
                    break;
            }
            this.toolSet = name;
            return this;
        }

        getToolSet(): string {
            return this.toolSet;
        }

        createPage(name: string): Page {
            var page = new Page(name, this.parent);
            this.pages.push(page);
            this[name] = page;
            this.currentPage = page;
            return page;
        }

        setPage(name: string): Board {
            if (this[name]) {
                this.currentPage = this[name];
                this.refresh();
            }
            return this;
        }

        getPage(): string {
            return this.currentPage.name;
        }

        addPicture(src: string) {
            var newPicture = new Picture(src);
            newPicture.transform.translate(10, 10);
            this.currentPage.getLayer("picture").addShape(newPicture);
            this.currentPage.rebuildLayer("picture");
        }

        refresh() {
            this.currentPage.refresh();
        }
    }
}
