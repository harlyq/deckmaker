/// <reference path="_dependencies.ts" />
module DeckMaker {
    export

    function createDeck(name: string): Deck {
        var deck = new Deck(name);
        g_DeckManager.addDeck(deck);
        return deck;
    }

    export

    function getDeckByName(name: string) {
        return g_DeckManager.getDeckByName(name);
    }

    export

    function setDeckByName(name: string) {
        setEnv("deck", g_DeckManager.getDeckByName(name));
    }

    export

    function setDeckById(id: number) {
        setEnv("deck", g_DeckManager.getDeckById(id));
    }

}
