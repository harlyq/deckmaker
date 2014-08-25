// Copyright 2014 Reece Elliott
var DeckMaker;
(function (DeckMaker) {
    var env = {};

    function setEnv(key, value) {
        env[key] = value;
    }
    DeckMaker.setEnv = setEnv;

    function getEnv(key) {
        return env[key];
    }
    DeckMaker.getEnv = getEnv;

    function find(array, predicate) {
        for (var i = 0; i < array.length; ++i) {
            if (predicate(array[i], i, array))
                return i;
        }
        return -1;
    }
    DeckMaker.find = find;

    function distance(x1, y1, x2, y2) {
        var dx = x2 - x1;
        var dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }
    DeckMaker.distance = distance;

    function getImageCol(imageData, pixel) {
        pixel *= 4;
        return new Color(imageData.data[pixel], imageData.data[pixel + 1], imageData.data[pixel + 2], imageData.data[pixel + 3]);
    }
    DeckMaker.getImageCol = getImageCol;

    function setImageCol(imageData, pixel, color) {
        pixel *= 4;
        imageData.data[pixel] = color.r;
        imageData.data[pixel + 1] = color.g;
        imageData.data[pixel + 2] = color.b;
        imageData.data[pixel + 3] = color.a;
    }
    DeckMaker.setImageCol = setImageCol;

    

    function floodFill(options) {
        var x = ~~options.x;
        var y = ~~options.y;
        var match = options.match;
        var change = options.change;
        var ctx = options.ctx;

        var width = ctx.canvas.width;
        var height = ctx.canvas.height;
        var imageData = ctx.getImageData(0, 0, width, height);
        var pixel = (y * width + x);

        if (!match(getImageCol(imageData, pixel)))
            return null;

        var pixelStack = [];
        pixelStack.push(x, y);

        while (pixelStack.length) {
            y = pixelStack.pop();
            x = pixelStack.pop();

            var startX = x;
            pixel = (y * width + x);

            do {
                --x;
                --pixel;
            } while(x >= 0 && match(getImageCol(imageData, pixel)));
            ++x;
            ++pixel;

            var captureUp = true;
            var captureDown = true;
            var matchUp = false;
            var matchDown = false;
            do {
                change(imageData, x, y, pixel);

                matchUp = y > 0 && match(getImageCol(imageData, pixel - width));
                matchDown = y < height - 1 && match(getImageCol(imageData, pixel + width));

                // if we are capturing and there is a free space above or below then remember it
                if (captureUp && matchUp)
                    pixelStack.push(x, y - 1);

                if (captureDown && matchDown)
                    pixelStack.push(x, y + 1);

                // if there is not a free space above or below then start a capture
                captureUp = !matchUp;
                captureDown = !matchDown;
                ++x;
                ++pixel;
                // don't need to match while x <= startX because we have already matched it before
            } while(x < width && (x <= startX || match(getImageCol(imageData, pixel))));
        }

        return imageData;
    }
    DeckMaker.floodFill = floodFill;

    //---------------------------------
    // values in range [0,255]
    var Color = (function () {
        function Color(r, g, b, a) {
            if (typeof a === "undefined") { a = 255; }
            this.r = r;
            this.g = g;
            this.b = b;
            this.a = a;
        }
        Color.prototype.copy = function (other) {
            this.r = other.r;
            this.g = other.g;
            this.b = other.b;
            this.a = other.a;
            return this;
        };

        Color.prototype.clone = function () {
            return new Color(this.r, this.g, this.b, this.a);
        };
        return Color;
    })();
    DeckMaker.Color = Color;

    

    //---------------------------------
    var Transform = (function () {
        function Transform() {
            this.sx = 1;
            this.sy = 1;
            this.tx = 0;
            this.ty = 0;
        }
        Transform.prototype.copy = function (other) {
            this.sx = other.sx;
            this.sy = other.sy;
            this.tx = other.tx;
            this.ty = other.ty;
            return this;
        };

        Transform.prototype.clone = function () {
            return new Transform().copy(this);
        };

        Transform.prototype.translate = function (x, y) {
            this.tx += x;
            this.ty += y;
            return this;
        };

        Transform.prototype.scale = function (sx, sy) {
            this.sx *= sx;
            this.sy *= sy;
            return this;
        };

        Transform.prototype.multiply = function (other) {
            this.sx *= other.sx;
            this.sy *= other.sy;
            this.tx += other.tx;
            this.ty += other.ty;
            return this;
        };

        Transform.prototype.inverse = function () {
            this.sx = 1 / this.sx;
            this.sy = 1 / this.sy;
            this.tx = -this.tx;
            this.ty = -this.ty;
            return this;
        };

        Transform.prototype.setIdentity = function () {
            this.sx = this.sy = 1;
            this.tx = this.ty = 0;
            return this;
        };

        Transform.prototype.draw = function (ctx) {
            ctx.transform(this.sx, 0, 0, this.sy, this.tx, this.ty);
        };

        Transform.prototype.getLocal = function (x, y) {
            return {
                x: (x - this.tx) / this.sx,
                y: (y - this.ty) / this.sy
            };
        };

        Transform.prototype.getGlobal = function (lx, ly) {
            return {
                x: lx * this.sx + this.tx,
                y: ly * this.sy + this.ty
            };
        };
        return Transform;
    })();
    DeckMaker.Transform = Transform;
})(DeckMaker || (DeckMaker = {}));
// Copyright 2014 Reece Elliott
/// <reference path="_dependencies.ts" />
var DeckMaker;
(function (DeckMaker) {
    //---------------------------------
    (function (TouchState) {
        TouchState[TouchState["Down"] = 0] = "Down";
        TouchState[TouchState["Move"] = 1] = "Move";
        TouchState[TouchState["Up"] = 2] = "Up";
        TouchState[TouchState["Wheel"] = 3] = "Wheel";
    })(DeckMaker.TouchState || (DeckMaker.TouchState = {}));
    var TouchState = DeckMaker.TouchState;
    ;

    //---------------------------------
    //TODO needed for export on tool - no way to make it private?!!!
    var Touch = (function () {
        function Touch(state, x, y, dx, dy, x2, y2) {
            this.state = state;
            this.x = x;
            this.y = y;
            this.dx = dx;
            this.dy = dy;
            this.x2 = x2;
            this.y2 = y2;
        }
        return Touch;
    })();
    DeckMaker.Touch = Touch;

    //---------------------------------
    var TouchManager = (function () {
        function TouchManager(parent, callback) {
            this.parent = parent;
            this.callback = callback;
            this.lastX = 0;
            this.lastY = 0;
            this.mouseX = 0;
            this.mouseY = 0;
            this.mouseUpHandler = this.mouseUp.bind(this);
            this.mouseMoveHandler = this.mouseMove.bind(this);
            this.touchEndHandler = this.touchEnd.bind(this);
            this.touchMoveHandler = this.touchMove.bind(this);
            if (typeof this.callback !== 'function')
                return;

            parent.addEventListener('mousedown', this.mouseDown.bind(this));
            parent.addEventListener('mousewheel', this.mouseWheel.bind(this));
            parent.addEventListener('mousemove', this.mouseTrack.bind(this));
            parent.addEventListener('touchstart', this.touchStart.bind(this));
        }
        TouchManager.prototype.sendMouseEvent = function (e, state) {
            e.preventDefault();

            var x = e.pageX - this.parent.offsetLeft;
            var y = e.pageY - this.parent.offsetTop;

            if (state == 0 /* Down */) {
                this.lastX = x;
                this.lastY = y;
            }

            this.callback(new Touch(state, x, y, x - this.lastX, y - this.lastY));

            this.lastX = x;
            this.lastY = y;
        };

        TouchManager.prototype.mouseDown = function (e) {
            document.addEventListener('mouseup', this.mouseUpHandler);
            document.addEventListener('mousemove', this.mouseMoveHandler);

            this.sendMouseEvent(e, 0 /* Down */);
        };

        TouchManager.prototype.mouseTrack = function (e) {
            this.mouseX = e.pageX - this.parent.offsetLeft;
            this.mouseY = e.pageY - this.parent.offsetTop;
        };

        TouchManager.prototype.mouseMove = function (e) {
            this.sendMouseEvent(e, 1 /* Move */);
        };

        TouchManager.prototype.mouseUp = function (e) {
            this.sendMouseEvent(e, 2 /* Up */);

            document.removeEventListener('mousemove', this.mouseMoveHandler);
            document.removeEventListener('mouseup', this.mouseUpHandler);
        };

        TouchManager.prototype.mouseWheel = function (e) {
            this.callback(new Touch(3 /* Wheel */, this.lastX, this.lastY, e.deltaX, e.deltaY));
        };

        TouchManager.prototype.sendTouchEvent = function (e, state) {
            e.preventDefault();

            var x;
            var y;

            if (e.touches.length > 0) {
                x = e.touches[0].pageX - this.parent.offsetLeft;
                y = e.touches[0].pageY - this.parent.offsetTop;
            }

            var x2;
            var y2;
            if (e.touches.length > 1) {
                x2 = e.touches[1].pageX - this.parent.offsetLeft;
                y2 = e.touches[1].pageY - this.parent.offsetTop;
            }

            if (state == 0 /* Down */) {
                this.lastX = x;
                this.lastY = y;
            }

            this.callback(new Touch(state, x, y, x - this.lastX, y - this.lastY, x2, y2));
            this.lastX = x;
            this.lastY = y;
        };

        TouchManager.prototype.touchStart = function (e) {
            document.addEventListener('touchend', this.touchEndHandler);
            document.addEventListener('touchmove', this.touchMoveHandler);

            this.sendTouchEvent(e, 0 /* Down */);
        };

        TouchManager.prototype.touchMove = function (e) {
            this.sendTouchEvent(e, 1 /* Move */);
        };

        TouchManager.prototype.touchEnd = function (e) {
            this.sendTouchEvent(e, 2 /* Up */);

            document.removeEventListener('touchmove', this.touchMoveHandler);
            document.removeEventListener('touchend', this.touchEndHandler);
        };
        return TouchManager;
    })();
    DeckMaker.TouchManager = TouchManager;
})(DeckMaker || (DeckMaker = {}));
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
            var pos = this.transform.getLocal(x, y);
            return pos.x >= 0 && pos.x < this.width && pos.y >= 0 && pos.y < this.height;
        };

        Shape.prototype.getTransform = function () {
            return this.transform;
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
        return Location;
    })(Shape);
    DeckMaker.Location = Location;

    //---------------------------------
    var GroupShape = (function (_super) {
        __extends(GroupShape, _super);
        function GroupShape() {
            _super.apply(this, arguments);
            this.shapes = [];
            this.oldTransforms = [];
            this.invGroupTransform = new DeckMaker.Transform();
        }
        GroupShape.prototype.setShapes = function (shapes) {
            this.shapes = shapes;
            this.encloseShapes();
        };

        GroupShape.prototype.contains = function (shape) {
            return this.shapes.indexOf(shape) !== -1;
        };

        GroupShape.prototype.applyTransformToShapes = function () {
            var transform = new DeckMaker.Transform();
            var diffTransform = this.getTransform().clone();
            diffTransform.multiply(this.invGroupTransform);

            for (var i = 0; i < this.shapes.length; ++i) {
                transform.copy(this.oldTransforms[i]);
                transform.multiply(diffTransform);
                this.shapes[i].getTransform().copy(transform);
            }
        };

        GroupShape.prototype.draw = function (ctx) {
            ctx.save();
            ctx.strokeStyle = "green";
            ctx.lineWidth = 1;
            ctx.strokeRect(0, 0, this.width, this.height);

            ctx.beginPath();
            var transform = new DeckMaker.Transform();

            for (var i = 0; i < this.shapes.length; ++i) {
                var shape = this.shapes[i];
                ctx.save();
                transform.copy(this.oldTransforms[i]);
                transform.multiply(this.invGroupTransform);
                transform.draw(ctx);
                ctx.rect(0, 0, shape.width, shape.height);
                ctx.restore();
            }
            ctx.stroke();
            ctx.restore();
        };

        GroupShape.prototype.encloseShapes = function () {
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
            var maxX = -1e10;
            var maxY = -1e10;

            for (var i = 0; i < this.shapes.length; ++i) {
                var shape = this.shapes[i];
                var transform = shape.getTransform();
                this.oldTransforms[i] = transform.clone();

                var x = transform.tx;
                var y = transform.ty;
                var w = transform.sx * shape.width;
                var h = transform.sy * shape.height;
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
        };
        return GroupShape;
    })(Shape);
    DeckMaker.GroupShape = GroupShape;
})(DeckMaker || (DeckMaker = {}));
// Copyright 2014 Reece Elliott
/// <reference path="_dependencies.ts" />
var DeckMaker;
(function (DeckMaker) {
    //------------------------------
    var SelectList = (function () {
        function SelectList() {
            this.selectedShapes = [];
            this.selectGroup = new DeckMaker.GroupShape();
        }
        SelectList.prototype.reset = function () {
            this.selectedShapes.length = 0;
            this.selectGroup.setShapes([]);
        };

        // removes the shape from the selected list
        SelectList.prototype.removeSelected = function (shape) {
            var index = this.selectedShapes.indexOf(shape);
            if (index !== -1) {
                this.selectedShapes.splice(index, 1);
                this.rebuild();
            }
        };

        SelectList.prototype.toggleSelected = function (shapes) {
            for (var i = 0; i < shapes.length; ++i) {
                var shape = shapes[i];
                var index = this.selectedShapes.indexOf(shape);
                if (index === -1)
                    this.selectedShapes.push(shape);
                else
                    this.selectedShapes.splice(index, 1);
            }
            this.rebuild();
        };

        SelectList.prototype.isSelected = function (shape) {
            return this.selectedShapes.indexOf(shape) !== -1;
        };

        SelectList.prototype.setSelectedShapes = function (shapes) {
            this.selectedShapes = shapes.slice(); // copy
            this.rebuild();
        };

        // returns the instance
        SelectList.prototype.getSelectedShapes = function () {
            return this.selectedShapes;
        };

        SelectList.prototype.getSelectGroup = function () {
            return this.selectGroup;
        };

        SelectList.prototype.clearSelectedShapes = function () {
            this.selectedShapes.length = 0;
            this.rebuild();
        };

        SelectList.prototype.draw = function (ctx) {
            this.selectGroup.draw(ctx);
        };

        SelectList.prototype.rebuild = function () {
            this.selectGroup.setShapes(this.selectedShapes);
        };
        return SelectList;
    })();
    DeckMaker.SelectList = SelectList;
})(DeckMaker || (DeckMaker = {}));
// Copyright 2014 Reece Elliott
/// <reference path="_dependencies.ts" />
var DeckMaker;
(function (DeckMaker) {
    

    var CommandList = (function () {
        function CommandList() {
            this.commands = [];
            this.currentIndex = 0;
        }
        CommandList.prototype.addCommand = function (command) {
            this.commands.length = this.currentIndex; // clip to the current undo level
            this.commands.push(command);
            this.currentIndex = this.commands.length; // past the end of the list
            command.redo();
        };

        CommandList.prototype.reset = function () {
            this.commands.length = 0;
            this.currentIndex = 0;
        };

        CommandList.prototype.undo = function () {
            if (this.currentIndex <= 0)
                return;

            this.currentIndex--;
            this.commands[this.currentIndex].undo();
        };

        CommandList.prototype.redo = function () {
            if (this.currentIndex >= this.commands.length)
                return;

            this.commands[this.currentIndex].redo();
            this.currentIndex++;
        };
        return CommandList;
    })();
    DeckMaker.CommandList = CommandList;
})(DeckMaker || (DeckMaker = {}));
// Copyright 2014 Reece Elliott
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
            if (i !== -1) {
                this.shapes.splice(i, 1);
            }

            return this;
        };

        Layer.prototype.addShapes = function (shapes) {
            for (var i = 0; i < shapes.length; ++i)
                this.addShape(shapes[i]);

            if (typeof this.sortShape === 'function')
                this.shapes.sort(this.sortShape);

            return this;
        };

        Layer.prototype.removeShapes = function (shapes) {
            for (var i = 0; i < shapes.length; ++i)
                this.removeShape(shapes[i]);

            if (typeof this.sortShape === 'function')
                this.shapes.sort(this.sortShape);

            return this;
        };

        Layer.prototype.rebuild = function () {
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
    var TemplateLayer = (function (_super) {
        __extends(TemplateLayer, _super);
        function TemplateLayer() {
            _super.apply(this, arguments);
        }
        return TemplateLayer;
    })(Layer);
    DeckMaker.TemplateLayer = TemplateLayer;

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
// Copyright 2014 Reece Elliott
/// <reference path="_dependencies.ts" />
var DeckMaker;
(function (DeckMaker) {
    //---------------------------------
    var Template = (function (_super) {
        __extends(Template, _super);
        function Template(vertices, page) {
            _super.call(this);
            this.page = page;
            this.isBack = false;
            this.count = 1;
            this.deck = null;
            this.setVertices(vertices);
        }
        Template.prototype.setVertices = function (vertices) {
            this.vertices = vertices;

            var minX = 1e10;
            var maxX = -1e10;
            var minY = 1e10;
            var maxY = -1e10;

            for (var i = 0; i < vertices.length; i += 2) {
                var x = vertices[i];
                var y = vertices[i + 1];

                minX = Math.min(x, minX);
                maxX = Math.max(x, maxX);
                minY = Math.min(y, minY);
                maxY = Math.max(y, maxY);
            }

            this.width = maxX - minX;
            this.height = maxY - minY;
        };

        Template.prototype.draw = function (ctx) {
            var vertices = this.vertices;
            if (vertices.length < 4)
                return;

            ctx.strokeStyle = this.deck.color;
            ctx.lineWidth = 3;

            ctx.beginPath();
            ctx.moveTo(vertices[0], vertices[1]);
            for (var i = 2; i < this.vertices.length; i += 2) {
                ctx.lineTo(vertices[i], vertices[i + 1]);
            }
            ctx.closePath();
            ctx.stroke();
        };

        Template.prototype.drawCard = function (ctx, cardWidth, cardHeight) {
            ctx.save();

            var pictureLayer = this.page.getLayer(DeckMaker.PictureLayer);
            var transform = this.getTransform();
            var tx = transform.tx;
            var ty = transform.ty;
            var w = this.width;
            var h = this.height;
            ctx.drawImage(pictureLayer.canvas, tx, ty, w, h, 0, 0, cardWidth, cardHeight);

            ctx.restore();
        };

        Template.prototype.isInside = function (x, y) {
            var pos = this.getTransform().getLocal(x, y);

            // ray-casting algorithm based on
            // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
            var v = this.vertices;
            var inside = false;
            for (var i = 0, j = v.length - 2; i < v.length; j = i, i += 2) {
                var xi = v[i], yi = v[i + 1], xj = v[j], yj = v[j + 1];

                var intersect = ((yi > pos.y) !== (yj > pos.y)) && (pos.x < xi + (xj - xi) * (pos.y - yi) / (yj - yi));

                if (intersect)
                    inside = !inside;
            }

            return inside;
        };
        return Template;
    })(DeckMaker.Shape);
    DeckMaker.Template = Template;

    //---------------------------------
    var Deck = (function () {
        function Deck(name) {
            this.name = name;
            this.templates = [];
            this.id = Deck.uniqueID++;
            this.color = Deck.colors[Deck.colorIndex++];
            Deck.colorIndex = (Deck.colorIndex % Deck.colors.length);
        }
        Deck.prototype.addTemplate = function (template) {
            this.templates.push(template);
            template.deck = this;
            return this;
        };

        Deck.prototype.removeTemplate = function (template) {
            var i = this.templates.indexOf(template);
            if (i !== -1) {
                template.deck = null;
                this.templates.splice(i, 1);
            }
            return this;
        };

        Deck.prototype.addTemplates = function (templates) {
            for (var i = 0; i < templates.length; ++i)
                this.addTemplate(templates[i]);
            return this;
        };

        Deck.prototype.removeTemplates = function (templates) {
            for (var i = 0; i < templates.length; ++i)
                this.removeTemplate(templates[i]);
            return this;
        };

        Deck.prototype.draw = function (ctx) {
            var pad = 10;
            var x = pad;
            var y = pad;
            var maxHeight = 0;
            var cardWidth;
            var cardHeight;
            var templates = this.templates;

            if (templates.length > 0) {
                this.cardWidth = templates[0].width;
                this.cardHeight = templates[0].height;
            }

            for (var i = 0; i < templates.length; ++i) {
                var template = templates[i];

                if (x + this.cardWidth + pad > this.maxWidth) {
                    x = pad;
                    y += this.cardHeight + pad;
                }

                ctx.save();
                ctx.translate(x, y);
                template.drawCard(ctx, this.cardWidth, this.cardHeight);

                ctx.strokeStyle = this.color;
                ctx.lineWidth = 3;
                ctx.strokeRect(0, 0, this.cardWidth, this.cardHeight);
                ctx.restore();

                x += this.cardWidth + pad;
            }

            this.width = x;
            this.height = y + cardHeight + pad;
        };
        Deck.uniqueID = 1;
        Deck.colors = [
            "red", "green", "blue", "yellow", "white", "grey", "orange", "brown"
        ];
        Deck.colorIndex = 0;
        return Deck;
    })();
    DeckMaker.Deck = Deck;

    //---------------------------------
    var DeckPage = (function (_super) {
        __extends(DeckPage, _super);
        function DeckPage(name) {
            _super.call(this, name);
        }
        DeckPage.prototype.setParent = function (parent) {
            _super.prototype.setParent.call(this, parent);

            this.deckCanvas = document.createElement("canvas");
            this.deckCanvas.width = 1000;
            this.deckCanvas.height = 1000;
            this.deckCtx = this.deckCanvas.getContext("2d");

            return this;
        };

        DeckPage.prototype.rebuild = function () {
            this.deckCtx.clearRect(0, 0, this.deckCanvas.width, this.deckCanvas.height);

            var deck = DeckMaker.getEnv("deck");
            if (deck)
                deck.draw(this.deckCtx);
        };

        DeckPage.prototype.refresh = function () {
            var ctx = this.ctx;
            ctx.clearRect(0, 0, this.parent.width, this.parent.height);

            ctx.save();
            this.panZoom.draw(ctx);
            ctx.drawImage(this.deckCanvas, 0, 0);
            ctx.restore();
        };
        return DeckPage;
    })(DeckMaker.Page);
    DeckMaker.DeckPage = DeckPage;
})(DeckMaker || (DeckMaker = {}));
// Copyright 2014 Reece Elliott
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

            var templateLayer = page.getLayer(DeckMaker.TemplateLayer);
            var toolLayer = page.getLayer(DeckMaker.ToolLayer);
            if (!toolLayer || !templateLayer)
                return;

            var panZoom = page.panZoom;
            var pos = panZoom.getLocal(touch.x, touch.y);
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
            this.templateLayer = this.page.getLayer(DeckMaker.TemplateLayer);
        }
        LocationCommand.prototype.redo = function () {
            this.templateLayer.addShapes([this.location]);
            this.templateLayer.rebuild();
            this.page.refresh();
        };

        LocationCommand.prototype.undo = function () {
            this.templateLayer.removeShapes([this.location]);
            this.templateLayer.rebuild();
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
            var templateLayer = page.getLayer(DeckMaker.TemplateLayer);
            if (!pictureLayer || !templateLayer)
                return;

            var pos = page.panZoom.getLocal(touch.x, touch.y);
            var shape = pictureLayer.getShapeFromXY(pos.x, pos.y);
            if (shape === null)
                return;

            pos = shape.getTransform().getLocal(pos.x, pos.y);

            this.canvas.width = shape.width;
            this.canvas.height = shape.height;

            shape.draw(this.ctx);

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
            newTemplate.getTransform().copy(shape.getTransform());
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
            this.templateLayer = this.page.getLayer(DeckMaker.TemplateLayer);
        }
        AutoTemplateCommand.prototype.redo = function () {
            this.deck.addTemplates(this.templates);
            this.templateLayer.addShapes(this.templates);
            this.templateLayer.rebuild();
            this.page.refresh();
        };

        AutoTemplateCommand.prototype.undo = function () {
            this.deck.removeTemplates(this.templates);
            this.templateLayer.removeShapes(this.templates);
            this.templateLayer.rebuild();
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
            this.pictureLayer.addShapes([this.picture]);
            this.pictureLayer.rebuild();
            this.page.refresh();
        };

        PictureCommand.prototype.undo = function () {
            this.pictureLayer.removeShapes([this.picture]);
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
            var templateLayer = page.getLayer(DeckMaker.TemplateLayer);
            if (!toolLayer || (!pictureLayer || !templateLayer))
                return;

            var pos = page.panZoom.getLocal(touch.x, touch.y);
            var selection = page.getSelection();
            var groupShape = selection.getSelectGroup();
            var hadFocus = this.hasFocus;

            switch (touch.state) {
                case 0 /* Down */:
                    var shape = null;

                    var templateShape = templateLayer.getShapeFromXY(pos.x, pos.y);
                    if (templateShape) {
                        shape = templateShape;
                    } else {
                        var pictureShape = pictureLayer.getShapeFromXY(pos.x, pos.y);
                        if (pictureShape)
                            shape = pictureShape;
                    }

                    if (shape) {
                        if (!groupShape.contains(shape))
                            groupShape.setShapes([shape]);

                        var shapes = selection.getSelectedShapes();
                        this.oldTransforms.length = 0;
                        for (var i = 0; i < shapes.length; ++i)
                            this.oldTransforms[i] = shapes[i].getTransform().clone();

                        toolLayer.addShapes([groupShape]);
                        this.hasFocus = true;
                    }
                    break;

                case 1 /* Move */:
                    if (this.hasFocus) {
                        groupShape.getTransform().translate(touch.dx, touch.dy);
                    }
                    break;

                case 2 /* Up */:
                    if (this.hasFocus) {
                        groupShape.applyTransformToShapes();
                        pictureLayer.rebuild();
                        templateLayer.rebuild();

                        var shapes = selection.getSelectedShapes();
                        var moveCommand = new MoveCommand(shapes, this.oldTransforms);
                        page.getCommandList().addCommand(moveCommand);

                        toolLayer.removeShapes([groupShape]);
                        this.hasFocus = false;
                    }
                    break;
            }

            if (this.hasFocus || hadFocus) {
                toolLayer.rebuild();
                page.refresh();
            }
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
// Copyright 2014 Reece Elliott
/// <reference path="_dependencies.ts" />
var DeckMaker;
(function (DeckMaker) {
    //---------------------------------
    var Board = (function () {
        function Board(parent) {
            this.parent = parent;
            this.pages = [];
            this.decks = [];
            this.page = null;
            this.deck = null;
            this.tools = [];
            this.currentTool = null;
            this.touchManager = new DeckMaker.TouchManager(parent, this.touched.bind(this));
        }
        Board.prototype.touched = function (touch) {
            if (this.currentTool) {
                this.currentTool.touched(touch);

                if (!this.currentTool.hasFocus)
                    this.currentTool = null;
            }

            for (var i = 0; this.currentTool === null && i < this.tools.length; ++i) {
                var tool = this.tools[i];
                tool.touched(touch);
                if (tool.hasFocus)
                    this.currentTool = tool;
            }
        };

        Board.prototype.setTools = function (tools) {
            this.tools = tools;
            return this;
        };

        Board.prototype.addDeck = function (deck) {
            this.decks.push(deck);
            return this;
        };

        Board.prototype.addPage = function (page) {
            this.pages.push(page);
            page.setParent(this.parent);
            return this;
        };

        Board.prototype.setPageByName = function (name) {
            var i = DeckMaker.find(this.pages, function (x) {
                return x.name === name;
            });
            if (i !== -1) {
                this.setPage(this.pages[i]);
            }

            return this;
        };

        Board.prototype.setPage = function (page) {
            DeckMaker.setEnv("page", page);

            this.page = page;
            this.page.rebuild();
            this.refresh();
        };

        Board.prototype.getPageName = function () {
            return this.page.name;
        };

        Board.prototype.setDeckByName = function (name) {
            var i = DeckMaker.find(this.decks, function (x) {
                return x.name === name;
            });
            if (i !== -1) {
                this.setDeck(this.decks[i]);
            }

            return this;
        };

        Board.prototype.getDeckName = function () {
            return this.deck.name;
        };

        Board.prototype.setDeck = function (deck) {
            DeckMaker.setEnv("deck", deck);

            this.deck = deck;
            this.page.rebuild();
            this.refresh();
        };

        Board.prototype.refresh = function () {
            this.page.refresh();
        };
        return Board;
    })();
    DeckMaker.Board = Board;
})(DeckMaker || (DeckMaker = {}));
/// <reference path="system.ts" />
/// <reference path="touch.ts" />
/// <reference path="shape.ts" />
/// <reference path="select.ts" />
/// <reference path="command.ts" />
/// <reference path="layer.ts" />
/// <reference path="page.ts" />
/// <reference path="deck.ts" />
/// <reference path="tool.ts" />
/// <reference path="board.ts" />
/// <reference path="_dependencies.ts" />
