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

            var locationLayer = page.getLayer("location");
            var toolLayer = page.getLayer("tool");
            if (!toolLayer || !locationLayer)
                return;

            var panZoom = page.panZoom;
            var pos = panZoom.getGlobal(touch.x, touch.y);
            var isUsed = false;

            switch (touch.state) {
                case TouchState.Down:
                    this.hasFocus = isUsed = true;
                    this.x1 = this.x2 = pos.x;
                    this.y1 = this.y2 = pos.y;
                    toolLayer.addThing(this);
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
                            var location = new Location(this.x2 - this.x1, this.y2 - this.y1);
                            location.transform.translate(this.x1, this.y1);
                            locationLayer.addThing(location);
                            locationLayer.rebuild();
                        }
                        this.hasFocus = false;
                        toolLayer.removeThing(this);
                        isUsed = true;
                    }
                    break;
            }

            if (isUsed) {
                toolLayer.rebuild();
                page.refresh();
            }
        }

        draw(ctx) {
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
            var pictureLayer = page.getLayer("picture");
            var picture: Picture = pictureLayer.getThingFromTouch(pos.x, pos.y);
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

            var pos = page.panZoom.getLocal(touch.x, touch.y);
            var pictureLayer = page.getLayer("picture");
            var picture: Picture = pictureLayer.getThingFromTouch(pos.x, pos.y);
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

            var templateLayer = page.getLayer("template");
            var newTemplate = deck.createTemplate(
                [0, 0, maxX - minX, 0, maxX - minX, maxY - minY, 0, maxY - minY],
                page);
            newTemplate.transform.copy(picture.transform);
            newTemplate.transform.translate(minX, minY); // top left

            templateLayer.addThing(newTemplate);
            templateLayer.rebuild();
            page.refresh();
        }
    }


    //---------------------------------
    export class PictureTool extends Tool {

        addPicture(src: string) {
            var page: Page = getEnv("page");
            if (!page)
                return;

            var pictureLayer = page.getLayer("picture");
            if (!pictureLayer)
                return;

            var newPicture = new Picture(src);
            newPicture.transform.translate(10, 10);
            pictureLayer.addThing(newPicture);
            pictureLayer.rebuild();
            page.refresh();
        }
    }
}
