import "dotenv/config";
import { syncGameStorage } from "../utilities/gameStorageSync.js";

const argv = parseArgs(process.argv.slice(2));

if (argv.help) {
  printHelp();
  process.exit(0);
}

const gameSlug = String(argv.game || "").trim();
if (!gameSlug) {
  console.error("Devi specificare --game=<slug>, ad esempio --game=one-piece.");
  printHelp();
  process.exit(1);
}

main().catch((error) => {
  console.error("Errore irreversibile durante la sincronizzazione storage:", error);
  process.exitCode = 1;
});

async function main() {
  const setFileNames = typeof argv.sets === "string"
    ? argv.sets.split(",").map((value) => value.trim()).filter(Boolean)
    : null;

  const result = await syncGameStorage(gameSlug, {
    syncCatalog: argv.catalog !== "false",
    syncRawSets: argv.raw !== "false",
    syncPrices: Boolean(argv.prices),
    syncImages: Boolean(argv.images),
    readFromStorage: argv["read-from-local"] ? false : true,
    setFileNames,
    logger: (message) => console.log(String(message)),
  });

  console.log(JSON.stringify(result, null, 2));
}

function parseArgs(args) {
  return args.reduce((acc, arg) => {
    if (!arg.startsWith("--")) return acc;
    const [rawKey, rawValue] = arg.slice(2).split("=", 2);
    const key = rawKey.trim();
    const value = rawValue === undefined ? true : rawValue.trim();
    acc[key] = value;
    return acc;
  }, {});
}

function printHelp() {
  console.log(`
Uso:
  node scripts/sync-game-storage.js --game=one-piece --prices --images

Opzioni:
  --game=<slug>             Slug del gioco supportato
  --sets=<a.json,b.json>    Limita i raw set da caricare
  --prices                  Sincronizza anche prices.min.json
  --images                  Sincronizza anche le immagini presenti nel workspace locale
  --read-from-local         Usa il workspace locale .cache come sorgente invece del bucket
  --catalog=false           Non caricare catalog.min.json
  --raw=false               Non caricare i raw set
  --help                    Mostra questo messaggio
`);
}
