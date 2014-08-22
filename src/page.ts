// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module DeckMaker {

    //---------------------------------
    export class Page {
        parent: HTMLCanvasElement
        ctx: CanvasRenderingContext2D;
        panZoom = new Transform();
        selectList = new SelectList();
        commandList = new CommandList();

        constructor(public name: string) {}

        setParent(parent: HTMLCanvasElement): Page {
            this.parent = parent;
            this.ctx = parent.getContext("2d");

            return this;
        }

        getLayer(name): Layer {
            return undefined;
        }

        rebuild() {}
        refresh() {}

        undo() {
            this.commandList.undo();
        }
        redo() {
            this.commandList.redo();
        }
        addCommand(command) {
            this.commandList.addCommand(command);
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
    export class Layer {
        parent: HTMLCanvasElement;
        ctx: CanvasRenderingContext2D;
        canvas: HTMLCanvasElement;
        things: any[] = [];

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

        addThing(thing: any): Layer {
            this.things.push(thing);
            return this;
        }

        removeThing(thing: any): Layer {
            var i = this.things.indexOf(thing);
            if (i !== -1)
                this.things.splice(i, 1);

            return this;
        }

        addThings(things: any[]): Layer {
            for (var i = 0; i < things.length; ++i)
                this.addThing(things[i]);

            return this;
        }

        removeThings(things: any[]): Layer {
            for (var i = 0; i < things.length; ++i)
                this.removeThing(things[i]);

            return this;
        }

        rebuild() {
            var ctx = this.ctx;
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            for (var i = 0; i < this.things.length; ++i) {
                var thing = this.things[i];

                ctx.save();
                if (thing.transform instanceof Transform)
                    thing.transform.draw(ctx);

                thing.draw(ctx);
                ctx.restore();
            }
        }

        getThingFromTouch(x: number, y: number): any {
            // loop backwards, if things overlap then pick the last one
            for (var i = this.things.length - 1; i >= 0; --i) {
                var thing = this.things[i];
                if (thing.isInside(x, y)) {
                    return thing;
                }
            }

            return null;
        }

        draw(ctx: CanvasRenderingContext2D) {
            ctx.drawImage(this.canvas, 0, 0);
        }
    }

}
