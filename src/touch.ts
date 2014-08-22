// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module DeckMaker {

    interface TouchEvent {
        touches: any[];
        preventDefault: () => void;
    }

    //---------------------------------
    export enum TouchState {
        Down, Move, Up, Wheel
    };

    //---------------------------------
    //TODO needed for export on tool - no way to make it private?!!!
    export class Touch {
        constructor(public state: TouchState, public x: number, public y: number,
            public dx: number, public dy: number, public x2 ? : number, public y2 ? : number) {}
    }

    //---------------------------------
    export class TouchManager {
        lastX: number = 0;
        lastY: number = 0;
        mouseX: number = 0;
        mouseY: number = 0;
        mouseUpHandler = this.mouseUp.bind(this);
        mouseMoveHandler = this.mouseMove.bind(this);
        touchEndHandler = this.touchEnd.bind(this);
        touchMoveHandler = this.touchMove.bind(this);

        constructor(private parent: HTMLElement, private callback: (touch: Touch) => void) {
            if (typeof this.callback !== 'function')
                return;

            parent.addEventListener('mousedown', this.mouseDown.bind(this));
            parent.addEventListener('mousewheel', this.mouseWheel.bind(this));
            parent.addEventListener('mousemove', this.mouseTrack.bind(this));
            parent.addEventListener('touchstart', this.touchStart.bind(this));
        }

        private sendMouseEvent(e: MouseEvent, state: TouchState) {
            e.preventDefault();

            var x = e.pageX - this.parent.offsetLeft;
            var y = e.pageY - this.parent.offsetTop;

            if (state == TouchState.Down) {
                this.lastX = x;
                this.lastY = y;
            }

            this.callback(new Touch(state, x, y, x - this.lastX, y - this.lastY));

            this.lastX = x;
            this.lastY = y;
        }

        private mouseDown(e: MouseEvent) {
            document.addEventListener('mouseup', this.mouseUpHandler);
            document.addEventListener('mousemove', this.mouseMoveHandler);

            this.sendMouseEvent(e, TouchState.Down);
        }

        private mouseTrack(e: MouseEvent) {
            this.mouseX = e.pageX - this.parent.offsetLeft;
            this.mouseY = e.pageY - this.parent.offsetTop;
        }

        private mouseMove(e: MouseEvent) {
            this.sendMouseEvent(e, TouchState.Move);
        }

        private mouseUp(e: MouseEvent) {
            this.sendMouseEvent(e, TouchState.Up);

            document.removeEventListener('mousemove', this.mouseMoveHandler);
            document.removeEventListener('mouseup', this.mouseUpHandler);
        }

        private mouseWheel(e: WheelEvent) {
            this.callback(new Touch(TouchState.Wheel, this.lastX, this.lastY, e.deltaX, e.deltaY));
        }

        private sendTouchEvent(e: TouchEvent, state: TouchState) {
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

            if (state == TouchState.Down) {
                this.lastX = x;
                this.lastY = y;
            }

            this.callback(new Touch(state, x, y, x - this.lastX, y - this.lastY, x2, y2));
            this.lastX = x;
            this.lastY = y;
        }

        private touchStart(e: TouchEvent) {
            document.addEventListener('touchend', this.touchEndHandler);
            document.addEventListener('touchmove', this.touchMoveHandler);

            this.sendTouchEvent(e, TouchState.Down);
        }

        private touchMove(e: TouchEvent) {
            this.sendTouchEvent(e, TouchState.Move);
        }

        private touchEnd(e: TouchEvent) {
            this.sendTouchEvent(e, TouchState.Up);

            document.removeEventListener('touchmove', this.touchMoveHandler);
            document.removeEventListener('touchend', this.touchEndHandler);
        }
    }

}
