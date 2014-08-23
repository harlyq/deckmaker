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
    var Layer = (function () {
        function Layer() {
            this.shapes = [];
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

        Layer.prototype.addShape = function (shape) {
            this.shapes.push(shape);
            return this;
        };

        Layer.prototype.removeShape = function (shape) {
            var i = this.shapes.indexOf(shape);
            if (i !== -1)
                this.shapes.splice(i, 1);

            return this;
        };

        Layer.prototype.addShapes = function (shapes) {
            for (var i = 0; i < shapes.length; ++i)
                this.addShape(shapes[i]);

            return this;
        };

        Layer.prototype.removeShapes = function (shapes) {
            for (var i = 0; i < shapes.length; ++i)
                this.removeShape(shapes[i]);

            return this;
        };

        Layer.prototype.rebuild = function () {
            var ctx = this.ctx;
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            for (var i = 0; i < this.shapes.length; ++i) {
                var shape = this.shapes[i];

                ctx.save();
                if (shape.transform instanceof DeckMaker.Transform)
                    shape.transform.draw(ctx);

                shape.draw(ctx);
                ctx.restore();
            }
        };

        Layer.prototype.getShapeFromXY = function (x, y) {
            for (var i = this.shapes.length - 1; i >= 0; --i) {
                var shape = this.shapes[i];
                if (shape.isInside(x, y)) {
                    return shape;
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

    //---------------------------------
    var PictureLayer = (function (_super) {
        __extends(PictureLayer, _super);
        function PictureLayer() {
            _super.apply(this, arguments);
        }
        return PictureLayer;
    })(Layer);
    DeckMaker.PictureLayer = PictureLayer;

    //---------------------------------
    var ToolLayer = (function (_super) {
        __extends(ToolLayer, _super);
        function ToolLayer() {
            _super.apply(this, arguments);
            this.tools = [];
        }
        ToolLayer.prototype.addTool = function (tool) {
            this.tools.push(tool);

            return this;
        };

        ToolLayer.prototype.removeTool = function (tool) {
            var i = this.tools.indexOf(tool);
            if (i !== -1)
                this.tools.splice(i);

            return this;
        };

        ToolLayer.prototype.rebuild = function () {
            _super.prototype.rebuild.call(this);

            for (var i = 0; i < this.tools.length; ++i) {
                this.tools[i].draw(this.ctx);
            }
        };
        return ToolLayer;
    })(Layer);
    DeckMaker.ToolLayer = ToolLayer;
})(DeckMaker || (DeckMaker = {}));
