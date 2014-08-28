// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module DeckMaker {

    export class DeckPanel {
        private lastChild: Node;
        private canvas: HTMLCanvasElement;
        private ctx: CanvasRenderingContext2D;

        // TODO maybe this should be a HTMLElement rather than HTMLCanvasElement - but what about resizing?
        constructor(public parent: HTMLCanvasElement) {
            this.lastChild = parent.lastChild;
            this.canvas = parent;
            this.ctx = parent.getContext("2d");
        }

        refresh() {
            this.cleanup();
            this.buildHTML();
        }

        private cleanup() {
            while (this.parent.lastChild !== this.lastChild)
                this.parent.removeChild(this.parent.lastChild);
        }

        private buildHTML() {
            var decks = g_DeckManager.getDecks();
            var width = this.canvas.width;
            var y = 0;
            var x = width * 0.1;
            var height = width / Math.sqrt(2);

            decks.forEach((deck) => {
                var template = deck.getFirstTemplate();
                if (!template)
                    return;

                template.draw
            });
        }
    }
}
