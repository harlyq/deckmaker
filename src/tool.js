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
    var Tool = (function () {
        function Tool() {
            this.hasFocus = false;
        }
        Tool.prototype.touched = function (touch) {
        };

        Tool.prototype.isInside = function (x, y) {
            return false;
        };

        Tool.prototype.draw = function (ctx) {
        };
        return Tool;
    })();
    DeckMaker.Tool = Tool;

    //---------------------------------
    var LocationTool = (function (_super) {
        __extends(LocationTool, _super);
        function LocationTool() {
            _super.call(this);
            this.x1 = 0;
            this.x2 = 0;
            this.y1 = 0;
            this.y2 = 0;
        }
        LocationTool.prototype.touched = function (touch) {
            var page = DeckMaker.getEnv("page");
            if (!page)
                return;

            var pictureLayer = page.getLayer(DeckMaker.PictureLayer);
            var toolLayer = page.getLayer(DeckMaker.ToolLayer);
            if (!toolLayer || !pictureLayer)
                return;

            var panZoom = page.panZoom;
            var pos = panZoom.getGlobal(touch.x, touch.y);
            var isUsed = false;

            switch (touch.state) {
                case 0 /* Down */:
                    this.hasFocus = isUsed = true;
                    this.x1 = this.x2 = pos.x;
                    this.y1 = this.y2 = pos.y;
                    toolLayer.addTool(this);
                    break;

                case 1 /* Move */:
                    if (this.hasFocus) {
                        this.x2 = pos.x;
                        this.y2 = pos.y;
                        isUsed = true;
                    }
                    break;

                case 2 /* Up */:
                    if (this.hasFocus) {
                        if (this.x2 !== this.x1 && this.y2 !== this.y1) {
                            page.getCommandList().addCommand(new LocationCommand(this.x1, this.y1, this.x2 - this.x1, this.y2 - this.y1));
                        }
                        this.hasFocus = false;
                        toolLayer.removeTool(this);
                        isUsed = true;
                    }
                    break;
            }

            if (isUsed) {
                toolLayer.rebuild();
                page.refresh();
            }
        };

        LocationTool.prototype.draw = function (ctx) {
            if (!this.hasFocus)
                return;

            ctx.save();
            ctx.strokeStyle = "blue";
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(this.x1, this.y1, this.x2 - this.x1, this.y2 - this.y1);
            ctx.restore();
        };
        return LocationTool;
    })(Tool);
    DeckMaker.LocationTool = LocationTool;

    //---------------------------------
    var LocationCommand = (function () {
        function LocationCommand(x, y, w, h) {
            this.location = new DeckMaker.Location(w, h);
            this.location.getTransform().translate(x, y);
            this.page = DeckMaker.getEnv("page");
            this.pictureLayer = this.page.getLayer(DeckMaker.PictureLayer);
        }
        LocationCommand.prototype.redo = function () {
            this.pictureLayer.addShape(this.location);
            this.pictureLayer.rebuild();
            this.page.refresh();
        };

        LocationCommand.prototype.undo = function () {
            this.pictureLayer.removeShape(this.location);
            this.pictureLayer.rebuild();
            this.page.refresh();
        };
        return LocationCommand;
    })();

    //---------------------------------
    var PanZoomTool = (function (_super) {
        __extends(PanZoomTool, _super);
        function PanZoomTool() {
            _super.call(this);
        }
        PanZoomTool.prototype.touched = function (touch) {
            var page = DeckMaker.getEnv("page");
            var panZoom = page.panZoom;
            var isUsed = false;

            switch (touch.state) {
                case 0 /* Down */:
                    this.hasFocus = true;
                    isUsed = true;
                    if (typeof touch.x2 !== "undefined") {
                        this.oldDistance = DeckMaker.distance(touch.x, touch.y, touch.x2, touch.y2);
                        this.oldCX = (touch.x + touch.x2) >> 1;
                        this.oldCY = (touch.y + touch.y2) >> 1;
                    }
                    break;

                case 1 /* Move */:
                    if (this.hasFocus) {
                        panZoom.tx += touch.dx;
                        panZoom.ty += touch.dy;
                        isUsed = true;
                    }
                    break;

                case 2 /* Up */:
                    if (this.hasFocus) {
                        this.hasFocus = false;
                        isUsed = true;
                    }
                    break;

                case 3 /* Wheel */:
                    //this.hasFocus = true; wheel is one-shot
                    var scale = (touch.dy > 0 ? 1 / 1.15 : 1.15);
                    panZoom.tx = touch.x - (touch.x - panZoom.tx) * scale;
                    panZoom.ty = touch.y - (touch.y - panZoom.ty) * scale;
                    panZoom.sx *= scale;
                    panZoom.sy *= scale;
                    isUsed = true;
                    break;
            }

            if (isUsed)
                page.refresh();
        };
        return PanZoomTool;
    })(Tool);
    DeckMaker.PanZoomTool = PanZoomTool;

    //---------------------------------
    var AlphaFillTool = (function (_super) {
        __extends(AlphaFillTool, _super);
        function AlphaFillTool() {
            _super.call(this);

            this.canvas = document.createElement("canvas");
            this.ctx = this.canvas.getContext("2d");
        }
        AlphaFillTool.prototype.touched = function (touch) {
            if (touch.state !== 0 /* Down */)
                return;

            var page = DeckMaker.getEnv("page");
            if (!page)
                return;

            var pos = page.panZoom.getLocal(touch.x, touch.y);
            var pictureLayer = page.getLayer(DeckMaker.PictureLayer);
            if (!pictureLayer)
                return;

            var shape = pictureLayer.getShapeFromXY(pos.x, pos.y);
            if (!shape || !(shape instanceof DeckMaker.Picture))
                return;

            var picture = shape;
            pos = picture.getTransform().getLocal(pos.x, pos.y);

            this.canvas.width = picture.width;
            this.canvas.height = picture.height;

            picture.draw(this.ctx);

            var firstColor;
            var alphaColor = new DeckMaker.Color(0, 0, 0, 0);
            var tolerance = 50;

            var imageData = DeckMaker.floodFill({
                ctx: this.ctx,
                x: pos.x,
                y: pos.y,
                match: function (col) {
                    if (typeof firstColor === "undefined") {
                        firstColor = col.clone();
                        return true;
                    }
                    return col.a > 0 && Math.abs(col.r - firstColor.r) < tolerance && Math.abs(col.g - firstColor.g) < tolerance && Math.abs(col.b - firstColor.b) < tolerance;
                },
                change: function (imageData, x, y, pixel) {
                    DeckMaker.setImageCol(imageData, pixel, alphaColor);
                }
            });

            this.ctx.putImageData(imageData, 0, 0);
            picture.setSrc(this.canvas.toDataURL());

            pictureLayer.rebuild();
            page.refresh();
        };
        return AlphaFillTool;
    })(Tool);
    DeckMaker.AlphaFillTool = AlphaFillTool;

    //---------------------------------
    var AutoTemplateTool = (function (_super) {
        __extends(AutoTemplateTool, _super);
        function AutoTemplateTool() {
            _super.call(this);

            this.canvas = document.createElement("canvas");
            this.ctx = this.canvas.getContext("2d");
        }
        AutoTemplateTool.prototype.touched = function (touch) {
            if (touch.state !== 0 /* Down */)
                return;

            var page = DeckMaker.getEnv("page");
            var deck = DeckMaker.getEnv("deck");
            if (!page || !deck)
                return;

            var pictureLayer = page.getLayer(DeckMaker.PictureLayer);
            if (!pictureLayer)
                return;

            var pos = page.panZoom.getLocal(touch.x, touch.y);
            var shape = pictureLayer.getShapeFromXY(pos.x, pos.y);
            if (shape === null || !(shape instanceof DeckMaker.Picture))
                return;

            var picture = shape;
            pos = picture.getTransform().getLocal(pos.x, pos.y);

            this.canvas.width = picture.width;
            this.canvas.height = picture.height;

            picture.draw(this.ctx);

            var used = new DeckMaker.Color(0, 0, 0, 0);
            var minX = 1e10;
            var maxX = -1e10;
            var minY = 1e10;
            var maxY = -1e10;

            var imageData = DeckMaker.floodFill({
                ctx: this.ctx,
                x: pos.x,
                y: pos.y,
                match: function (col) {
                    return col.a > 1;
                },
                change: function (imageData, x, y, pixel) {
                    minX = Math.min(x, minX);
                    maxX = Math.max(x, maxX);
                    minY = Math.min(y, minY);
                    maxY = Math.max(y, maxY);
                    DeckMaker.setImageCol(imageData, pixel, used);
                }
            });

            if (minX === 1e10 || minY === 1e10)
                return;

            var newTemplate = new DeckMaker.Template([0, 0, maxX - minX, 0, maxX - minX, maxY - minY, 0, maxY - minY], page);
            newTemplate.getTransform().copy(picture.getTransform());
            newTemplate.getTransform().translate(minX, minY); // top left

            page.getCommandList().addCommand(new AutoTemplateCommand([newTemplate]));
        };
        return AutoTemplateTool;
    })(Tool);
    DeckMaker.AutoTemplateTool = AutoTemplateTool;

    //---------------------------------
    var AutoTemplateCommand = (function () {
        function AutoTemplateCommand(templates) {
            this.templates = [];
            this.templates = templates.slice(); // copy

            this.deck = DeckMaker.getEnv("deck");
            this.page = DeckMaker.getEnv("page");
            this.pictureLayer = this.page.getLayer(DeckMaker.PictureLayer);
        }
        AutoTemplateCommand.prototype.redo = function () {
            this.deck.addTemplates(this.templates);
            this.pictureLayer.addShapes(this.templates);
            this.pictureLayer.rebuild();
            this.page.refresh();
        };

        AutoTemplateCommand.prototype.undo = function () {
            this.deck.removeTemplates(this.templates);
            this.pictureLayer.removeShapes(this.templates);
            this.pictureLayer.rebuild();
            this.page.refresh();
        };
        return AutoTemplateCommand;
    })();

    //---------------------------------
    var PictureTool = (function (_super) {
        __extends(PictureTool, _super);
        function PictureTool() {
            _super.apply(this, arguments);
        }
        PictureTool.prototype.addPicture = function (src) {
            var page = DeckMaker.getEnv("page");
            if (!page)
                return;

            if (!page.getLayer(DeckMaker.PictureLayer))
                return;

            page.getCommandList().addCommand(new PictureCommand(src));
        };
        return PictureTool;
    })(Tool);
    DeckMaker.PictureTool = PictureTool;

    //---------------------------------
    var PictureCommand = (function () {
        function PictureCommand(src) {
            this.picture = new DeckMaker.Picture(src);
            this.picture.getTransform().translate(10, 10);
            this.page = DeckMaker.getEnv("page");
            this.pictureLayer = this.page.getLayer(DeckMaker.PictureLayer);
        }
        PictureCommand.prototype.redo = function () {
            this.pictureLayer.addShape(this.picture);
            this.pictureLayer.rebuild();
            this.page.refresh();
        };

        PictureCommand.prototype.undo = function () {
            this.pictureLayer.removeShape(this.picture);
            this.pictureLayer.rebuild();
            this.page.refresh();
        };
        return PictureCommand;
    })();

    //---------------------------------
    var UndoRedoTool = (function (_super) {
        __extends(UndoRedoTool, _super);
        function UndoRedoTool() {
            _super.apply(this, arguments);
        }
        UndoRedoTool.prototype.undo = function () {
            var page = DeckMaker.getEnv("page");
            page.getCommandList().undo();
            page.rebuild();
        };

        UndoRedoTool.prototype.redo = function () {
            var page = DeckMaker.getEnv("page");
            page.getCommandList().redo();
            page.rebuild();
        };
        return UndoRedoTool;
    })(Tool);
    DeckMaker.UndoRedoTool = UndoRedoTool;

    //---------------------------------
    var MoveTool = (function (_super) {
        __extends(MoveTool, _super);
        function MoveTool() {
            _super.apply(this, arguments);
            this.oldTransforms = [];
        }
        MoveTool.prototype.touched = function (touch) {
            var page = DeckMaker.getEnv("page");
            if (!page)
                return;

            var toolLayer = page.getLayer(DeckMaker.ToolLayer);
            var pictureLayer = page.getLayer(DeckMaker.PictureLayer);
            if (!toolLayer || !pictureLayer)
                return;

            var pos = page.panZoom.getGlobal(touch.x, touch.y);
            var selection = page.getSelection();
            var hadFocus = this.hasFocus;

            switch (touch.state) {
                case 0 /* Down */:
                    var validMove = true;
                    if (!selection.getSelectGroup().isInside(pos.x, pos.y)) {
                        var shape = pictureLayer.getShapeFromXY(pos.x, pos.y);
                        if (shape)
                            selection.setSelectedShapes([shape]);
                        else
                            validMove = false;
                    }

                    if (validMove) {
                        var shapes = selection.getSelectedShapes();
                        this.oldTransforms.length = 0;
                        for (var i = 0; i < shapes.length; ++i)
                            this.oldTransforms[i] = shapes[i].getTransform().clone();

                        this.moveShapes(shapes, pictureLayer, toolLayer);
                        this.hasFocus = true;
                    }
                    break;

                case 1 /* Move */:
                    if (this.hasFocus) {
                        var groupShape = selection.getSelectGroup();
                        groupShape.getTransform().translate(touch.dx, touch.dy);
                        groupShape.applyTransformToShapes();
                        toolLayer.rebuild();
                    }
                    break;

                case 2 /* Up */:
                    if (this.hasFocus) {
                        var shapes = selection.getSelectedShapes();

                        var moveCommand = new MoveCommand(shapes, this.oldTransforms);
                        page.getCommandList().addCommand(moveCommand);

                        this.moveShapes(shapes, toolLayer, pictureLayer);
                        this.hasFocus = false;
                    }
                    break;
            }

            if (this.hasFocus || hadFocus)
                page.refresh();
        };

        MoveTool.prototype.moveShapes = function (shapes, srcLayer, destLayer) {
            srcLayer.removeShapes(shapes);
            destLayer.addShapes(shapes);

            srcLayer.rebuild();
            destLayer.rebuild();
        };
        return MoveTool;
    })(Tool);
    DeckMaker.MoveTool = MoveTool;

    //---------------------------------
    var MoveCommand = (function () {
        function MoveCommand(shapes, oldTransforms) {
            this.newTransforms = [];
            this.shapes = shapes.slice(); // copy
            this.oldTransforms = oldTransforms.slice(); // copy
            for (var i = 0; i < shapes.length; ++i) {
                this.newTransforms[i] = shapes[i].getTransform().clone();
            }
        }
        MoveCommand.prototype.redo = function () {
            for (var i = 0; i < this.shapes.length; ++i) {
                this.shapes[i].getTransform().copy(this.newTransforms[i]);
            }
        };

        MoveCommand.prototype.undo = function () {
            for (var i = 0; i < this.shapes.length; ++i) {
                this.shapes[i].getTransform().copy(this.oldTransforms[i]);
            }
        };
        return MoveCommand;
    })();
})(DeckMaker || (DeckMaker = {}));
