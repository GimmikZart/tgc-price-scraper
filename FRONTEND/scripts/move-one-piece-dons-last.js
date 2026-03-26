import fs from "node:fs/promises";
import path from "node:path";
import { config as loadEnvFile } from "dotenv";
import {
  readGameCardsFromLocalFiles,
  syncGameStorage,
} from "../utilities/gameStorageSync.js";
import { DEFAULT_ONE_PIECE_GAME_SLUG } from "../utilities/tcgGameConfig.js";

const GAME_SLUG = DEFAULT_ONE_PIECE_GAME_SLUG;
const LOCAL_ENV_FILE = ".env.local";
const REPORTS_DIR = path.resolve(".cache", "reports");
const DON_TYPE = "Don!!";

loadEnvFile({ path: path.resolve(process.cwd(), LOCAL_ENV_FILE), override: true });

main().catch((error) => {
  console.error("Errore irreversibile durante il riordino dei DON!!:", error);
  process.exitCode = 1;
});

async function main() {
  const workspace = await readGameCardsFromLocalFiles(GAME_SLUG);
  const touchedFiles = [];

  for (const setFile of workspace.setFiles) {
    const cards = JSON.parse(setFile.raw);
    if (!Array.isArray(cards) || cards.length === 0) continue;

    const nonDonCards = cards.filter((card) => String(card?.type ?? "") !== DON_TYPE);
    const donCards = cards.filter((card) => String(card?.type ?? "") === DON_TYPE);
    if (donCards.length === 0) continue;

    const nextCards = [...nonDonCards, ...donCards];
    if (sameCardOrder(cards, nextCards)) continue;

    touchedFiles.push(setFile.fileName);
    await fs.writeFile(
      path.join(workspace.cardsDir, setFile.fileName),
      JSON.stringify(nextCards, null, 2),
      "utf8",
    );
  }

  const nextWorkspace = await readGameCardsFromLocalFiles(GAME_SLUG);
  const syncSummary = await syncGameStorage(GAME_SLUG, {
    setFiles: nextWorkspace.setFiles,
    setFileNames: touchedFiles,
    syncCatalog: false,
    syncRawSets: true,
    syncPrices: false,
    syncImages: false,
    readFromStorage: false,
    logger: (message) => console.log(String(message)),
  });

  await fs.mkdir(REPORTS_DIR, { recursive: true });
  const reportPath = path.join(
    REPORTS_DIR,
    `one-piece-dons-last-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );

  await fs.writeFile(
    reportPath,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        envFile: LOCAL_ENV_FILE,
        touchedFiles,
        syncSummary,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log("");
  console.log("Riordino DON!! completato.");
  console.log(
    JSON.stringify(
      {
        touchedFiles,
        reportPath,
        syncSummary,
      },
      null,
      2,
    ),
  );
}

function sameCardOrder(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;

  for (let index = 0; index < left.length; index += 1) {
    if (String(left[index]?.id ?? "") !== String(right[index]?.id ?? "")) {
      return false;
    }
  }

  return true;
}
