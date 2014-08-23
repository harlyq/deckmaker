// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module DeckMaker {

    //---------------------------------
    export class Template extends Shape {
        private vertices: number[];
        private isBack: boolean = false;
        count: number = 1;
        deck: Deck = null;

        constructor(vertices: number[], private page: Page) {
            super();
            this.setVertices(vertices);
        }

        setVertices(vertices: number[]) {
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
        }

        draw(ctx: CanvasRenderingContext2D) {
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
        }

        drawCard(ctx: CanvasRenderingContext2D, cardWidth: number, cardHeight: number) {
            ctx.save();

            var pictureLayer = this.page.getLayer(PictureLayer);
            var transform = this.getTransform();
            var tx = transform.tx;
            var ty = transform.ty;
            var w = this.width;
            var h = this.height;
            ctx.drawImage(pictureLayer.canvas, tx, ty, w, h, 0, 0, cardWidth, cardHeight);

            ctx.restore();
        }

        isInside(x: number, y: number): boolean {
            var pos = this.getTransform().getLocal(x, y);

            // ray-casting algorithm based on
            // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

            var v = this.vertices;
            var inside = false;
            for (var i = 0, j = v.length - 2; i < v.length; j = i, i += 2) {
                var xi = v[i],
                    yi = v[i + 1],
                    xj = v[j],
                    yj = v[j + 1];

                var intersect = ((yi > pos.y) !== (yj > pos.y)) &&
                    (pos.x < xi + (xj - xi) * (pos.y - yi) / (yj - yi));

                if (intersect)
                    inside = !inside;
            }

            return inside;
        }
    }

    //---------------------------------
    export class Deck {
        id: number;
        color: string;
        cardWidth: number;
        cardHeight: number;
        maxWidth: number;
        width: number;
        height: number;
        private templates: Template[] = [];

        private static uniqueID: number = 1;
        private static colors: string[] = [
            "red", "green", "blue", "yellow", "white", "grey", "orange", "brown"
        ];
        private static colorIndex: number = 0;

        constructor(public name: string) {
            this.id = Deck.uniqueID++;
            this.color = Deck.colors[Deck.colorIndex++];
            Deck.colorIndex = (Deck.colorIndex % Deck.colors.length);
        }

        addTemplate(template: Template): Deck {
            this.templates.push(template);
            template.deck = this;
            return this;
        }

        removeTemplate(template: Template): Deck {
            var i = this.templates.indexOf(template);
            if (i !== -1) {
                template.deck = null;
                this.templates.splice(i, 1);
            }
            return this;
        }

        addTemplates(templates: Template[]): Deck {
            for (var i = 0; i < templates.length; ++i)
                this.addTemplate(templates[i]);
            return this;
        }

        removeTemplates(templates: Template[]): Deck {
            for (var i = 0; i < templates.length; ++i)
                this.removeTemplate(templates[i]);
            return this;
        }

        draw(ctx) {
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
                    x = pad
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
        }
    }

    //---------------------------------
    export class DeckPage extends Page {
        deck: Deck;
        deckCtx: CanvasRenderingContext2D;
        deckCanvas: HTMLCanvasElement;

        constructor(name: string) {
            super(name);
        }

        setParent(parent: HTMLCanvasElement): DeckPage {
            super.setParent(parent);

            this.deckCanvas = document.createElement("canvas");
            this.deckCanvas.width = 1000;
            this.deckCanvas.height = 1000;
            this.deckCtx = this.deckCanvas.getContext("2d");

            return this;
        }

        rebuild() {
            this.deckCtx.clearRect(0, 0, this.deckCanvas.width, this.deckCanvas.height);

            var deck: Deck = getEnv("deck");
            if (deck)
                deck.draw(this.deckCtx)
        }

        refresh() {
            var ctx = this.ctx;
            ctx.clearRect(0, 0, this.parent.width, this.parent.height);

            ctx.save();
            this.panZoom.draw(ctx);
            ctx.drawImage(this.deckCanvas, 0, 0);
            ctx.restore();
        }
    }


}
