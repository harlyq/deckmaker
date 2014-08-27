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

        draw(ctx: CanvasRenderingContext2D) {
            ctx.save();
            ctx.strokeRect(0, 0, this.width, this.height);

            for (var i = 0; i < this.cards.length; ++i)
                this.cards[i].draw(ctx);

            ctx.restore();
        }
    }

    //---------------------------------
    export
    var locationDefinitionGroup: PropertyPanel.DefinitionGroup = {
        canUse: obj => {
            return obj instanceof Location;
        },
        definitions: [{
            prop: 'layout',
            editorType: 'list',
            getList: function(): {
                [key: string]: any
            } {
                return enumToList(LayoutType);
            }
        }]
    }
    extend(locationDefinitionGroup, shapeDefinitionGroup);

}