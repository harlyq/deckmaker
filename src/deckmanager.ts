// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module DeckMaker {

    export class DeckManager {
        private decks: Deck[] = [];

        createDeck(name: string): Deck {
            var deck = new Deck(name);
            this.decks.push(deck);
            return deck;
        }

        getDeckByName(name: string) {
            for (var i = 0; i < this.decks.length; ++i) {
                if (this.decks[i].name === name)
                    return this.decks[i];
            }
            return undefined;
        }

        getDeckById(id: number): Deck {
            for (var i = 0; i < this.decks.length; ++i) {
                if (this.decks[i].id === id)
                    return this.decks[i];
            }
            return undefined;
        }

        getDecks(): Deck[] {
            return this.decks;
        }
    }

    export
    var g_DeckManager = new DeckManager();
}
