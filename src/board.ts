// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module DeckMaker {

    //---------------------------------
    export class Board {
        private touchManager: TouchManager;
        private pages: Page[] = [];
        private decks: Deck[] = [];
        private page: Page = null;
        private deck: Deck = null;
        private tools: Tool[] = [];
        private currentTool: Tool = null;

        constructor(public parent: HTMLCanvasElement) {
            this.touchManager = new TouchManager(parent, this.touched.bind(this));
        }

        private touched(touch: Touch) {
            if (this.currentTool) {
                this.currentTool.touched(touch);

                if (!this.currentTool.hasFocus)
                    this.currentTool = null;
            }

            for (var i = 0; this.currentTool === null && i < this.tools.length; ++i) {
                var tool = this.tools[i];
                tool.touched(touch);
                if (tool.hasFocus)
                    this.currentTool = tool;
            }
        }

        setTools(tools: Tool[]): Board {
            this.tools = tools;
            return this;
        }

        addDeck(deck: Deck): Board {
            this.decks.push(deck);
            return this;
        }

        addPage(page: Page): Board {
            this.pages.push(page);
            page.setParent(this.parent);
            return this;
        }

        setPageByName(name: string): Board {
            var i = find(this.pages, (x) => x.name === name);
            if (i !== -1) {
                this.setPage(this.pages[i]);
            }

            return this;
        }

        setPage(page: Page) {
            setEnv("page", page);

            this.page = page;
            this.page.rebuild();
            this.refresh();
        }

        getPageName(): string {
            return this.page.name;
        }

        setDeckByName(name: string): Board {
            var i = find(this.decks, (x) => x.name === name);
            if (i !== -1) {
                this.setDeck(this.decks[i]);
            }

            return this;
        }

        getDeckName(): string {
            return this.deck.name;
        }

        setDeck(deck: Deck) {
            setEnv("deck", deck);

            this.deck = deck;
            this.page.rebuild();
            this.refresh();
        }

        undo() {
            this.page.undo();
        }

        redo() {
            this.page.redo();
        }

        refresh() {
            this.page.refresh();
        }
    }
}
