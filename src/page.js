// Copyright 2014 Reece Elliott
/// <reference path="_dependencies.ts" />
var DeckMaker;
(function (DeckMaker) {
    //---------------------------------
    var Page = (function () {
        function Page(name) {
            this.name = name;
            this.panZoom = new DeckMaker.Transform();
            this.selection = new DeckMaker.SelectList();
            this.commandList = new DeckMaker.CommandList();
            this.layers = [];
        }
        Page.prototype.setParent = function (parent) {
            this.parent = parent;
            this.ctx = parent.getContext("2d");

            for (var i = 0; i < this.layers.length; ++i) {
                this.layers[i].setParent(parent);
            }

            return this;
        };

        Page.prototype.getLayer = function (type) {
            for (var i = 0; i < this.layers.length; ++i) {
                if (this.layers[i] instanceof type)
                    return this.layers[i];
            }
            return null;
        };

        Page.prototype.getCommandList = function () {
            return this.commandList;
        };

        Page.prototype.getSelection = function () {
            return this.selection;
        };

        Page.prototype.addLayer = function (layer) {
            layer.setParent(this.parent);

            this.layers.push(layer);
            return this;
        };

        Page.prototype.rebuild = function () {
            for (var i = 0; i < this.layers.length; ++i)
                this.layers[i].rebuild();

            this.selection.rebuild();
            this.refresh();
        };

        Page.prototype.refresh = function () {
            var ctx = this.ctx;
            ctx.clearRect(0, 0, this.parent.width, this.parent.height);

            ctx.save();
            this.panZoom.draw(ctx);
            for (var i = 0; i < this.layers.length; ++i)
                this.layers[i].draw(ctx);
            ctx.restore();
        };
        return Page;
    })();
    DeckMaker.Page = Page;
})(DeckMaker || (DeckMaker = {}));
