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
            var index = this.selectedShapes.indexOf(shape);
            if (index !== -1) {
                this.selectedShapes.splice(index, 1);
                this.refresh();
            }
        }

        toggleSelected(shape: Shape) {
            var index = this.selectedShapes.indexOf(shape);
            if (index === -1)
                this.selectedShapes.push(shape);
            else
                this.selectedShapes.splice(index, 1);

            this.refresh();
        }

        containsSelected(shape: Shape) {
            return this.selectedShapes.indexOf(shape) !== -1;
        }

        isSelected(shape: Shape): boolean {
            return this.selectedShapes.indexOf(shape) !== -1;
        }

        setSelectedShapes(shapes: Shape[]) {
            this.selectedShapes = shapes.slice(); // copy
            this.refresh();
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
            this.refresh();
        }

        draw(ctx: CanvasRenderingContext2D, parentTransform: Transform) {
            this.selectGroup.draw(ctx, parentTransform);
        }

        refresh() {
            this.selectGroup.setShapes(this.selectedShapes);
        }
    }

}
