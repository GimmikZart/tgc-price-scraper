export function useProductList(){
    return [
        {
            store: {
                name: "Il Covo del Nerd",
                website: "https://www.ilcovodelnerd.com/"
            },
            game: {
                name: "Riftbound",
                expansion: "Set One",
                lang: "EN"
            },
            scraper: {
                url: "https://www.ilcovodelnerd.com/shop/prodotti-sigillati/riftbound-league-of-legends/riftbound-league-of-legends-box-set-one-origins-24-bustine-eng/",
                priceSelector: "p.product-page-price bdi",
                imageSelector: ".wp-post-image"
            }
            
        },
        {
            store: {
                name: "Il Covo del Nerd",
                website: "https://www.ilcovodelnerd.com/"
            },
            game: {
                name: "One Piece",
                expansion: "OP-11",
                lang: "EN"
            },
            scraper: {
                url: "https://www.ilcovodelnerd.com/shop/prodotti-sigillati/altri-giochi-di-carte/one-piece-tcg/one-piece-cg-op-11-game-box-24-bustine-eng/",
                priceSelector: "p.product-page-price bdi",
                imageSelector: ".wp-post-image"
            }
        },
        {
            store: {
                name: "Il nuovo mondo shop",
                website: "https://www.ilnuovomondoshop.it/"
            },
            game: {
                name: "One Piece",
                expansion: "OP-09",
                lang: "EN"
            },
            scraper: {
                url: "https://www.ilnuovomondoshop.it/one-piece-tcg/one-piece-card-game-box-da-24-buste-op-09",
                priceSelector: ".current-price-value",
                imageSelector: ".js-qv-product-cover"
            }
        },
    ]
} 