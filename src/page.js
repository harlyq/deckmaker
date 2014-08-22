// Copyright 2014 Reece Elliott
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/// <reference path="_dependencies.ts" />
var DeckMaker;
(function (DeckMaker) {
    //---------------------------------
    var Page = (function () {
        function Page(name) {
            this.name = name;
            this.panZoom = new DeckMaker.Transform();
            this.selectList = new DeckMaker.SelectList();
            this.commandList = new DeckMaker.CommandList();
        }
        Page.prototype.setParent = function (parent) {
            this.parent = parent;
            this.ctx = parent.getContext("2d");

            return this;
        };

        Page.prototype.getLayer = function (name) {
            return undefined;
        };

        Page.prototype.rebuild = function () {
        };
        Page.prototype.refresh = function () {
        };

        Page.prototype.undo = function () {
            this.commandList.undo();
        };
        Page.prototype.redo = function () {
            this.commandList.redo();
        };
        Page.prototype.addCommand = function (command) {
            this.commandList.addCommand(command);
        };
        return Page;
    })();
    DeckMaker.Page = Page;

    //---------------------------------
    var LayerPage = (function (_super) {
        __extends(LayerPage, _super);
        function LayerPage() {
            _super.apply(this, arguments);
            this.layers = [];
        }
        LayerPage.prototype.setParent = function (parent) {
            _super.prototype.setParent.call(this, parent);

            for (var i = 0; i < this.layers.length; ++i) {
                this.layers[i].setParent(parent);
            }

            return this;
        };

        LayerPage.prototype.getLayer = function (name) {
            for (var i = 0; i < this.layers.length; ++i) {
                if (this.layers[i].name === name)
                    return this.layers[i];
            }
            return null;
        };

        LayerPage.prototype.addLayer = function (layer) {
            layer.setParent(this.parent);

            this.layers.push(layer);
            return this;
        };

        LayerPage.prototype.rebuild = function () {
            for (var i = 0; i < this.layers.length; ++i)
                this.layers[i].rebuild();

            this.refresh();
        };

        LayerPage.prototype.refresh = function () {
            var ctx = this.ctx;
            ctx.clearRect(0, 0, this.parent.width, this.parent.height);

            ctx.save();
            this.panZoom.draw(ctx);
            for (var i = 0; i < this.layers.length; ++i)
                this.layers[i].draw(ctx);
            ctx.restore();
        };
        return LayerPage;
    })(Page);
    DeckMaker.LayerPage = LayerPage;

    //---------------------------------
    var Layer = (function () {
        function Layer(name) {
            this.name = name;
            this.things = [];
        }
        Object.defineProperty(Layer.prototype, "width", {
            get: function () {
                return this.canvas.width;
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(Layer.prototype, "height", {
            get: function () {
                return this.canvas.height;
            },
            enumerable: true,
            configurable: true
        });

        Layer.prototype.setParent = function (parent) {
            this.parent = parent;

            this.canvas = document.createElement("canvas");
            this.canvas.width = 1000;
            this.canvas.height = 1000;
            this.ctx = this.canvas.getContext("2d");
        };

        Layer.prototype.addThing = function (thing) {
            this.things.push(thing);
            return this;
        };

        Layer.prototype.removeThing = function (thing) {
            var i = this.things.indexOf(thing);
            if (i !== -1)
                this.things.splice(i, 1);

            return this;
        };

        Layer.prototype.addThings = function (things) {
            for (var i = 0; i < things.length; ++i)
                this.addThing(things[i]);

            return this;
        };

        Layer.prototype.removeThings = function (things) {
            for (var i = 0; i < things.length; ++i)
                this.removeThing(things[i]);

            return this;
        };

        Layer.prototype.rebuild = function () {
            var ctx = this.ctx;
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            for (var i = 0; i < this.things.length; ++i) {
                var thing = this.things[i];

                ctx.save();
                if (thing.transform instanceof DeckMaker.Transform)
                    thing.transform.draw(ctx);

                thing.draw(ctx);
                ctx.restore();
            }
        };

        Layer.prototype.getThingFromTouch = function (x, y) {
            for (var i = this.things.length - 1; i >= 0; --i) {
                var thing = this.things[i];
                if (thing.isInside(x, y)) {
                    return thing;
                }
            }

            return null;
        };

        Layer.prototype.draw = function (ctx) {
            ctx.drawImage(this.canvas, 0, 0);
        };
        return Layer;
    })();
    DeckMaker.Layer = Layer;
})(DeckMaker || (DeckMaker = {}));
