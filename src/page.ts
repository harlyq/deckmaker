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

        rebuild() {
            for (var i = 0; i < this.layers.length; ++i)
                this.layers[i].rebuild();

            this.selection.rebuild();
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

}
