module DeckMaker {

    var env: {
        [key: string]: any
    } = {};

    function setEnv(key: string, value: any) {
        env[key] = value;
    }

    function getEnv(key: string): any {
        return env[key];
    }

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

    //---------------------------------
    export class Shape {
        transform: Transform = new Transform();

        draw(ctx: CanvasRenderingContext2D) {}

        isInside(x: number, y: number): boolean {
            return false;
        }
    }

    //---------------------------------
    export enum TouchState {
        Down, Move, Up, Wheel
    };

    //---------------------------------
    //TODO needed for export on tool - no way to make it private?!!!
    export class Touch {
        constructor(public state: TouchState, public x: number, public y: number,
            public dx: number, public dy: number, public x2 ? : number, public y2 ? : number) {}
    }

    //---------------------------------
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


    //---------------------------------
    export class Template extends Shape {
        private vertices: number[];
        private isBack: boolean = false;
        count: number = 1;
        width: number = 0;
        height: number = 0;

        constructor(vertices: number[], private deck: Deck, private page: LayerPage) {
            super();
            this.setVertices(vertices);
        }

        setVertices(vertices: number[]) {
            this.vertices = vertices;

            var minX = 1e10;
            var maxX = -1e10;
            var minY = 1e10;
            var maxY = -1e10;

            for (var i = 0; i < vertices.length; i += 2) {
                var x = vertices[i];
                var y = vertices[i + 1];

                minX = Math.min(x, minX);
                maxX = Math.max(x, maxX);
                minY = Math.min(y, minY);
                maxY = Math.max(y, maxY);
            }

            this.width = maxX - minX;
            this.height = maxY - minY;
        }

        draw(ctx: CanvasRenderingContext2D) {
            var vertices = this.vertices;
            if (vertices.length < 4)
                return;

            ctx.strokeStyle = this.deck.color;
            ctx.lineWidth = 3;

            ctx.beginPath();
            ctx.moveTo(vertices[0], vertices[1]);
            for (var i = 2; i < this.vertices.length; i += 2) {
                ctx.lineTo(vertices[i], vertices[i + 1]);
            }
            ctx.closePath();
            ctx.stroke();
        }

