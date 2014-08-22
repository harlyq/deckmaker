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

            var pictureLayer = this.page.getLayer("picture");
            var tx = this.transform.tx;
            var ty = this.transform.ty;
            var w = this.width;
            var h = this.height;
            ctx.drawImage(pictureLayer.canvas, tx, ty, w, h, 0, 0, cardWidth, cardHeight);

            ctx.restore();
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
