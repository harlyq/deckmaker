// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module DeckMaker {

    //---------------------------------
    export class Deck {
        private templates: Template[] = [];
        id: number;
        color: string;
        cardWidth: number;
        cardHeight: number;
        maxWidth: number;
        width: number;
        height: number;
        get aspectRatio(): number {
            return this.cardWidth / this.cardHeight;
        }

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

            if (this.templates.length === 1) {
                this.cardWidth = template.width;
                this.cardHeight = template.height;
            }
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

        getFirstTemplate(): Template {
            return this.templates[0];
        }

        createCards(): Card[] {
            var cards: Card[] = [];
            for (var i = 0; i < this.templates.length; ++i) {
                var template = this.templates[i];
                for (var j = 0; j < template.numCards; ++j)
                    cards.push(new Card(this.cardWidth, this.cardHeight, template));
            }
            return cards;
        }

        draw(ctx) {
            var pad = 10;
            var x = pad;
            var y = pad;
            var maxHeight = 0;
            var cardWidth;
            var cardHeight;
            var templates = this.templates;

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
}
