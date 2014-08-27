// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module DeckMaker {

    //---------------------------------
    export class DeckPage extends Page {
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
