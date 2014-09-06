// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module DeckMaker {

    //---------------------------------
    export class Template extends Shape {
        private vertices: number[];
        private isBack: boolean = false;
        numCards: number = 1;
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

        draw(ctx: CanvasRenderingContext2D, transform: Transform) {
            var vertices = this.vertices;
            if (vertices.length < 4)
                return;

            ctx.save();
            ctx.strokeStyle = this.deck.color;
            ctx.lineWidth = 3;

            ctx.beginPath();
            drawMoveTo(ctx, transform, vertices[0], vertices[1]);
            for (var i = 2; i < this.vertices.length; i += 2) {
                drawLineTo(ctx, transform, vertices[i], vertices[i + 1]);
            }
            ctx.closePath();
            ctx.stroke();

            ctx.fillStyle = 'grey'
            ctx.font = '20pt arial';
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
            drawText(ctx, transform, this.numCards.toString(), this.width / 2, this.height / 2);
            ctx.restore();
        }

        drawCard(ctx: CanvasRenderingContext2D, cardWidth: number, cardHeight: number) {
            var pictureLayer = this.page.getLayer(PictureLayer);
            var transform = this.getTransform();
            var tx = transform.tx;
            var ty = transform.ty;
            var w = this.width * transform.sx;
            var h = this.height * transform.sy;
            ctx.drawImage(pictureLayer.canvas, tx, ty, w, h, 0, 0, cardWidth, cardHeight);
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
    export
    var templateDefinition = PropertyPanel.createDefinition({
        type: Template,
        parent: Shape,
        properties: {
            isBack: {},
            numCards: {}
        }
    });

}
