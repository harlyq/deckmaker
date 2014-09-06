// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module DeckMaker {

    //---------------------------------
    export enum LayoutType {
        Stack, FanHorizontal, FanVertical, Grid, Row, Column
    }

    //---------------------------------
    export class Location extends Shape {
        cards: Card[] = [];
        layout: LayoutType = LayoutType.Stack;

        constructor(width: number, height: number) {
            super();
            this.width = width;
            this.height = height;
        }

        private addCard(card: Card) {
            if (card.location) {
                if (card.location === this)
                    return; // already added

                card.location.removeCard(card);
            }

            card.location = this;
            this.cards.push(card);
        }

        private removeCard(card: Card) {
            var i = this.cards.indexOf(card);
            if (i !== -1) {
                this.cards.splice(i, 1);
                card.location = null;
            }
        }

        addCards(cards: Card[]) {
            for (var i = 0; i < cards.length; ++i)
                this.addCard(cards[i]);
        }

        removeCards(cards: Card[]) {
            for (var i = 0; i < cards.length; ++i)
                this.removeCard(cards[i]);
        }

        draw(ctx: CanvasRenderingContext2D, transform: Transform) {
            ctx.save();

            ctx.beginPath();
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'blue';
            drawRect(ctx, transform, this.width, this.height);
            ctx.stroke();

            var cardTransform = new Transform();
            for (var i = 0; i < this.cards.length; ++i) {
                var card = this.cards[i];
                cardTransform.copy(transform);
                cardTransform.postMultiply(card.getTransform());
                card.draw(ctx);
            }

            ctx.restore();
        }
    }

    //---------------------------------
    export
    var locationDefinition = PropertyPanel.createDefinition({
        type: Location,
        parent: Shape,
        properties: {
            layout: {
                editorType: 'list',
                getList: function(): {
                    [key: string]: any
                } {
                    return enumToList(LayoutType);
                }
            }
        }
    });
}
