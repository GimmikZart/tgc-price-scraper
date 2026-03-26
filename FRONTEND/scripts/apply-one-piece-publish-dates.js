import fs from "node:fs/promises";
import path from "node:path";
import { config as loadEnvFile } from "dotenv";
import {
  buildGameCatalogFromSetFiles,
  readGameCardsFromLocalFiles,
  syncGameStorage,
} from "../utilities/gameStorageSync.js";
import { DEFAULT_ONE_PIECE_GAME_SLUG } from "../utilities/tcgGameConfig.js";

const GAME_SLUG = DEFAULT_ONE_PIECE_GAME_SLUG;
const LOCAL_ENV_FILE = ".env.local";
const REPORTS_DIR = path.resolve(".cache", "reports");

loadEnvFile({ path: path.resolve(process.cwd(), LOCAL_ENV_FILE), override: true });

const SET_DATE_ENTRIES = [
  ["Straw Hat Crew [ST-01]", "02/12/2022"],
  ["Worst Generation [ST-02]", "02/12/2022"],
  ["The Seven Warlords of the Sea [ST-03]", "02/12/2022"],
  ["Animal Kingdom Pirates [ST-04]", "02/12/2022"],
  ["ROMANCE DAWN [OP-01]", "02/12/2022"],
  ["Card Set(s)ONE PIECE FILM edition [ST 05]", "03/02/2023"],
  ["Absolute Justice [ST-06]", "10/03/2023"],
  ["PARAMOUNT WAR [OP-02]", "10/03/2023"],
  ["Card Set(s)Big Mom Pirates [ST 07]", "30/06/2023"],
  ["PILLARS OF STRENGTH [OP-03]", "30/06/2023"],
  ["Monkey D. Luffy [ST-08]", "11/08/2023"],
  ["Yamato [ST-09]", "11/08/2023"],
  ["KINGDOMS OF INTRIGUE [OP-04]", "22/09/2023"],
  ["The Three Captains [ST-10]", "10/11/2023"],
  ["AWAKENING OF THE NEW ERA [OP-05]", "08/12/2023"],
  ["Uta [ST-11]", "02/02/2024"],
  ["Zoro & Sanji [ST-12]", "15/03/2024"],
  ["WINGS OF THE CAPTAIN [OP-06]", "15/03/2024"],
  ["The Three Brothers [ST13]", "19/04/2024"],
  ["Memorial Collection [EB-01]", "03/05/2024"],
  ["500 YEARS INTO THE FUTURE [OP-07]", "28/06/2024"],
  ["3D2Y [ST-14]", "16/08/2024"],
  ["TWO LEGENDS [OP-08]", "13/09/2024"],
  ["Red Edward.Newgate [ST-15]", "08/11/2024"],
  ["Green Uta [ST-16]", "08/11/2024"],
  ["Blue Donquixote Doflamingo [ST-17]", "08/11/2024"],
  ["Purple Monkey.D.Luffy [ST-18]", "08/11/2024"],
  ["Black Smoker [ST-19]", "08/11/2024"],
  ["Yellow Charlotte Katakuri [ST-20]", "08/11/2024"],
  ["ONE PIECE CARD THE BEST [PRB-01]", "15/11/2024"],
  ["EMPERORS IN THE NEW WORLD [OP-09]", "13/12/2024"],
  ["GEAR5 [ST-21]", "14/03/2025"],
  ["ROYAL BLOOD [OP-10]", "21/03/2025"],
  ["Anime 25th Collection [EB-02]", "09/05/2025"],
  ["RED Shanks [ST-23]", "06/06/2025"],
  ["GREEN Jewelry Bonney [ST-24]", "06/06/2025"],
  ["BLUE Buggy [ST-25]", "06/06/2025"],
  ["PURPLE/BLACK Monkey.D.Luffy [ST-26]", "06/06/2025"],
  ["BLACK Marshall.D.Teach [ST-27]", "06/06/2025"],
  ["GREEN/YELLOW Yamato [ST-28]", "06/06/2025"],
  ["A FIST OF DIVINE SPEED [OP-11]", "06/06/2025"],
  ["LEGACY OF THE MASTER [OP-12]", "22/08/2025"],
  ["ONE PIECE CARD THE BEST vol.2 [PRB-02]", "03/10/2025"],
  ["CARRYING ON HIS WILL [OP-13]", "07/11/2025"],
  ["ONE PIECE HEROINES EDITION [EB-03]", "20/02/2026"],
  ["ADVENTURE ON KAMI'S ISLAND [OP15-EB04]", "03/04/2026"],

  ["Card Set(s)Devil Fruits Collection Vol.1", "03/11/2023"],
  ["Card Set(s)Devil Fruits Collection Vol.2", "08/11/2024"],
  ["Card Set(s)Devil Fruits Collection Vol.3", "14/11/2025"],
  ["Card Set(s)Double Pack Set Vol.2", "08/12/2023"],
  ["Card Set(s)English Version 1st Anniversary Set", "28/06/2024"],
  ["Card Set(s)English Version 2nd Anniversary Set", "27/06/2025"],
  ["Card Set(s)English Version 3rd Anniversary Set", "28/08/2026"],
  ["Card Set(s)GIFT COLLECTION 2023 [GC 01]", "27/10/2023"],
  ["Card Set(s)Japanese 1st Anniversary Set", "26/04/2024"],
  ["Card Set(s)Offline Regional Finalist Card Set 2024 Vol. 3", "05/10/2024"],
  ["Card Set(s)ONE PIECE DAY Dallas 2025", "09/03/2025"],
  ["Card Set(s)Premium Card Collection  25th Edition-", "28/07/2023"],
  ["Card Set(s)Premium Card Collection  FILM RED Edition-", "24/11/2023"],
  ["Card Set(s)Premium Card Collection  One Piece Day 2024-", "17/01/2025"],
  ["Card Set(s)Special DON!! Card Pack", "08/12/2023"],
  ["Card Set(s)Special DON!! Set Vol.1", "28/03/2025"],
  ["Card Set(s)Special DON!! Set Vol.2", "28/03/2025"],
  ["Card Set(s)Special DON!! Set Vol.3", "28/03/2025"],
  ["Card Set(s)Special Goods Set  Ace/Sabo/Luffy-", "24/11/2023"],
  ["Card Set(s)Super Pre Release", "30/09/2022"],
  ["Card Set(s)Tin Pack Set Vol.1", "18/04/2025"],

  ["Card Set(s)2025 NEW YEAR EVENT", "17/01/2025"],
  ["Card Set(s)Anime Expo 2023", "01/07/2023"],
  ["Card Set(s)Dreamhack Dallas 2024", "31/05/2024"],
  ["Card Set(s)Event Pack Vol.3", "24/03/2024"],
  ["Card Set(s)Event Pack Vol.5", "05/10/2024"],
  ["Card Set(s)Event Pack Vol.6", "08/03/2025"],
  ["Card Set(s)Included in Event Pack Vol.1", "18/03/2023"],
  ["Card Set(s)Included in Event Pack Vol.2", "15/07/2023"],
  ["Card Set(s)Included in FILM RED Promotion Card Set", "02/12/2022"],
  ["Card Set(s)Included in Online Regional Participation Pack Vol.1", "18/03/2023"],
  ["Card Set(s)Included in Pirates Party Card Vol.1", "02/12/2022"],
  ["Card Set(s)Included in Pirates Party Card Vol.2", "10/03/2023"],
  ["Card Set(s)Included in Promotion Pack 2022", "02/12/2022"],
  ["Card Set(s)Netflix Chopper DON!!", "31/03/2025"],
  ["Card Set(s)Offline Regional Champion Card Set 25 26 Season 1", "08/03/2025"],
  ["Card Set(s)Offline Regional Finalist Card Set 25 26 Season 1", "08/03/2025"],
  ["Card Set(s)Offline Regional Participation Pack 2024 Vol. 1", "23/03/2024"],
  ["Card Set(s)Offline Regional Participation Pack 2024 Vol. 2", "01/06/2024"],
  ["Card Set(s)Offline Regional Participation Pack 2024 Vol. 3", "05/10/2024"],
  ["Card Set(s)Offline Regional Participation Pack 2025 Vol.1", "08/03/2025"],
  ["Card Set(s)ONE PIECE CARD GAME and Football Team DORTMUND collaboration event", "30/03/2025"],
  ["Card Set(s)One Piece Card Game x PSA Exclusive Promo Card", "01/07/2024"],
  ["Card Set(s)ONE PIECE DAY Dallas  Card Game Celebration-", "08/03/2025"],
  ["Card Set(s)Online Regional Champion Card Set 25 26 Season 1", "03/05/2025"],
  ["Card Set(s)Online Regional Finalist Card Set 25 26 Season 1", "03/05/2025"],
  ["Card Set(s)Online Regional Participation Pack 25 26 Season 1", "03/05/2025"],
  ["Card Set(s)OP-12: Legacy of the Master Promos", "22/08/2025"],
  ["Card Set(s)Pirates Party Vol.3", "01/06/2023"],
  ["Card Set(s)Pirates Party Vol.4", "01/09/2023"],
  ["Card Set(s)Pirates Party Vol.5", "01/12/2023"],
  ["Card Set(s)Pirates Party Vol.6", "01/03/2024"],
  ["Card Set(s)Pirates Party Vol.7", "01/06/2024"],
  ["Card Set(s)Pre Release OP02", "03/03/2023"],
  ["Card Set(s)Pre Release OP03", "23/06/2023"],
  ["Card Set(s)Pre Release OP04", "15/09/2023"],
  ["Card Set(s)Pre Release OP06", "08/03/2024"],
  ["Card Set(s)Pre Release OP08", "06/09/2024"],
  ["Card Set(s)Regional 2024 wave1", "23/03/2024"],
  ["Card Set(s)Regional 2024 wave2", "01/06/2024"],
  ["Card Set(s)Regional 25 26 Season1", "08/03/2025"],
  ["Card Set(s)Regionals Season 1", "08/03/2025"],
  ["Card Set(s)Regionals Wave 3", "05/10/2024"],
  ["Card Set(s)Sealed Battle 2023 Vol.1", "24/11/2023"],
  ["Card Set(s)Sealed Battle Kit Vol.1", "24/11/2023"],
  ["Card Set(s)ST 11 Uta Deck Battle Participation Pack", "02/02/2024"],
  ["Card Set(s)ST15 20 Release Event", "25/10/2024"],
  ["Card Set(s)Store Tournaments Promos", "01/01/2023"],
  ["Card Set(s)Store Treasure Cup August – September 2024", "01/08/2024"],
  ["Card Set(s)Tournament Kit 2025 Vol.2", "01/04/2025"],
  ["Card Set(s)Tournament Pack 2024 Oct. Dec.", "01/10/2024"],
  ["Card Set(s)Tournament Pack 2025 Vol. 3", "01/07/2025"],
  ["Card Set(s)Tournament Pack Vol. 2", "01/03/2023"],
  ["Card Set(s)Tournament Pack Vol.1", "02/12/2022"],
  ["Card Set(s)Tournament Pack Vol.2", "01/03/2023"],
  ["Card Set(s)Tournament Pack Vol.3", "01/06/2023"],
  ["Card Set(s)Tournament Pack Vol.4", "01/09/2023"],
  ["Card Set(s)Tournament Pack Vol.5", "01/12/2023"],
  ["Card Set(s)Tournament Pack Vol.6", "15/03/2024"],
  ["Card Set(s)Tournament Pack Vol.7", "28/06/2024"],
  ["Card Set(s)Treasure Cup August – September", "01/08/2024"],
  ["Card Set(s)Treasure Cup February 2025", "01/02/2025"],
  ["Card Set(s)Treasure Cup November December", "01/11/2024"],
  ["Card Set(s)Unnumbered Promos", "13/12/2024"],
  ["Card Set(s)Winner Pack | Tournament Pack Vol. 2", "01/03/2023"],
  ["Card Set(s)Winner Pack 2025 Vol. 3", "01/07/2025"],
  ["Card Set(s)Winner Pack 2025 Vol.2", "01/04/2025"],
  ["Card Set(s)Winner prize for Sealed Battle 2023 Vol.1", "24/11/2023"],
];

