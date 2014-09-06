/// <reference path="_dependencies.ts" />
module DeckMaker {
    export
    var createDeck = function(name: string): Deck {
        var deck = new Deck(name);
        g_DeckManager.addDeck(deck);
        return deck;
    }

    export
    var getDeckByName = function(name: string) {
        return g_DeckManager.getDeckByName(name);
    }

    export
    var setDeckByName = function(name: string) {
        setEnv("deck", g_DeckManager.getDeckByName(name));
    }

    export
    var setDeckById = function(id: number) {
        setEnv("deck", g_DeckManager.getDeckById(id));
    }

}
