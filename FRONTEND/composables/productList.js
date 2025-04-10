
import { IlCovoDelNerd, IlNuovoMondoShop } from '@/entities/entities.js'
export function useProductList(){
    return [
        new IlCovoDelNerd(
            'https://www.ilcovodelnerd.com/shop/prodotti-sigillati/riftbound-league-of-legends/riftbound-league-of-legends-box-set-one-origins-24-bustine-eng/',
            {
                name: "Riftbound",
                set: "Set One",
                lang: "EN"
            },
        ).getScraper(),
        new IlCovoDelNerd(
            'https://www.ilcovodelnerd.com/shop/prodotti-sigillati/altri-giochi-di-carte/one-piece-tcg/one-piece-cg-op-11-game-box-24-bustine-eng/',
            {
                name: "One Piece",
                set: "OP-11",
                lang: "EN"
            },
        ).getScraper(),
        new IlNuovoMondoShop(
            'https://www.ilnuovomondoshop.it/one-piece-tcg/one-piece-card-game-box-da-24-buste-op-09',
            {
                name: "One Piece",
                set: "OP-09",
                lang: "EN"
            },
        ).getScraper(),
    ]
} 