const IMAGE_DATE_OVERRIDES = {
  "don-1st-anniversary-don-card-pack-store-tournaments-promos": "08/12/2023",
  "don-1st-anniversary-don-card-pack-store-tournaments-promos-270752": "08/12/2023",
  "don-2nd-anniversary-unnumbered-promos": "13/12/2024",
  "don-2y-double-pack-set-vol-8-op-12-legacy-of-the-master-promos": "22/08/2025",
  "don-3d-double-pack-set-vol-8-op-12-legacy-of-the-master-promos": "22/08/2025",
  "don-netflix-chopper-don-promos": "31/03/2025",
  "don-black-and-gold-store-tournaments-promos": "13/12/2024",
  "don-pop-art-store-tournaments-promos": "06/12/2024",
  "don-worlds-championship-2023-store-tournaments-promos": "20/01/2024",
  "don-championship-2024-championships-promo": "01/01/2025",
  "don-championship-25-26-championships-promo": "01/01/2026",
};

const ESTIMATED_SET_NAMES = new Set([
  "Card Set(s)Anime Expo 2023",
  "Card Set(s)Included in FILM RED Promotion Card Set",
  "Card Set(s)Included in Pirates Party Card Vol.1",
  "Card Set(s)Included in Pirates Party Card Vol.2",
  "Card Set(s)Included in Promotion Pack 2022",
  "Card Set(s)Netflix Chopper DON!!",
  "Card Set(s)One Piece Card Game x PSA Exclusive Promo Card",
  "Card Set(s)Pirates Party Vol.3",
  "Card Set(s)Pirates Party Vol.4",
  "Card Set(s)Store Tournaments Promos",
]);

