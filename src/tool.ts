// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module DeckMaker {

    //---------------------------------
    export class Tool {
        hasFocus: boolean = false; // what if two tools have focus???

        touched(touch: Touch) {}

        isInside(x: number, y: number): boolean {
            return false;
        }

        draw(ctx: CanvasRenderingContext2D) {}
    }

    //---------------------------------
    export class LocationTool extends Tool {
        private x1: number = 0;
        private x2: number = 0;
        private y1: number = 0;
        private y2: number = 0;

        constructor() {
            super();
        }

        touched(touch: Touch) {
            var page: Page = getEnv("page");
            if (!page)
                return;

            var templateLayer = page.getLayer(TemplateLayer);
            var toolLayer = page.getLayer(ToolLayer);
            if (!toolLayer || !templateLayer)
                return;

            var panZoom = page.panZoom;
            var pos = panZoom.getLocal(touch.x, touch.y);
            var isUsed = false;

            switch (touch.state) {
                case TouchState.Down:
                    this.hasFocus = isUsed = true;
                    this.x1 = this.x2 = pos.x;
                    this.y1 = this.y2 = pos.y;
                    toolLayer.addTool(this);
                    break;

                case TouchState.Move:
                    if (this.hasFocus) {
                        this.x2 = pos.x;
                        this.y2 = pos.y;
                        isUsed = true;
                    }
                    break;

                case TouchState.Up:
                    if (this.hasFocus) {
                        if (this.x2 !== this.x1 && this.y2 !== this.y1) {
                            page.getCommandList().addCommand(new LocationCommand(
                                this.x1, this.y1, this.x2 - this.x1, this.y2 - this.y1));
                        }
                        this.hasFocus = false;
                        toolLayer.removeTool(this);
                        isUsed = true;
                    }
                    break;
            }

            if (isUsed) {
                toolLayer.rebuild();
                page.refresh();
            }
        }

        draw(ctx: CanvasRenderingContext2D) {
            if (!this.hasFocus)
                return;

            ctx.save();
            ctx.strokeStyle = "blue";
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(this.x1, this.y1, this.x2 - this.x1, this.y2 - this.y1);
            ctx.restore();
        }
    }

    //---------------------------------
    class LocationCommand implements Command {
        location: Location;
        templateLayer: Layer;
        page: Page;

        constructor(x: number, y: number, w: number, h: number) {
            this.location = new Location(w, h);
            this.location.getTransform().translate(x, y);
            this.page = getEnv("page");
            this.templateLayer = this.page.getLayer(TemplateLayer);
        }

        redo() {
            this.templateLayer.addShapes([this.location]);
            this.templateLayer.rebuild();
            this.page.refresh();
        }

        undo() {
            this.templateLayer.removeShapes([this.location]);
            this.templateLayer.rebuild();
            this.page.refresh();
        }
    }

    //---------------------------------
    export class PanZoomTool extends Tool {
        oldDistance: number;
        oldCX: number;
        oldCY: number;

        constructor() {
            super();
        }

        touched(touch: Touch) {
            var page: Page = getEnv("page");
            var panZoom = page.panZoom;
            var isUsed = false;

            switch (touch.state) {
                case TouchState.Down:
                    this.hasFocus = true;
                    isUsed = true;
                    if (typeof touch.x2 !== "undefined") {
                        this.oldDistance = distance(touch.x, touch.y, touch.x2, touch.y2);
                        this.oldCX = (touch.x + touch.x2) >> 1;
                        this.oldCY = (touch.y + touch.y2) >> 1;
                    }
                    break;

                case TouchState.Move:
                    if (this.hasFocus) {
                        panZoom.tx += touch.dx;
                        panZoom.ty += touch.dy;
                        isUsed = true;
                    }
                    break;

                case TouchState.Up:
                    if (this.hasFocus) {
                        this.hasFocus = false;
                        isUsed = true;
                    }
                    break;

                case TouchState.Wheel:
                    //this.hasFocus = true; wheel is one-shot
                    var scale = (touch.dy > 0 ? 1 / 1.15 : 1.15);
                    panZoom.tx = touch.x - (touch.x - panZoom.tx) * scale;
                    panZoom.ty = touch.y - (touch.y - panZoom.ty) * scale;
                    panZoom.sx *= scale;
                    panZoom.sy *= scale;
                    isUsed = true;
                    break;
            }

            if (isUsed)
                page.refresh();
        }
    }

    //---------------------------------
    export class AlphaFillTool extends Tool {
        private canvas: HTMLCanvasElement;
        private ctx: CanvasRenderingContext2D;

        constructor() {
            super();

            this.canvas = document.createElement("canvas");
            this.ctx = this.canvas.getContext("2d");
        }

        touched(touch: Touch) {
            if (touch.state !== TouchState.Down)
                return;

            var page: Page = getEnv("page");
            if (!page)
                return;

            var pos = page.panZoom.getLocal(touch.x, touch.y);
            var pictureLayer = page.getLayer(PictureLayer);
            if (!pictureLayer)
                return;

            var shape = pictureLayer.getShapeFromXY(pos.x, pos.y);
            if (!shape || !(shape instanceof Picture))
                return;

            var picture = < Picture > shape;
            pos = picture.getTransform().getLocal(pos.x, pos.y);

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
            picture.setSrc(this.canvas.toDataURL());

            pictureLayer.rebuild();
            page.refresh();
        }
    }

    //---------------------------------
    export class AutoTemplateTool extends Tool {
        private canvas: HTMLCanvasElement;
        private ctx: CanvasRenderingContext2D;

        constructor() {
            super();

            this.canvas = document.createElement("canvas");
            this.ctx = this.canvas.getContext("2d");
        }

        touched(touch: Touch) {
            if (touch.state !== TouchState.Down)
                return;

            var page: Page = getEnv("page");
            var deck: Deck = getEnv("deck");
            if (!page || !deck)
                return;

            var pictureLayer = page.getLayer(PictureLayer);
            var templateLayer = page.getLayer(TemplateLayer);
            if (!pictureLayer || !templateLayer)
                return;

            var pos = page.panZoom.getLocal(touch.x, touch.y);
            var shape = pictureLayer.getShapeFromXY(pos.x, pos.y);
            if (shape === null)
                return;

            pos = shape.getTransform().getLocal(pos.x, pos.y);

            this.canvas.width = shape.width;
            this.canvas.height = shape.height;

            shape.draw(this.ctx);

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

            var newTemplate = new Template(
                [0, 0, maxX - minX, 0, maxX - minX, maxY - minY, 0, maxY - minY],
                page);
            newTemplate.getTransform().copy(shape.getTransform());
            newTemplate.getTransform().translate(minX, minY); // top left

            page.getCommandList().addCommand(new AutoTemplateCommand([newTemplate]));
        }
    }

    //---------------------------------
    class AutoTemplateCommand implements Command {
        templates: Template[] = [];
        page: Page;
        deck: Deck;
        templateLayer: Layer;

        constructor(templates: Template[]) {
            this.templates = templates.slice(); // copy

            this.deck = getEnv("deck");
            this.page = getEnv("page");
            this.templateLayer = this.page.getLayer(TemplateLayer);
        }

        redo() {
            this.deck.addTemplates(this.templates);
            this.templateLayer.addShapes(this.templates);
            this.templateLayer.rebuild();
            this.page.refresh();
        }

        undo() {
            this.deck.removeTemplates(this.templates);
            this.templateLayer.removeShapes(this.templates);
            this.templateLayer.rebuild();
            this.page.refresh();
        }
    }

    //---------------------------------
    export class PictureTool extends Tool {
        addPicture(src: string) {
            var page: Page = getEnv("page");
            if (!page)
                return;

            if (!page.getLayer(PictureLayer))
                return;

            page.getCommandList().addCommand(new PictureCommand(src));
        }
    }

    //---------------------------------
    class PictureCommand implements Command {
        picture: Picture;
        page: Page;
        pictureLayer: Layer;

        constructor(src: string) {
            this.picture = new Picture(src);
            this.picture.getTransform().translate(10, 10);
            this.page = getEnv("page");
            this.pictureLayer = this.page.getLayer(PictureLayer);
        }

        redo() {
            this.pictureLayer.addShapes([this.picture]);
            this.pictureLayer.rebuild();
            this.page.refresh();
        }

        undo() {
            this.pictureLayer.removeShapes([this.picture]);
            this.pictureLayer.rebuild();
            this.page.refresh();
        }
    }

    //---------------------------------
    export class UndoRedoTool extends Tool {
        undo() {
            var page = getEnv("page");
            page.getCommandList().undo();
            page.rebuild();
        }

        redo() {
            var page = getEnv("page");
            page.getCommandList().redo();
            page.rebuild();
        }
    }

    //---------------------------------
    export class MoveTool extends Tool {
        oldTransforms: Transform[] = [];

        touched(touch: Touch) {
            var page: Page = getEnv("page");
            if (!page)
                return;

            var toolLayer = page.getLayer(ToolLayer);
            var pictureLayer = page.getLayer(PictureLayer);
            var templateLayer = page.getLayer(TemplateLayer);
            if (!toolLayer || (!pictureLayer || !templateLayer))
                return; // nothing to move

            var pos = page.panZoom.getLocal(touch.x, touch.y);
            var selection = page.getSelection();
            var groupShape = selection.getSelectGroup();
            var hadFocus = this.hasFocus;

            switch (touch.state) {
                case TouchState.Down:
                    var shape: Shape = null;

                    var templateShape = templateLayer.getShapeFromXY(pos.x, pos.y);
                    if (templateShape) {
                        shape = templateShape;
                    } else {
                        var pictureShape = pictureLayer.getShapeFromXY(pos.x, pos.y);
                        if (pictureShape)
                            shape = pictureShape;
                    }

                    if (shape) {
                        if (!groupShape.contains(shape))
                            groupShape.setShapes([shape]);

                        var shapes = selection.getSelectedShapes();
                        this.oldTransforms.length = 0;
                        for (var i = 0; i < shapes.length; ++i)
                            this.oldTransforms[i] = shapes[i].getTransform().clone();

                        toolLayer.addShapes([groupShape]);
                        this.hasFocus = true;
                    }
                    break;

                case TouchState.Move:
                    if (this.hasFocus) {
                        groupShape.getTransform().translate(touch.dx, touch.dy);
                    }
                    break;

                case TouchState.Up:
                    if (this.hasFocus) {
                        groupShape.applyTransformToShapes();
                        pictureLayer.rebuild();
                        templateLayer.rebuild();

                        var shapes = selection.getSelectedShapes();
                        var moveCommand = new MoveCommand(shapes, this.oldTransforms);
                        page.getCommandList().addCommand(moveCommand);

                        toolLayer.removeShapes([groupShape]);
                        this.hasFocus = false;
                    }
                    break;
            }

            if (this.hasFocus || hadFocus) {
                toolLayer.rebuild();
                page.refresh();
            }
        }

        private moveShapes(shapes: Shape[], srcLayer: Layer, destLayer: Layer) {
            srcLayer.removeShapes(shapes);
            destLayer.addShapes(shapes);

            srcLayer.rebuild();
            destLayer.rebuild();
        }
    }

    //---------------------------------
    class MoveCommand implements Command {
        shapes: Shape[];
        oldTransforms: Transform[];
        newTransforms: Transform[] = [];

        constructor(shapes: Shape[], oldTransforms: Transform[]) {
            this.shapes = shapes.slice(); // copy
            this.oldTransforms = oldTransforms.slice(); // copy
            for (var i = 0; i < shapes.length; ++i) {
                this.newTransforms[i] = shapes[i].getTransform().clone();
            }
        }

        redo() {
            for (var i = 0; i < this.shapes.length; ++i) {
                this.shapes[i].getTransform().copy(this.newTransforms[i]);
            }
        }

        undo() {
            for (var i = 0; i < this.shapes.length; ++i) {
                this.shapes[i].getTransform().copy(this.oldTransforms[i]);
            }
        }
    }
}