        drawCard(ctx: CanvasRenderingContext2D, cardWidth: number, cardHeight: number) {
            ctx.save();

            var pictureLayer = this.page.getLayer("picture");
            var tx = this.transform.tx;
            var ty = this.transform.ty;
            var w = this.width;
            var h = this.height;
            ctx.drawImage(pictureLayer.canvas, tx, ty, w, h, 0, 0, cardWidth, cardHeight);

            ctx.restore();
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

    //---------------------------------
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

    //---------------------------------
    export class Tool {
        hasFocus: boolean = false; // what if two tools have focus???

        constructor(public name: string) {}

        draw(ctx: CanvasRenderingContext2D) {}

        touched(touch: Touch) {}

        isInside(x: number, y: number): boolean {
            return false;
        }
    }

    //---------------------------------
    export class TemplateTool extends Tool {
        constructor(name: string) {
            super(name);
        }
    }

    //---------------------------------
    export class SelectTool extends Tool {
        constructor(name: string) {
            super(name);
        }
    }

    //---------------------------------
    export class PanZoomTool extends Tool {
        oldDistance: number;
        oldCX: number;
        oldCY: number;

        constructor(name: string) {
            super(name);
        }

        touched(touch: Touch) {
            var page = getEnv("page");
            var panZoom = page.panZoom;
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

            page.refresh();
        }
    }

    //---------------------------------
    export class AlphaFillTool extends Tool {
        private canvas: HTMLCanvasElement;
        private ctx: CanvasRenderingContext2D;

        constructor(name: string) {
            super(name);

            this.canvas = document.createElement("canvas");
            this.ctx = this.canvas.getContext("2d");
        }

        touched(touch: Touch) {
            if (touch.state !== TouchState.Down)
                return;

            var layerPage = getEnv("layerPage");
            if (!layerPage)
                return;

            var pos = layerPage.panZoom.getLocal(touch.x, touch.y);
            var pictureLayer = layerPage.getLayer("picture");
            var picture: Picture = < Picture > pictureLayer.getShapeFromTouch(pos.x, pos.y);
            if (picture === null)
                return;

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

            layerPage.rebuildLayer("picture");
        }
    }

    //---------------------------------
    export class AutoTemplateTool extends Tool {
        private canvas: HTMLCanvasElement;
        private ctx: CanvasRenderingContext2D;

        constructor(name: string) {
            super(name);

            this.canvas = document.createElement("canvas");
            this.ctx = this.canvas.getContext("2d");
        }

        draw(ctx: CanvasRenderingContext2D) {

        }

        touched(touch: Touch) {
            if (touch.state !== TouchState.Down)
                return;

            var layerPage = getEnv("layerPage");
            var deck = getEnv("deck");
            if (!layerPage || !deck)
                return;

            var pos = layerPage.panZoom.getLocal(touch.x, touch.y);
            var pictureLayer = layerPage.getLayer("picture");
            var picture: Picture = < Picture > pictureLayer.getShapeFromTouch(pos.x, pos.y);
            if (picture === null)
                return;

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

            if (minX === 1e10 || minY === 1e10)
                return; // no shape detected

            var templateLayer = layerPage.getLayer("template");
            var newTemplate = deck.createTemplate(
                [0, 0, maxX - minX, 0, maxX - minX, maxY - minY, 0, maxY - minY],
                layerPage);
            newTemplate.transform.copy(picture.transform);
            newTemplate.transform.translate(minX, minY); // top left

            templateLayer.addShape(newTemplate);

            layerPage.rebuildLayer("template");
        }
    }

    //---------------------------------
    export class Layer {
        parent: HTMLCanvasElement;
        ctx: CanvasRenderingContext2D;
        canvas: HTMLCanvasElement;
        shapes: Shape[] = [];

        get width(): number {
            return this.canvas.width;
        }

        get height(): number {
            return this.canvas.height;
        }

        constructor(public name: string) {}

        setParent(parent: HTMLCanvasElement) {
            this.parent = parent;

            this.canvas = document.createElement("canvas");
            this.canvas.width = 1000;
            this.canvas.height = 1000;
            this.ctx = this.canvas.getContext("2d");
        }

        addShape(shape: Shape): Layer {
            this.shapes.push(shape);
            return this;
        }

        removeShape(shape: Shape) {
            var i = this.shapes.indexOf(shape);
            if (i !== -1)
                this.shapes.splice(i, 1);
        }

        rebuild() {
            var ctx = this.ctx;
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            for (var i = 0; i < this.shapes.length; ++i) {
                ctx.save();
                this.shapes[i].transform.draw(ctx);
                this.shapes[i].draw(ctx);
                ctx.restore();
            }
        }

        getShapeFromTouch(x: number, y: number) {
            // loop backwards, if shapes overlap then pick the last one
            for (var i = this.shapes.length - 1; i >= 0; --i) {
                var shape = this.shapes[i];
                if (shape.isInside(x, y)) {
                    return shape;
                }
            }

            return null;
        }

        draw(ctx: CanvasRenderingContext2D) {
            ctx.drawImage(this.canvas, 0, 0);
        }
    }

    //---------------------------------
    export class Page {
        parent: HTMLCanvasElement
        ctx: CanvasRenderingContext2D;
        panZoom = new Transform();

        constructor(public name: string) {}

        setParent(parent: HTMLCanvasElement): Page {
            this.parent = parent;
            this.ctx = parent.getContext("2d");

            return this;
        }

        rebuild() {

        }

        refresh() {

        }
    }

    //---------------------------------
    export class LayerPage extends Page {
        private layers: Layer[] = [];

        setParent(parent: HTMLCanvasElement): LayerPage {
            super.setParent(parent);

            for (var i = 0; i < this.layers.length; ++i) {
                this.layers[i].setParent(parent);
            }

            return this;
        }

        getLayer(name: string): Layer {
            for (var i = 0; i < this.layers.length; ++i) {
                if (this.layers[i].name === name)
                    return this.layers[i];
            }
            return null;
        }

        addLayer(layer: Layer): LayerPage {
            layer.setParent(this.parent);

            this.layers.push(layer);
            return this;
        }

        rebuildLayer(name) {
            var layer = this.getLayer(name);
            if (layer === null)
                return;

            layer.rebuild();
            this.refresh();
        }

        rebuild() {
            for (var i = 0; i < this.layers.length; ++i)
                this.layers[i].rebuild();

            this.refresh();
        }

        refresh() {
            var ctx = this.ctx;
            ctx.clearRect(0, 0, this.parent.width, this.parent.height);

            ctx.save();
            this.panZoom.draw(ctx);
            for (var i = 0; i < this.layers.length; ++i)
                this.layers[i].draw(ctx);
            ctx.restore();
        }
    }

    //---------------------------------
    export class DeckPage extends Page {
        deck: Deck;
        deckCtx: CanvasRenderingContext2D;
        deckCanvas: HTMLCanvasElement;

        constructor(name: string) {
            super(name);
        }

        setParent(parent: HTMLCanvasElement): DeckPage {
            super.setParent(parent);

            this.deckCanvas = document.createElement("canvas");
            this.deckCanvas.width = 1000;
            this.deckCanvas.height = 1000;
            this.deckCtx = this.deckCanvas.getContext("2d");

            return this;
        }

        rebuild() {
            this.deckCtx.clearRect(0, 0, this.deckCanvas.width, this.deckCanvas.height);

            var deck = getEnv("deck");
            if (deck)
                deck.draw(this.deckCtx)
        }

        refresh() {
            var ctx = this.ctx;
            ctx.clearRect(0, 0, this.parent.width, this.parent.height);

            ctx.save();
            this.panZoom.draw(ctx);
            ctx.drawImage(this.deckCanvas, 0, 0);
            ctx.restore();
        }
    }

    //---------------------------------
    export class Deck {
        id: number;
        color: string;
        cardWidth: number;
        cardHeight: number;
        maxWidth: number;
        width: number;
        height: number;
        private templates: Template[] = [];

        private static uniqueID: number = 1;
        private static colors: string[] = [
            "red", "green", "blue", "yellow", "white", "grey", "orange", "brown"
        ];
        private static colorIndex: number = 0;

        constructor(public name: string) {
            this.id = Deck.uniqueID++;
            this.color = Deck.colors[Deck.colorIndex++];
            Deck.colorIndex = (Deck.colorIndex % Deck.colors.length);
        }

        createTemplate(vertices: number[], page): Template {
            var template = new Template(vertices, this, page);
            this.templates.push(template);
            return template;
        }

        draw(ctx) {
            var pad = 10;
            var x = pad;
            var y = pad;
            var maxHeight = 0;
            var cardWidth;
            var cardHeight;
            var templates = this.templates;

            if (templates.length > 0) {
                this.cardWidth = templates[0].width;
                this.cardHeight = templates[0].height;
            }

            for (var i = 0; i < templates.length; ++i) {
                var template = templates[i];

                if (x + this.cardWidth + pad > this.maxWidth) {
                    x = pad
                    y += this.cardHeight + pad;
                }

                ctx.save();
                ctx.translate(x, y);
                template.drawCard(ctx, this.cardWidth, this.cardHeight);

                ctx.strokeStyle = this.color;
                ctx.lineWidth = 3;
                ctx.strokeRect(0, 0, this.cardWidth, this.cardHeight);
                ctx.restore();

                x += this.cardWidth + pad;
            }

            this.width = x;
            this.height = y + cardHeight + pad;
        }
    }

    //---------------------------------
    export class Board {
        private touchManager: TouchManager;
        private pages: Page[] = [];
        private decks: Deck[] = [];
        private page: Page = null;
        private deck: Deck = null;
        private tools: Tool[] = [];
        private currentTool: Tool = null;

        constructor(public parent: HTMLCanvasElement) {
            this.touchManager = new TouchManager(parent, this.touched.bind(this));
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

        setTools(tools: Tool[]): Board {
            this.tools = tools;
            return this;
        }

        addDeck(deck: Deck): Board {
            this.decks.push(deck);
            return this;
        }

        addPage(page: Page): Board {
            this.pages.push(page);
            page.setParent(this.parent);
            return this;
        }

        setPageByName(name: string): Board {
            var i = find(this.pages, (x) => x.name === name);
            if (i !== -1) {
                this.setPage(this.pages[i]);
            }

            return this;
        }

        setPage(page: Page) {
            setEnv("page", page);
            setEnv("layerPage", (page instanceof LayerPage ? page : undefined));

            this.page = page;
            this.page.rebuild();
            this.refresh();
        }

        getPageName(): string {
            return this.page.name;
        }

        setDeckByName(name: string): Board {
            var i = find(this.decks, (x) => x.name === name);
            if (i !== -1) {
                this.setDeck(this.decks[i]);
            }

            return this;
        }

        getDeckName(): string {
            return this.deck.name;
        }

        setDeck(deck: Deck) {
            setEnv("deck", deck);

            this.deck = deck;
            this.page.rebuild();
            this.refresh();
        }

        // this looks like a tool
        addPicture(src: string) {
            var layerPage = getEnv("layerPage");
            if (!layerPage)
                return;

            var pictureLayer = layerPage.getLayer("picture");
            if (!pictureLayer)
                return;

            var newPicture = new Picture(src);
            newPicture.transform.translate(10, 10);
            pictureLayer.addShape(newPicture);
            layerPage.rebuildLayer("picture");
        }

        refresh() {
            this.page.refresh();
        }
    }
}
