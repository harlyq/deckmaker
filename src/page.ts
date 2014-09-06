// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module DeckMaker {

    //---------------------------------
    export class Page {
        parent: HTMLCanvasElement
        ctx: CanvasRenderingContext2D;
        panZoom = new Transform();
        private selection = new SelectList();
        private commandList = new CommandList();
        private layers: Layer[] = [];

        constructor(public name: string) {}

        setParent(parent: HTMLCanvasElement): Page {
            this.parent = parent;
            this.ctx = parent.getContext("2d");

            for (var i = 0; i < this.layers.length; ++i) {
                this.layers[i].setParent(parent);
            }

            return this;
        }

        getLayer < T extends Layer > (type: new(...args: any[]) => T): T {
            for (var i = 0; i < this.layers.length; ++i) {
                if (this.layers[i] instanceof type)
                    return <T > this.layers[i];
            }
            return null;
        }

        getCommandList(): CommandList {
            return this.commandList;
        }

        getSelection(): SelectList {
            return this.selection;
        }

        addLayer(layer: Layer): Page {
            layer.setParent(this.parent);

            this.layers.push(layer);
            return this;
        }

        rebuildLayer < T extends Layer > (type: new(...args: any[]) => T) {
            for (var i = 0; i < this.layers.length; ++i) {
                var layer = this.layers[i];
                if (layer instanceof type)
                    layer.rebuild(this.panZoom);
            }

            this.selection.refresh();
            this.refresh();
        }

        rebuild() {
            for (var i = 0; i < this.layers.length; ++i)
                this.layers[i].rebuild(this.panZoom);

            this.selection.refresh();
            this.refresh();
        }

        refresh() {
            var ctx = this.ctx;
            ctx.clearRect(0, 0, this.parent.width, this.parent.height);

            ctx.save();
            for (var i = 0; i < this.layers.length; ++i)
                this.layers[i].draw(ctx);
            ctx.restore();
        }

        getShapeFromXY(x: number, y: number): Shape {
            var shape: Shape = null;
            var pos = this.panZoom.getLocal(x, y);

            // reverse order, because last layer appears on top
            for (var i = this.layers.length - 1; i >= 0; --i) {
                var shape = this.layers[i].getShapeFromXY(pos.x, pos.y);
                if (shape)
                    return shape;
            }

            return null;
        }
    }
}
