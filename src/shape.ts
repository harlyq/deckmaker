// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module DeckMaker {

    //---------------------------------
    export class Shape {
        width: number = 0;
        height: number = 0;
        transform: Transform = new Transform();

        draw(ctx: CanvasRenderingContext2D) {}

        isInside(x: number, y: number): boolean {
            return false;
        }
    }

    //---------------------------------
    export class Picture extends Shape {
        private image = new Image();

        constructor(src: string) {
            super();

            this.setSrc(src);
        }

        draw(ctx: CanvasRenderingContext2D) {
            ctx.drawImage(this.image, 0, 0);
        }

        isInside(x: number, y: number): boolean {
            var pos = this.transform.getLocal(x, y);
            return pos.x >= 0 && pos.x < this.width &&
                pos.y >= 0 && pos.y < this.height;
        }

        setSrc(src: string) {
            this.image.src = src;
            this.width = this.image.width;
            this.height = this.image.height;
        }
    }

    //---------------------------------
    export class Location extends Shape {
        constructor(width: number, height: number) {
            super();
            this.width = width;
            this.height = height;
        }

        draw(ctx: CanvasRenderingContext2D) {
            ctx.save();
            ctx.strokeRect(0, 0, this.width, this.height);
            ctx.restore();
        }

        isInside(x: number, y: number): boolean {
            var pos = this.transform.getLocal(x, y);
            return pos.x >= 0 && pos.x < this.width &&
                pos.y >= 0 && pos.y < this.height;
        }
    }

    //---------------------------------
    export class GroupShape extends Shape {
        shapes: Shape[];

        setShapes(shapes: Shape[]) {
            this.shapes = shapes;

            this.calcBounds();
        }

        draw(ctx: CanvasRenderingContext2D) {
            ctx.save();
            ctx.strokeStyle = "green";
            ctx.lineWidth = 1;
            ctx.strokeRect(0, 0, this.width, this.height);
            ctx.restore();
        }

        private calcBounds() {
            var minX = -1e10;
            var minY = -1e10;
            var maxX = 1e10
            var maxY = 1e10;
            this.transform.setIdentity();

            for (var i = 0; i < this.shapes.length; ++i) {
                var shape = this.shapes[i];

                var x = shape.transform.tx;
                var y = shape.transform.ty;
                var w = shape.transform.sx * shape.width; // may be negative
                var h = shape.transform.sy * shape.height; // may be negative
                var x1 = Math.min(x, x + w);
                var y1 = Math.min(y, y + h);
                var x2 = Math.max(x, x + w);
                var y2 = Math.max(y, y + h);

                var minX = Math.min(x1, minX);
                var maxX = Math.max(x2, maxX);
                var minY = Math.min(y1, minX);
                var maxY = Math.max(y2, maxY);
            }

            this.transform.translate(x1, y1);
            this.width = x2 - x1;
            this.height = y2 - y1;
        }
    }
}