const ESTIMATED_IMAGE_IDS = new Set(Object.keys(IMAGE_DATE_OVERRIDES));
const SET_DATES = new Map(SET_DATE_ENTRIES);

main().catch((error) => {
  console.error("Errore irreversibile durante l'applicazione delle publish_date:", error);
  process.exitCode = 1;
});

async function main() {
  const workspace = await readGameCardsFromLocalFiles(GAME_SLUG);
  const touchedFiles = [];
  const unresolved = [];
  const estimatedAssignments = [];
  let updatedCards = 0;

  for (const setFile of workspace.setFiles) {
    const nextCards = [];
    let fileChanged = false;

    for (const card of setFile.cards) {
      const publishDate = resolvePublishDate(card);
      if (!publishDate) {
        unresolved.push({
          fileName: setFile.fileName,
          id: card?.id || null,
          imageId: card?.imageId || null,
          name: card?.name || null,
          setName: card?.setName || null,
        });
        nextCards.push(card);
        continue;
      }

      const previousDate = String(card?.publish_date ?? "").trim();
      if (previousDate !== publishDate) {
        fileChanged = true;
        updatedCards += 1;
      }

      if (ESTIMATED_SET_NAMES.has(card.setName) || ESTIMATED_IMAGE_IDS.has(card.imageId)) {
        estimatedAssignments.push({
          fileName: setFile.fileName,
          id: card?.id || null,
          imageId: card?.imageId || null,
          setName: card?.setName || null,
          publish_date: publishDate,
        });
      }

      nextCards.push({
        ...card,
        publish_date: publishDate,
      });
    }

    if (!fileChanged && !setFile.cards.some((card) => !card?.publish_date)) continue;

    touchedFiles.push(setFile.fileName);
    await fs.writeFile(
      path.join(workspace.cardsDir, setFile.fileName),
      JSON.stringify(nextCards, null, 2),
      "utf8",
    );
  }

  if (unresolved.length > 0) {
    throw new Error(`Trovate ${unresolved.length} carte senza publish_date.`);
  }

  const nextWorkspace = await readGameCardsFromLocalFiles(GAME_SLUG);
  const nextCards = buildGameCatalogFromSetFiles(nextWorkspace.setFiles);
  const syncSummary = await syncGameStorage(GAME_SLUG, {
    setFiles: nextWorkspace.setFiles,
    cards: nextCards,
    syncCatalog: true,
    syncRawSets: true,
    syncPrices: false,
    syncImages: false,
    readFromStorage: false,
    logger: (message) => console.log(String(message)),
  });

  await fs.mkdir(REPORTS_DIR, { recursive: true });
  const reportPath = path.join(
    REPORTS_DIR,
    `one-piece-publish-dates-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  const report = {
    createdAt: new Date().toISOString(),
    envFile: LOCAL_ENV_FILE,
    touchedFiles,
    updatedCards,
    totalCards: nextCards.length,
    uniqueSetNames: [...new Set(nextCards.map((card) => card?.setName).filter(Boolean))].length,
    estimatedAssignmentsCount: estimatedAssignments.length,
    estimatedAssignments,
    unresolved,
    syncSummary,
  };

  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log("");
  console.log("Publish date applicate con successo.");
  console.log(
    JSON.stringify(
      {
        touchedFiles,
        updatedCards,
        totalCards: nextCards.length,
        estimatedAssignmentsCount: estimatedAssignments.length,
        reportPath,
        syncSummary,
      },
      null,
      2,
    ),
  );
}

function resolvePublishDate(card) {
  const imageId = String(card?.imageId ?? "").trim();
  if (imageId && IMAGE_DATE_OVERRIDES[imageId]) {
    return IMAGE_DATE_OVERRIDES[imageId];
  }

  const setName = String(card?.setName ?? "").trim();
  if (setName && SET_DATES.has(setName)) {
    return SET_DATES.get(setName);
  }

  return null;
}
