// Copyright 2014 Reece Elliott
/// <reference path="_dependencies.ts" />
var DeckMaker;
(function (DeckMaker) {
    //---------------------------------
    var Board = (function () {
        function Board(parent) {
            this.parent = parent;
            this.pages = [];
            this.decks = [];
            this.page = null;
            this.deck = null;
            this.tools = [];
            this.currentTool = null;
            this.touchManager = new DeckMaker.TouchManager(parent, this.touched.bind(this));
        }
        Board.prototype.touched = function (touch) {
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
        };

        Board.prototype.setTools = function (tools) {
            this.tools = tools;
            return this;
        };

        Board.prototype.addDeck = function (deck) {
            this.decks.push(deck);
            return this;
        };

        Board.prototype.addPage = function (page) {
            this.pages.push(page);
            page.setParent(this.parent);
            return this;
        };

        Board.prototype.setPageByName = function (name) {
            var i = DeckMaker.find(this.pages, function (x) {
                return x.name === name;
            });
            if (i !== -1) {
                this.setPage(this.pages[i]);
            }

            return this;
        };

        Board.prototype.setPage = function (page) {
            DeckMaker.setEnv("page", page);

            this.page = page;
            this.page.rebuild();
            this.refresh();
        };

        Board.prototype.getPageName = function () {
            return this.page.name;
        };

        Board.prototype.setDeckByName = function (name) {
            var i = DeckMaker.find(this.decks, function (x) {
                return x.name === name;
            });
            if (i !== -1) {
                this.setDeck(this.decks[i]);
            }

            return this;
        };

        Board.prototype.getDeckName = function () {
            return this.deck.name;
        };

        Board.prototype.setDeck = function (deck) {
            DeckMaker.setEnv("deck", deck);

            this.deck = deck;
            this.page.rebuild();
            this.refresh();
        };

        Board.prototype.refresh = function () {
            this.page.refresh();
        };
        return Board;
    })();
    DeckMaker.Board = Board;
})(DeckMaker || (DeckMaker = {}));
