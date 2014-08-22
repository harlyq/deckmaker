// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module DeckMaker {

    //---------------------------------
    export class Shape {
        transform: Transform = new Transform();

        draw(ctx: CanvasRenderingContext2D) {}

        isInside(x: number, y: number): boolean {
            return false;
        }
    }

    //---------------------------------
    export class Picture extends Shape {
        private image = new Image();
        width: number = 0;
        height: number = 0;

        constructor(src: string) {
            super();

            this.setSrc(src);
        }

        draw(ctx: CanvasRenderingContext2D) {
            ctx.drawImage(this.image, 0, 0);
        }

        isInside(x: number, y: number): boolean {
            var pos = this.transform.getLocal(x, y);
            return pos.x >= 0 && pos.x < this.width &&
                pos.y >= 0 && pos.y < this.height;
        }

        setSrc(src: string) {
            this.image.src = src;
            this.width = this.image.width;
            this.height = this.image.height;
        }
    }

    //---------------------------------
    export class Location extends Shape {
        constructor(public width: number, public height: number) {
            super();
        }

        draw(ctx: CanvasRenderingContext2D) {
            ctx.save();
            ctx.strokeRect(0, 0, this.width, this.height);
            ctx.restore();
        }

        isInside(x: number, y: number): boolean {
            var pos = this.transform.getLocal(x, y);
            return pos.x >= 0 && pos.x < this.width &&
                pos.y >= 0 && pos.y < this.height;
        }
    }

}
