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

loadEnvFile({ path: path.resolve(process.cwd(), LOCAL_ENV_FILE), override: true });

main().catch((error) => {
  console.error("Errore irreversibile durante il restore del backup DON!!:", error);
  process.exitCode = 1;
});

async function main() {
  const argv = parseArgs(process.argv.slice(2));
  const backup = String(argv.backup || "").trim();

  if (!backup) {
    throw new Error("Specifica --backup=<cartella-backup>.");
  }

  const sourceDir = path.resolve(process.cwd(), backup, "one-piece-workspace");
  const targetDir = path.resolve(process.cwd(), ".cache", "tcg-workspace", "one-piece");

  await fs.rm(targetDir, { recursive: true, force: true });
  await copyDir(sourceDir, targetDir);

  const workspace = await readGameCardsFromLocalFiles(GAME_SLUG);
  const syncSummary = await syncGameStorage(GAME_SLUG, {
    setFiles: workspace.setFiles,
    syncCatalog: false,
    syncRawSets: true,
    syncPrices: false,
    syncImages: false,
    readFromStorage: false,
    logger: (message) => console.log(String(message)),
  });

  console.log("");
  console.log("Restore ordine DON!! completato.");
  console.log(
    JSON.stringify(
      {
        backup: sourceDir,
        syncSummary,
      },
      null,
      2,
    ),
  );
}

async function copyDir(sourceDir, targetDir) {
  await fs.mkdir(targetDir, { recursive: true });
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await copyDir(sourcePath, targetPath);
      continue;
    }

    await fs.copyFile(sourcePath, targetPath);
  }
}

function parseArgs(args) {
  return args.reduce((acc, arg) => {
    if (!arg.startsWith("--")) return acc;
    const [rawKey, rawValue] = arg.slice(2).split("=", 2);
    acc[rawKey.trim()] = rawValue === undefined ? true : rawValue.trim();
    return acc;
  }, {});
}
