// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module DeckMaker {
    //---------------------------------
    export class Card extends Shape {
        location: Location;

        constructor(public width: number, public height: number, public template: Template) {
            super();
        }

        draw(ctx: CanvasRenderingContext2D) {
            this.template.drawCard(ctx, this.width, this.height);
        }
    }
}
