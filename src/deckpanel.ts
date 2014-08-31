// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module DeckMaker {

    declare
    var CustomEvent: {
        new(event: string, detail: any): CustomEvent;
    }

    export class DeckPanel {
        private lastChild: Node;
        private selectedDeckId: number = -1;

        // TODO maybe this should be a HTMLElement rather than HTMLCanvasElement - but what about resizing?
        constructor(public parent: HTMLElement) {
            this.lastChild = parent.lastChild;

            parent.addEventListener('click', this.onClick.bind(this));
        }

        refresh() {
            this.cleanup();
            this.buildHTML();
        }

        setSelectedDeck(deck: Deck) {
            var id = -1;
            if (deck)
                id = deck.id;

            if (id === this.selectedDeckId)
                return; // no change

            if (this.selectedDeckId) {
                var thumbnail = this.getThumbnail(this.selectedDeckId);
                if (thumbnail)
                    thumbnail.classList.remove('DeckPanelSelected');
            }

            this.selectedDeckId = id;

            var thumbnail = this.getThumbnail(id);
            if (thumbnail)
                thumbnail.classList.add('DeckPanelSelected');

            var event = new CustomEvent('change', {
                detail: {
                    deck: deck
                },
                bubbles: true,
                cancelable: true
            });
            this.parent.dispatchEvent(event);
        }

        getSelectedDeck(): Deck {
            return g_DeckManager.getDeckById(this.selectedDeckId);
        }

        private onClick(e) {
            e.preventDefault();

            var target = e.target;
            while (target !== this.parent && !target.getAttribute('data-id'))
                target = target.parentNode;

            if (target === this)
                return; // fake click?

            var id = parseInt(target.getAttribute('data-id'));
            var deck = g_DeckManager.getDeckById(id);
            this.setSelectedDeck(deck);
        }

        private cleanup() {
            while (this.parent.lastChild !== this.lastChild)
                this.parent.removeChild(this.parent.lastChild);
        }

        private buildHTML() {
            var decks = g_DeckManager.getDecks();
            var style = window.getComputedStyle(this.parent);
            var parentWidth = parseInt(style.width); // pixels

            decks.forEach((deck) => {
                var thumbElem = this.createThumbnail(deck);
                if (thumbElem) {
                    this.refreshThumbnail(thumbElem, deck, parentWidth);
                    this.parent.appendChild(thumbElem);
                }
            });
        }

        private createThumbnail(deck: Deck): HTMLElement {
            var thumbElem = document.createElement('div');
            thumbElem.innerHTML =
                '<canvas class="DeckThumbnailCanvas"></canvas>' +
                '<div class="DeckThumbnailName"></div>';

            thumbElem.setAttribute('data-id', deck.id.toString());

            return thumbElem;
        }

        private getThumbnail(id: number): HTMLElement {
            var thumbnail = this.parent.firstChild;
            var idStr = id.toString();

            while (thumbnail) {
                if (( < HTMLElement > thumbnail).getAttribute('data-id') === idStr)
                    return <HTMLElement > thumbnail;

                thumbnail = thumbnail.nextSibling;
            }

            return null;
        }

        private refreshThumbnail(thumbElem: HTMLElement, deck: Deck, totalWidth: number) {
            var canvas = < HTMLCanvasElement > thumbElem.querySelector('.DeckThumbnailCanvas');
            var ctx = canvas.getContext('2d');
            var width = totalWidth * 0.8;
            var height = width * (88 / 63); // standard card size

            var template = deck.getFirstTemplate();
            if (template)
                height = width / deck.aspectRatio;

            canvas.width = width;
            canvas.height = height;

            if (template)
                template.drawCard(ctx, width, height);

            ctx.save()
            ctx.strokeStyle = deck.color;
            ctx.lineWidth = 5;
            ctx.strokeRect(0, 0, width, height);
            ctx.restore();

            var nameElem = < HTMLDivElement > thumbElem.querySelector('.DeckThumbnailName');
            nameElem.innerHTML = deck.name;

            var id = parseInt(thumbElem.getAttribute('data-id'));
            if (id === this.selectedDeckId && !thumbElem.classList.contains('DeckPanelSelected'))
                thumbElem.classList.add('DeckPanelSelected');
        }
    }
}
