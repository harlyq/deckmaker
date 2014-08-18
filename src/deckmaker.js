var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var DeckMaker;
(function (DeckMaker) {
    function find(array, predicate) {
        for (var i = 0; i < array.length; ++i) {
            if (predicate(array[i], i, array))
                return i;
        }
        return -1;
    }

    function distance(x1, y1, x2, y2) {
        var dx = x2 - x1;
        var dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function getImageCol(imageData, pixel) {
        pixel *= 4;
        return new Color(imageData.data[pixel], imageData.data[pixel + 1], imageData.data[pixel + 2], imageData.data[pixel + 3]);
    }

    function setImageCol(imageData, pixel, color) {
        pixel *= 4;
        imageData.data[pixel] = color.r;
        imageData.data[pixel + 1] = color.g;
        imageData.data[pixel + 2] = color.b;
        imageData.data[pixel + 3] = color.a;
    }

    

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

    var Shape = (function () {
        function Shape() {
            this.transform = new Transform();
        }
        Shape.prototype.draw = function (ctx) {
        };

        Shape.prototype.isInside = function (x, y) {
            return false;
        };
        return Shape;
    })();
    DeckMaker.Shape = Shape;

    var Options = (function () {
        function Options() {
        }
        Options.prototype.getGroupColor = function (group) {
            switch (group) {
                case 1:
                    return 'red';
                case 2:
                    return 'blue';
                case 3:
                    return 'green';
                default:
                    return 'white';
            }
        };
        return Options;
    })();
    DeckMaker.Options = Options;
    var g_options = new Options();

    (function (TouchState) {
        TouchState[TouchState["Down"] = 0] = "Down";
        TouchState[TouchState["Move"] = 1] = "Move";
        TouchState[TouchState["Up"] = 2] = "Up";
        TouchState[TouchState["Wheel"] = 3] = "Wheel";
    })(DeckMaker.TouchState || (DeckMaker.TouchState = {}));
    var TouchState = DeckMaker.TouchState;
    ;

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

    var Template = (function (_super) {
        __extends(Template, _super);
        function Template(vertices) {
            _super.call(this);
            this.vertices = vertices;
            this.isBack = false;
            this.group = 1;
            this.count = 1;
        }
        Template.prototype.draw = function (ctx) {
            var vertices = this.vertices;
            if (vertices.length < 4)
                return;

            ctx.strokeStyle = g_options.getGroupColor(this.group);
            ctx.lineWidth = 3;

            ctx.beginPath();
            ctx.moveTo(vertices[0], vertices[1]);
            for (var i = 2; i < this.vertices.length; i += 2) {
                ctx.lineTo(vertices[i], vertices[i + 1]);
            }
            ctx.closePath();
            ctx.stroke();
        };

        Template.prototype.isInside = function (x, y) {
            var pos = this.transform.getLocal(x, y);

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
    })(Shape);

    var Picture = (function (_super) {
        __extends(Picture, _super);
        function Picture(src) {
            _super.call(this);
            this.image = new Image();
            this.width = 0;
            this.height = 0;
            this.templates = [];

            this.setsrc(src);
        }
        Picture.prototype.draw = function (ctx) {
            ctx.drawImage(this.image, 0, 0);
        };

        Picture.prototype.isInside = function (x, y) {
            var pos = this.transform.getLocal(x, y);
            return pos.x >= 0 && pos.x < this.width && pos.y >= 0 && pos.y < this.height;
        };

        Picture.prototype.setsrc = function (src) {
            this.image.src = src;
            this.width = this.image.width;
            this.height = this.image.height;
        };
        return Picture;
    })(Shape);

    var Tool = (function () {
        function Tool(name, page) {
            this.name = name;
            this.page = page;
            this.hasFocus = false;
        }
        Tool.prototype.draw = function (ctx) {
        };

        Tool.prototype.touched = function (touch) {
        };

        Tool.prototype.isInside = function (x, y) {
            return false;
        };
        return Tool;
    })();
    DeckMaker.Tool = Tool;

    var TemplateTool = (function (_super) {
        __extends(TemplateTool, _super);
        function TemplateTool(name, page) {
            _super.call(this, name, page);
        }
        return TemplateTool;
    })(Tool);
    DeckMaker.TemplateTool = TemplateTool;

    var SelectTool = (function (_super) {
        __extends(SelectTool, _super);
        function SelectTool(name, page) {
            _super.call(this, name, page);
        }
        return SelectTool;
    })(Tool);
    DeckMaker.SelectTool = SelectTool;

    var PanZoomTool = (function (_super) {
        __extends(PanZoomTool, _super);
        function PanZoomTool(name, page) {
            _super.call(this, name, page);
        }
        PanZoomTool.prototype.touched = function (touch) {
            var panZoom = this.page.panZoom;
            var hasChanged = false;

            switch (touch.state) {
                case 0 /* Down */:
                    this.hasFocus = true;
                    hasChanged = true;
                    if (typeof touch.x2 !== "undefined") {
                        this.oldDistance = distance(touch.x, touch.y, touch.x2, touch.y2);
                        this.oldCX = (touch.x + touch.x2) >> 1;
                        this.oldCY = (touch.y + touch.y2) >> 1;
                    }
                    break;

                case 1 /* Move */:
                    if (typeof touch.x2 !== "undefined") {
                    }
                    panZoom.tx += touch.dx;
                    panZoom.ty += touch.dy;
                    hasChanged = true;
                    break;

                case 2 /* Up */:
                    this.hasFocus = false;
                    hasChanged = true;
                    break;

                case 3 /* Wheel */:
                    //this.hasFocus = true; wheel is one-shot
                    var scale = (touch.dy > 0 ? 1 / 1.15 : 1.15);
                    panZoom.tx = touch.x - (touch.x - panZoom.tx) * scale;
                    panZoom.ty = touch.y - (touch.y - panZoom.ty) * scale;
                    panZoom.sx *= scale;
                    panZoom.sy *= scale;
                    hasChanged = true;
                    break;
            }

            this.page.rebuildAll();
        };
        return PanZoomTool;
    })(Tool);
    DeckMaker.PanZoomTool = PanZoomTool;

    var AlphaFillTool = (function (_super) {
        __extends(AlphaFillTool, _super);
        function AlphaFillTool(name, page) {
            _super.call(this, name, page);

            this.canvas = document.createElement("canvas");
            this.ctx = this.canvas.getContext("2d");
        }
        AlphaFillTool.prototype.touched = function (touch) {
            if (touch.state !== 0 /* Down */)
                return;

            var pictureLayer = this.page.getLayer("picture");
            var picture = pictureLayer.getShapeFromTouch(touch.x, touch.y);
            if (picture === null)
                return;

            var pos = pictureLayer.panZoom.getLocal(touch.x, touch.y);
            pos = picture.transform.getLocal(pos.x, pos.y);

            this.canvas.width = picture.width;
            this.canvas.height = picture.height;

            picture.draw(this.ctx);

            var firstColor;
            var alphaColor = new Color(0, 0, 0, 0);
            var tolerance = 50;

            var imageData = floodFill({
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
                    setImageCol(imageData, pixel, alphaColor);
                }
            });

            this.ctx.putImageData(imageData, 0, 0);
            picture.setsrc(this.canvas.toDataURL());

            this.page.rebuildLayer("picture");
        };
        return AlphaFillTool;
    })(Tool);
    DeckMaker.AlphaFillTool = AlphaFillTool;

    var AutoTemplateTool = (function (_super) {
        __extends(AutoTemplateTool, _super);
        function AutoTemplateTool(name, page) {
            _super.call(this, name, page);

            this.canvas = document.createElement("canvas");
            this.ctx = this.canvas.getContext("2d");
        }
        AutoTemplateTool.prototype.draw = function (ctx) {
        };

        AutoTemplateTool.prototype.touched = function (touch) {
            if (touch.state !== 0 /* Down */)
                return;

            var pictureLayer = this.page.getLayer("picture");
            var picture = pictureLayer.getShapeFromTouch(touch.x, touch.y);
            if (picture === null)
                return;

            var pos = pictureLayer.panZoom.getLocal(touch.x, touch.y);
            pos = picture.transform.getLocal(pos.x, pos.y);

            this.canvas.width = picture.width;
            this.canvas.height = picture.height;

            picture.draw(this.ctx);

            var used = new Color(0, 0, 0, 0);
            var minX = 1e10;
            var maxX = -1e10;
            var minY = 1e10;
            var maxY = -1e10;

            var imageData = floodFill({
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
                    setImageCol(imageData, pixel, used);
                }
            });

            var templateLayer = this.page.getLayer("template");
            var newTemplate = new Template([minX, minY, maxX, minY, maxX, maxY, minX, maxY]);
            newTemplate.transform.copy(picture.transform);

            templateLayer.addShape(newTemplate);

            this.page.rebuildLayer("template");
        };
        return AutoTemplateTool;
    })(Tool);
    DeckMaker.AutoTemplateTool = AutoTemplateTool;

    var Layer = (function () {
        function Layer(name, parent, panZoom) {
            this.name = name;
            this.parent = parent;
            this.panZoom = panZoom;
            this.shapes = [];
            this.canvas = document.createElement("canvas");
            this.canvas.width = parent.width;
            this.canvas.height = parent.height;
            this.ctx = this.canvas.getContext("2d");

            parent.appendChild(this.canvas);
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

        Layer.prototype.addShape = function (shape) {
            this.shapes.push(shape);
        };

        Layer.prototype.removeShape = function (shape) {
            var i = this.shapes.indexOf(shape);
            if (i !== -1)
                this.shapes.splice(i, 1);
        };

        Layer.prototype.rebuild = function () {
            var ctx = this.ctx;
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            ctx.save();
            this.panZoom.draw(this.ctx);

            for (var i = 0; i < this.shapes.length; ++i) {
                ctx.save();
                this.shapes[i].transform.draw(ctx);
                this.shapes[i].draw(ctx);
                ctx.restore();
            }

            ctx.restore();
        };

        Layer.prototype.getShapeFromTouch = function (x, y) {
            var pos = this.panZoom.getLocal(x, y);

            for (var i = this.shapes.length - 1; i >= 0; --i) {
                var shape = this.shapes[i];
                if (shape.isInside(pos.x, pos.y)) {
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

    var Page = (function () {
        function Page(name, parent) {
            this.name = name;
            this.parent = parent;
            this.panZoom = new Transform();
            this.layers = [];
            this.ctx = parent.getContext("2d");
        }
        Page.prototype.getLayer = function (name) {
            return this[name];
        };

        Page.prototype.createLayer = function (name) {
            var layer = new Layer(name, this.parent, this.panZoom);
            this.layers.push(layer);
            this[name] = layer;
        };

        Page.prototype.rebuildLayer = function (name) {
            var layer = this[name];
            if (!layer)
                return;

            layer.rebuild();
            this.refresh();
        };

        Page.prototype.rebuildAll = function () {
            for (var i = 0; i < this.layers.length; ++i)
                this.layers[i].rebuild();

            this.refresh();
        };

        Page.prototype.refresh = function () {
            this.ctx.clearRect(0, 0, this.parent.width, this.parent.height);

            for (var i = 0; i < this.layers.length; ++i)
                this.layers[i].draw(this.ctx);
        };
        return Page;
    })();
    DeckMaker.Page = Page;

    var Board = (function () {
        function Board(parent) {
            this.parent = parent;
            this.templates = [];
            this.tools = [];
            this.currentTool = null;
            this.pages = [];
            this.currentPage = null;
            this.toolSet = "";
            this.touchManager = new TouchManager(parent, this.touched.bind(this));

            this.createPage("board");
            this.createPage("deck");
            var cutout1 = this.createPage("cutout1");
            cutout1.createLayer("picture");
            cutout1.createLayer("template");
            cutout1.createLayer("tool");

            this.alphaFillTool = new DeckMaker.AlphaFillTool("alphaFill", cutout1);
            this.autoTemplateTool = new DeckMaker.AutoTemplateTool("autoTemplate", cutout1);
            this.panZoomTool = new DeckMaker.PanZoomTool("panZoom", cutout1);
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

        Board.prototype.addTool = function (tool) {
            this.tools.push(tool);
            return this;
        };

        Board.prototype.setToolSet = function (name) {
            switch (name) {
                case "autoTemplate":
                    this.tools = [this.autoTemplateTool, this.panZoomTool];
                    break;
                case "alphaFill":
                    this.tools = [this.alphaFillTool, this.panZoomTool];
                    break;
            }
            this.toolSet = name;
            return this;
        };

        Board.prototype.getToolSet = function () {
            return this.toolSet;
        };

        Board.prototype.createPage = function (name) {
            var page = new Page(name, this.parent);
            this.pages.push(page);
            this[name] = page;
            this.currentPage = page;
            return page;
        };

        Board.prototype.setPage = function (name) {
            if (this[name]) {
                this.currentPage = this[name];
                this.refresh();
            }
            return this;
        };

        Board.prototype.getPage = function () {
            return this.currentPage.name;
        };

        Board.prototype.addPicture = function (src) {
            var newPicture = new Picture(src);
            newPicture.transform.translate(10, 10);
            this.currentPage.getLayer("picture").addShape(newPicture);
            this.currentPage.rebuildLayer("picture");
        };

        Board.prototype.refresh = function () {
            this.currentPage.refresh();
        };
        return Board;
    })();
    DeckMaker.Board = Board;
})(DeckMaker || (DeckMaker = {}));
