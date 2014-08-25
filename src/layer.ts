// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module DeckMaker {

    //---------------------------------
    export class Layer {
        parent: HTMLCanvasElement;
        ctx: CanvasRenderingContext2D;
        canvas: HTMLCanvasElement;
        shapes: any[] = [];
        sortShape: (a: Shape, b: Shape) => number;

        get width(): number {
            return this.canvas.width;
        }

        get height(): number {
            return this.canvas.height;
        }

        constructor() {}

        setParent(parent: HTMLCanvasElement) {
            this.parent = parent;

            this.canvas = document.createElement("canvas");
            this.canvas.width = 1000;
            this.canvas.height = 1000;
            this.ctx = this.canvas.getContext("2d");
        }

        private addShape(shape: Shape): Layer {
            this.shapes.push(shape);
            return this;
        }

        private removeShape(shape: Shape): Layer {
            var i = this.shapes.indexOf(shape);
            if (i !== -1) {
                this.shapes.splice(i, 1);
            }

            return this;
        }

        addShapes(shapes: Shape[]): Layer {
            for (var i = 0; i < shapes.length; ++i)
                this.addShape(shapes[i]);

            if (typeof this.sortShape === 'function')
                this.shapes.sort(this.sortShape);

            return this;
        }

        removeShapes(shapes: Shape[]): Layer {
            for (var i = 0; i < shapes.length; ++i)
                this.removeShape(shapes[i]);

            if (typeof this.sortShape === 'function')
                this.shapes.sort(this.sortShape);

            return this;
        }

        rebuild() {
            var ctx = this.ctx;
            var w = this.width;
            var h = this.height;
            ctx.save();
            ctx.strokeStyle = "#eee";
            ctx.lineWidth = 1;
            ctx.clearRect(0, 0, w, h);
            ctx.strokeRect(0, 0, w, h);
            ctx.restore();


            for (var i = 0; i < this.shapes.length; ++i) {
                var shape = this.shapes[i];

                ctx.save();
                if (shape.transform instanceof Transform)
                    shape.transform.draw(ctx);

                shape.draw(ctx);
                ctx.restore();
            }
        }

        getShapeFromXY(x: number, y: number): Shape {
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
    export class PictureLayer extends Layer {

    }

    //---------------------------------
    export class TemplateLayer extends Layer {

    }

    //---------------------------------
    export class ToolLayer extends Layer {
        private tools: Tool[] = [];

        addTool(tool: Tool): ToolLayer {
            this.tools.push(tool);

            return this;
        }

        removeTool(tool: Tool): ToolLayer {
            var i = this.tools.indexOf(tool);
            if (i !== -1)
                this.tools.splice(i);

            return this;
        }

        rebuild() {
            super.rebuild();

            for (var i = 0; i < this.tools.length; ++i) {
                this.tools[i].draw(this.ctx);
            }
        }
    }
}
