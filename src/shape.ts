// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module DeckMaker {

    export

    function drawRect(ctx: CanvasRenderingContext2D, transform: Transform, width: number, height: number) {
        ctx.rect(transform.tx, transform.ty, transform.sx * width, transform.sy * height);
    }

    export

    function drawMoveTo(ctx: CanvasRenderingContext2D, transform: Transform, x: number, y: number) {
        ctx.moveTo(transform.tx + x * transform.sx, transform.ty + y * transform.sy);
    }

    export

    function drawLineTo(ctx: CanvasRenderingContext2D, transform: Transform, x: number, y: number) {
        ctx.lineTo(transform.tx + x * transform.sx, transform.ty + y * transform.sy);
    }

    export

    function drawText(ctx: CanvasRenderingContext2D, transform: Transform, str: string, x: number, y: number) {
        ctx.fillText(str, transform.tx + x * transform.sx, transform.ty + y * transform.sy);
    }

    //---------------------------------
    export class Shape {
        width: number = 0;
        height: number = 0;
        private transform: Transform = new Transform();

        draw(ctx: CanvasRenderingContext2D, transform: Transform) {}

        isInside(x: number, y: number): boolean {
            var pos = this.transform.getLocal(x, y);
            return pos.x >= 0 && pos.x < this.width &&
                pos.y >= 0 && pos.y < this.height;
        }

        isInRegion(x1: number, y1: number, x2: number, y2: number): boolean {
            var pos1 = this.transform.getLocal(x1, y1);
            var pos2 = this.transform.getLocal(x2, y2);

            return pos1.x < this.width && x2 >= 0 &&
                pos1.y < this.height && y2 >= 0;
        }

        getTransform(): Transform {
            return this.transform;
        }
    }

    export
    var transformDefinition = PropertyPanel.createDefinition({
        type: Transform,
        properties: {
            tx: {},
            ty: {},
            sx: {},
            sy: {}
        }
    });

    export
    var shapeDefinition = PropertyPanel.createDefinition({
        type: Shape,
        properties: {
            width: {},
            height: {},
            transform: {}
        }
    });

    //---------------------------------
    export class Picture extends Shape {
        private image = new Image();
        svg: string = '';
        keepAspectRatio: boolean = true;

        constructor(src: string) {
            super();

            this.setSrc(src);
        }

        draw(ctx: CanvasRenderingContext2D, transform: Transform) {
            var width = this.width * transform.sx;
            var height = this.height * transform.sy;
            if (this.keepAspectRatio) {
                // clamp width or height to the smallest side
                var aspectRatio = this.image.width / this.image.height;
                var aspectWidth = aspectRatio * height;
                var aspectHeight = width / aspectRatio;
                if (aspectWidth > width)
                    height = aspectHeight;
                else
                    width = aspectWidth;
            }

            ctx.drawImage(this.image, transform.tx, transform.ty, width, height);
        }

        setSrc(src: string) {
            this.image.src = src;
            this.width = this.image.width;
            this.height = this.image.height;
        }

        setSVG(svg: string) {
            this.svg = svg;
        }
    }

    export
    var pictureDefinition = PropertyPanel.createDefinition({
        type: Picture,
        parent: Shape,
        properties: {
            keepAspectRatio: {}
        }
    });

    //---------------------------------
    export class GroupShape extends Shape {
        private shapes: Shape[] = [];
        private oldTransforms: Transform[] = [];
        private invGroupTransform: Transform = new Transform();

        setShapes(shapes: Shape[]) {
            this.shapes = shapes;
            this.encloseShapes();
        }

        contains(shape: Shape): boolean {
            return this.shapes.indexOf(shape) !== -1;
        }

        applyTransformToShapes() {
            var transform = new Transform();
            var diffTransform = this.getTransform().clone();
            diffTransform.postMultiply(this.invGroupTransform);

            for (var i = 0; i < this.shapes.length; ++i) {
                transform.copy(this.oldTransforms[i]);
                transform.postMultiply(diffTransform);
                this.shapes[i].getTransform().copy(transform);
            }
        }

        draw(ctx: CanvasRenderingContext2D, transform: Transform) {
            ctx.save();

            ctx.beginPath();
            ctx.strokeStyle = "green";
            ctx.lineWidth = 1;

            drawRect(ctx, transform, this.width, this.height);

            // for (var i = 0; i < this.shapes.length; ++i) {
            //     var shape = this.shapes[i];
            //     // ctx.save();
            //     transform.copy(this.oldTransforms[i]);
            //     transform.multiply(this.invGroupTransform);
            //     // transform.draw(ctx);
            //     ctx.rect(0, 0, shape.width, shape.height);
            //     // ctx.restore();
            // }

            var diffTransform = transform.clone();
            diffTransform.postMultiply(this.invGroupTransform);

            for (var i = 0; i < this.shapes.length; ++i) {
                var shape = this.shapes[i];
                transform.copy(this.oldTransforms[i]);
                transform.postMultiply(diffTransform);
                drawRect(ctx, transform, shape.width, shape.height);
            }
            ctx.stroke();

            ctx.restore();
        }

        private encloseShapes() {
            var groupTransform = this.getTransform();
            groupTransform.setIdentity();
            this.oldTransforms.length = 0;

            if (this.shapes.length === 0) {
                this.invGroupTransform.setIdentity();
                this.width = 0;
                this.height = 0;
                return;
            }

            var minX = 1e10;
            var minY = 1e10;
            var maxX = -1e10
            var maxY = -1e10;

            for (var i = 0; i < this.shapes.length; ++i) {
                var shape = this.shapes[i];
                var transform = shape.getTransform();
                this.oldTransforms[i] = transform.clone();

                var x = transform.tx;
                var y = transform.ty;
                var w = transform.sx * shape.width; // may be negative
                var h = transform.sy * shape.height; // may be negative
                var x1 = Math.min(x, x + w);
                var y1 = Math.min(y, y + h);
                var x2 = Math.max(x, x + w);
                var y2 = Math.max(y, y + h);

                var minX = Math.min(x1, minX);
                var maxX = Math.max(x2, maxX);
                var minY = Math.min(y1, minY);
                var maxY = Math.max(y2, maxY);
            }

            groupTransform.translate(minX, minY);
            this.invGroupTransform.copy(groupTransform);
            this.invGroupTransform.inverse();

            this.width = maxX - minX;
            this.height = maxY - minY;
        }
    }
}
