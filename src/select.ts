// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module DeckMaker {

    //------------------------------
    export class SelectList {
        private selectedShapes: Shape[] = [];
        private selectGroup: GroupShape = new GroupShape();

        constructor() {}

        reset() {
            this.selectedShapes.length = 0;
            this.selectGroup.setShapes([]);
        }

        // removes the shape from the selected list
        removeSelected(shape: Shape) {
            var index: number = this.selectedShapes.indexOf(shape);
            if (index !== -1) {
                this.selectedShapes.splice(index, 1);
                this.rebuild();
            }
        }

        toggleSelected(shapes: Shape[]) {
            for (var i: number = 0; i < shapes.length; ++i) {
                var shape: Shape = shapes[i];
                var index: number = this.selectedShapes.indexOf(shape);
                if (index === -1)
                    this.selectedShapes.push(shape);
                else
                    this.selectedShapes.splice(index, 1);
            }
            this.rebuild();
        }

        isSelected(shape: Shape): boolean {
            return this.selectedShapes.indexOf(shape) !== -1;
        }

        setSelectedShapes(shapes: Shape[]) {
            this.selectedShapes = shapes.slice(); // copy
            this.rebuild();
        }

        // returns the instance
        getSelectedShapes(): Shape[] {
            return this.selectedShapes;
        }

        getSelectGroup(): GroupShape {
            return this.selectGroup;
        }

        clearSelectedShapes() {
            this.selectedShapes.length = 0;
            this.rebuild();
        }

        draw(ctx) {
            this.selectGroup.draw(ctx);
        }

        rebuild() {
            this.selectGroup.setShapes(this.selectedShapes);
        }
    }

}
