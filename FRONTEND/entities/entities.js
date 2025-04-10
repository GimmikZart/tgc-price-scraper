class BaseStore {
    constructor(name, website, priceSelector, imageSelector, url, gameInfo ){
        this.name = name
        this.website = website
        this.priceSelector = priceSelector
        this.imageSelector = imageSelector
        this.productUrl = url
        this.gameInfo = gameInfo
    }

    getScraper(){
        return {
            store: {
                name: this.name,
                website: this.website
            },
            game: this.gameInfo,
            scraper: {
                url: this.productUrl,
                priceSelector: this.priceSelector,
                imageSelector: this.imageSelector
            }
        }
    } 
}

export class IlCovoDelNerd extends BaseStore {
    static name = "Il Covo del Nerd";
    static website = "https://www.ilcovodelnerd.com/";
    static priceSelector = "p.product-page-price bdi";
    static imageSelector = ".wp-post-image";

    constructor(url, gameInfo) {
        super(
            IlCovoDelNerd.name,
            IlCovoDelNerd.website,
            IlCovoDelNerd.priceSelector,
            IlCovoDelNerd.imageSelector,
            url,
            gameInfo
        );
    }
}

export class IlNuovoMondoShop extends BaseStore {
    static name = "Il nuovo mondo shop";
    static website = "https://www.ilnuovomondoshop.it/";
    static priceSelector = ".current-price-value";
    static imageSelector = ".js-qv-product-cover";

    constructor(url, gameInfo) {
        super(
            IlNuovoMondoShop.name,
            IlNuovoMondoShop.website,
            IlNuovoMondoShop.priceSelector,
            IlNuovoMondoShop.imageSelector,
            url,
            gameInfo
        );
    }
}

