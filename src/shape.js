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
    var Shape = (function () {
        function Shape() {
            this.width = 0;
            this.height = 0;
            this.transform = new DeckMaker.Transform();
        }
        Shape.prototype.draw = function (ctx) {
        };

        Shape.prototype.isInside = function (x, y) {
            return false;
        };
        return Shape;
    })();
    DeckMaker.Shape = Shape;

    //---------------------------------
    var Picture = (function (_super) {
        __extends(Picture, _super);
        function Picture(src) {
            _super.call(this);
            this.image = new Image();

            this.setSrc(src);
        }
        Picture.prototype.draw = function (ctx) {
            ctx.drawImage(this.image, 0, 0);
        };

        Picture.prototype.isInside = function (x, y) {
            var pos = this.transform.getLocal(x, y);
            return pos.x >= 0 && pos.x < this.width && pos.y >= 0 && pos.y < this.height;
        };

        Picture.prototype.setSrc = function (src) {
            this.image.src = src;
            this.width = this.image.width;
            this.height = this.image.height;
        };
        return Picture;
    })(Shape);
    DeckMaker.Picture = Picture;

    //---------------------------------
    var Location = (function (_super) {
        __extends(Location, _super);
        function Location(width, height) {
            _super.call(this);
            this.width = width;
            this.height = height;
        }
        Location.prototype.draw = function (ctx) {
            ctx.save();
            ctx.strokeRect(0, 0, this.width, this.height);
            ctx.restore();
        };

        Location.prototype.isInside = function (x, y) {
            var pos = this.transform.getLocal(x, y);
            return pos.x >= 0 && pos.x < this.width && pos.y >= 0 && pos.y < this.height;
        };
        return Location;
    })(Shape);
    DeckMaker.Location = Location;

    //---------------------------------
    var GroupShape = (function (_super) {
        __extends(GroupShape, _super);
        function GroupShape() {
            _super.apply(this, arguments);
        }
        GroupShape.prototype.setShapes = function (shapes) {
            this.shapes = shapes;

            this.calcBounds();
        };

        GroupShape.prototype.draw = function (ctx) {
            ctx.save();
            ctx.strokeStyle = "green";
            ctx.lineWidth = 1;
            ctx.strokeRect(0, 0, this.width, this.height);
            ctx.restore();
        };

        GroupShape.prototype.calcBounds = function () {
            var minX = -1e10;
            var minY = -1e10;
            var maxX = 1e10;
            var maxY = 1e10;
            this.transform.setIdentity();

            for (var i = 0; i < this.shapes.length; ++i) {
                var shape = this.shapes[i];

                var x = shape.transform.tx;
                var y = shape.transform.ty;
                var w = shape.transform.sx * shape.width;
                var h = shape.transform.sy * shape.height;
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
        };
        return GroupShape;
    })(Shape);
    DeckMaker.GroupShape = GroupShape;
})(DeckMaker || (DeckMaker = {}));
