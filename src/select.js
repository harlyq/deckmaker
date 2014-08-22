// Copyright 2014 Reece Elliott
/// <reference path="_dependencies.ts" />
var DeckMaker;
(function (DeckMaker) {
    //------------------------------
    var SelectList = (function () {
        function SelectList() {
            this.selectedShapes = [];
            this.selectGroup = new DeckMaker.GroupShape();
        }
        SelectList.prototype.refresh = function () {
            this.rebuildSelectGroup();
        };

        SelectList.prototype.reset = function () {
            this.selectedShapes.length = 0;
            this.selectGroup.setShapes([]);
        };

        // removes the shape from the selected list
        SelectList.prototype.removeSelected = function (shape) {
            var index = this.selectedShapes.indexOf(shape);
            if (index !== -1) {
                this.selectedShapes.splice(index, 1);
                this.rebuildSelectGroup();
            }
        };

        SelectList.prototype.toggleSelected = function (shapes) {
            for (var i = 0; i < shapes.length; ++i) {
                var shape = shapes[i];
                var index = this.selectedShapes.indexOf(shape);
                if (index === -1)
                    this.selectedShapes.push(shape);
                else
                    this.selectedShapes.splice(index, 1);
            }
            this.rebuildSelectGroup();
        };

        SelectList.prototype.isSelected = function (shape) {
            return this.selectedShapes.indexOf(shape) !== -1;
        };

        SelectList.prototype.setSelectedShapes = function (shapes) {
            this.selectedShapes = shapes.slice(); // copy
            this.rebuildSelectGroup();
        };

        // returns the instance
        SelectList.prototype.getSelectedShapes = function () {
            return this.selectedShapes;
        };

        SelectList.prototype.clearSelectedShapes = function () {
            this.selectedShapes.length = 0;
            this.rebuildSelectGroup();
        };

        SelectList.prototype.draw = function (ctx) {
            this.selectGroup.draw(ctx);
        };

        SelectList.prototype.rebuildSelectGroup = function () {
            this.selectGroup.setShapes(this.selectedShapes);
        };
        return SelectList;
    })();
    DeckMaker.SelectList = SelectList;
})(DeckMaker || (DeckMaker = {}));