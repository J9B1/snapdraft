$(document).ready(function () {
    let cardsData = [];
    let usedIndices = new Set();
    let displayedCards = [];
    let deck = [];
    const MAX_DECK_SIZE = 12;
    let replacedIndices = new Set();
    let cardMapping = {};

    function initializeCardsData(data) {
        cardsData = data.filter(card =>
            card.status === "released" &&
            card.source_slug !== "None" &&
            card.source_slug !== "not-available"
        );

        cardMapping = data.reduce((map, card) => {
            if (card.status === "released" && card.source_slug !== "None" && card.source_slug !== "not-available") {
                map[card.name] = card.cid;
            }
            return map;
        }, {});
    }

    function filterCardsByPool(pool) {
        let validSources;

        switch (pool) {
            case 'pool-1':
                validSources = ['pool-1', 'starter-card'];
                break;
            case 'pool-2':
                validSources = ['pool-1', 'pool-2', 'starter-card'];
                break;
            case 'pool-3':
                validSources = ['pool-1', 'pool-2', 'pool-3', 'starter-card'];
                break;
            case 'all-cards':
            default:
                validSources = []; 
                break;
        }

        if (validSources.length > 0) {
            cardsData = cardsData.filter(card => validSources.includes(card.source_slug));
        } else {
            $.getJSON('data/Cards.json')
                .done(function (data) {
                    initializeCardsData(data);
                })
                .fail(function (jqxhr, textStatus, error) {
                    console.error('Error loading the JSON file:', textStatus, error);
                });
        }

        if (cardsData.length < 3) {
            console.error('Not enough cards available in the selected pool.');
            alert('Not enough cards available in the selected pool. Please select a different pool.');
            resetDeck(); 
            return;
        }

        resetDeck();
        getThreeRandomCards(); 
    }

    function getThreeRandomCards() {
        let randomCards = [];
        let availableIndices = cardsData.map((_, index) => index).filter(index => !usedIndices.has(index));

        if (availableIndices.length < 3) {
            console.error('Not enough unique cards left to pick 3 random cards.');
            return [];
        }

        while (randomCards.length < 3) {
            let randomIndex = Math.floor(Math.random() * availableIndices.length);
            let cardIndex = availableIndices[randomIndex];
            randomCards.push({ ...cardsData[cardIndex], originalIndex: cardIndex });
            usedIndices.add(cardIndex);
            availableIndices.splice(randomIndex, 1);
        }

        displayedCards = randomCards;
        replacedIndices.clear();
        updateLargeCards();
        return randomCards;
    }

    function updateLargeCards() {
        if (displayedCards.length >= 3) {
            $('#card1-art').attr('src', displayedCards[0].art);
            $('#card2-art').attr('src', displayedCards[1].art);
            $('#card3-art').attr('src', displayedCards[2].art);

            $('#replace-btn1').prop('disabled', false);
            $('#replace-btn2').prop('disabled', false);
            $('#replace-btn3').prop('disabled', false);
        }
    }

    function resetDeck() {
        deck = [];
        usedIndices.clear();
        displayedCards = [];
        replacedIndices.clear();

        $('#deck-actions').addClass('hidden').removeClass('visible');
        $('#card-section').addClass('visible').removeClass('hidden');
        $('#card-pool').addClass('visible').removeClass('hidden');

        const placeholderSrc = 'data/img/blank_card.png';
        for (let i = 1; i <= 12; i++) {
            $(`#card${i}`).attr('src', placeholderSrc).attr('alt', 'Placeholder').addClass('img-fluid');
        }

        $('#deck-name').val('');
    }

    window.replaceCard = function (cardIndexToReplace) {
        if (cardIndexToReplace < 0 || cardIndexToReplace >= displayedCards.length) {
            console.error('Invalid card index to replace.');
            return;
        }

        let oldCard = displayedCards[cardIndexToReplace];
        let oldCardIndex = oldCard.originalIndex;

        usedIndices.delete(oldCardIndex);

        let availableIndices = cardsData.map((_, index) => index).filter(index => !usedIndices.has(index));

        if (availableIndices.length === 0) {
            console.error('No more unique cards available for replacement.');
            return;
        }

        let newCardIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        let newCard = { ...cardsData[newCardIndex], originalIndex: newCardIndex };

        displayedCards[cardIndexToReplace] = newCard;
        usedIndices.add(newCard.originalIndex);
        replacedIndices.add(cardIndexToReplace);

        updateLargeCards();
    };

    window.addToDeck = function (cardIndex) {
        if (cardIndex < 0 || cardIndex >= displayedCards.length) {
            console.error('Invalid card index to add to deck.');
            return;
        }

        let cardToAdd = displayedCards[cardIndex];
        if (deck.some(card => card.originalIndex === cardToAdd.originalIndex)) {
            console.error('Card is already in the deck.');
            return;
        }

        if (deck.length >= MAX_DECK_SIZE) {
            console.error('Deck is already full.');
            return;
        }

        deck.push(cardToAdd);
        addCardToGrid(cardToAdd);
        getThreeRandomCards();

        if (deck.length >= MAX_DECK_SIZE) {
            $('#card-section').addClass('hidden').removeClass('visible');
            $('#card-pool').addClass('hidden').removeClass('visible');
            $('#deck-actions').addClass('visible').removeClass('hidden');

            generateDeckCode();
        }
    };

    function addCardToGrid(card) {
        $('.card-grid').html('');

        deck.sort((a, b) => {
            if (a.cost === b.cost) {
                return a.power - b.power;
            }
            return a.cost - b.cost;
        });

        deck.forEach((card, index) => {
            if (index < 12) {
                $(`#card${index + 1}`).attr({
                    src: card.art,
                    alt: card.name
                });
            }
        });
    }

    function generateDeckCode() {
        if (deck.length !== MAX_DECK_SIZE) {
            console.error('Deck is not complete.');
            return;
        }

        let deckJson = {
            Name: $('#deck-name').val() || "Draft Deck",
            Cards: deck.map(card => ({
                CardDefId: card.carddefid.replace(/[\s'-]/g, '')
            }))
        };

        let deckJsonString = JSON.stringify(deckJson);
        let encodedDeckCode = toBase64(deckJsonString);

        console.log("Deck JSON:", deckJson);
        console.log("Deck JSON String:", deckJsonString);
        console.log("Encoded Deck Code:", encodedDeckCode);

        $('#deck-name').val(encodedDeckCode);
        $('#deck-name').trigger('input');
    }

    window.copyDeck = function () {
        let deckInput = document.getElementById('deck-name');
        deckInput.select();
        document.execCommand('copy');
    };

    window.createAnotherDeck = function () {
        resetDeck();
        getThreeRandomCards();
    };

    $('#card-pool').on('change', function () {
        filterCardsByPool($(this).val());
    });

    $.getJSON('data/Cards.json')
        .done(function (data) {
            initializeCardsData(data);
            getThreeRandomCards();
        })
        .fail(function (jqxhr, textStatus, error) {
            console.error('Error loading the JSON file:', textStatus, error);
        });
});

function toBase64(string) {
    return btoa(unescape(encodeURIComponent(string)));
}
