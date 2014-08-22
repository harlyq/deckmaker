// Copyright 2014 Reece Elliott
/// <reference path="_dependencies.ts" />
var DeckMaker;
(function (DeckMaker) {
    //---------------------------------
    (function (TouchState) {
        TouchState[TouchState["Down"] = 0] = "Down";
        TouchState[TouchState["Move"] = 1] = "Move";
        TouchState[TouchState["Up"] = 2] = "Up";
        TouchState[TouchState["Wheel"] = 3] = "Wheel";
    })(DeckMaker.TouchState || (DeckMaker.TouchState = {}));
    var TouchState = DeckMaker.TouchState;
    ;

    //---------------------------------
    //TODO needed for export on tool - no way to make it private?!!!
    var Touch = (function () {
        function Touch(state, x, y, dx, dy, x2, y2) {
            this.state = state;
            this.x = x;
            this.y = y;
            this.dx = dx;
            this.dy = dy;
            this.x2 = x2;
            this.y2 = y2;
        }
        return Touch;
    })();
    DeckMaker.Touch = Touch;

    //---------------------------------
    var TouchManager = (function () {
        function TouchManager(parent, callback) {
            this.parent = parent;
            this.callback = callback;
            this.lastX = 0;
            this.lastY = 0;
            this.mouseX = 0;
            this.mouseY = 0;
            this.mouseUpHandler = this.mouseUp.bind(this);
            this.mouseMoveHandler = this.mouseMove.bind(this);
            this.touchEndHandler = this.touchEnd.bind(this);
            this.touchMoveHandler = this.touchMove.bind(this);
            if (typeof this.callback !== 'function')
                return;

            parent.addEventListener('mousedown', this.mouseDown.bind(this));
            parent.addEventListener('mousewheel', this.mouseWheel.bind(this));
            parent.addEventListener('mousemove', this.mouseTrack.bind(this));
            parent.addEventListener('touchstart', this.touchStart.bind(this));
        }
        TouchManager.prototype.sendMouseEvent = function (e, state) {
            e.preventDefault();

            var x = e.pageX - this.parent.offsetLeft;
            var y = e.pageY - this.parent.offsetTop;

            if (state == 0 /* Down */) {
                this.lastX = x;
                this.lastY = y;
            }

            this.callback(new Touch(state, x, y, x - this.lastX, y - this.lastY));

            this.lastX = x;
            this.lastY = y;
        };

        TouchManager.prototype.mouseDown = function (e) {
            document.addEventListener('mouseup', this.mouseUpHandler);
            document.addEventListener('mousemove', this.mouseMoveHandler);

            this.sendMouseEvent(e, 0 /* Down */);
        };

        TouchManager.prototype.mouseTrack = function (e) {
            this.mouseX = e.pageX - this.parent.offsetLeft;
            this.mouseY = e.pageY - this.parent.offsetTop;
        };

        TouchManager.prototype.mouseMove = function (e) {
            this.sendMouseEvent(e, 1 /* Move */);
        };

        TouchManager.prototype.mouseUp = function (e) {
            this.sendMouseEvent(e, 2 /* Up */);

            document.removeEventListener('mousemove', this.mouseMoveHandler);
            document.removeEventListener('mouseup', this.mouseUpHandler);
        };

        TouchManager.prototype.mouseWheel = function (e) {
            this.callback(new Touch(3 /* Wheel */, this.lastX, this.lastY, e.deltaX, e.deltaY));
        };

        TouchManager.prototype.sendTouchEvent = function (e, state) {
            e.preventDefault();

            var x;
            var y;

            if (e.touches.length > 0) {
                x = e.touches[0].pageX - this.parent.offsetLeft;
                y = e.touches[0].pageY - this.parent.offsetTop;
            }

            var x2;
            var y2;
            if (e.touches.length > 1) {
                x2 = e.touches[1].pageX - this.parent.offsetLeft;
                y2 = e.touches[1].pageY - this.parent.offsetTop;
            }

            if (state == 0 /* Down */) {
                this.lastX = x;
                this.lastY = y;
            }

            this.callback(new Touch(state, x, y, x - this.lastX, y - this.lastY, x2, y2));
            this.lastX = x;
            this.lastY = y;
        };

        TouchManager.prototype.touchStart = function (e) {
            document.addEventListener('touchend', this.touchEndHandler);
            document.addEventListener('touchmove', this.touchMoveHandler);

            this.sendTouchEvent(e, 0 /* Down */);
        };

        TouchManager.prototype.touchMove = function (e) {
            this.sendTouchEvent(e, 1 /* Move */);
        };

        TouchManager.prototype.touchEnd = function (e) {
            this.sendTouchEvent(e, 2 /* Up */);

            document.removeEventListener('touchmove', this.touchMoveHandler);
            document.removeEventListener('touchend', this.touchEndHandler);
        };
        return TouchManager;
    })();
    DeckMaker.TouchManager = TouchManager;
})(DeckMaker || (DeckMaker = {}));
