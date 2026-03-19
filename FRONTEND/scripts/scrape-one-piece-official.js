import "dotenv/config";
import scrapeCardsOfficial from "../server/utils/fetch-cards-official.js";

const argv = parseArgs(process.argv.slice(2));

if (argv.help) {
  printHelp();
  process.exit(0);
}

const setNames = collectSetNames(argv);

if (!setNames.length) {
  console.error("Devi passare almeno un set con --set=\"ROMANCE DAWN [OP01]\".");
  printHelp();
  process.exit(1);
}

main().catch((error) => {
  console.error("Errore irreversibile durante lo scraping ufficiale:", error);
  process.exitCode = 1;
});

async function main() {
  console.log(`Set da processare: ${setNames.length}`);

  for (const setName of setNames) {
    console.log("");
    console.log(`=== ${setName} ===`);
    const result = await scrapeCardsOfficial({ expansionName: setName });
    console.log(
      `Completato: ${result.fileName} | carte=${result.totalCards} | immagini nuove=${result.images.written} | immagini skip=${result.images.skipped} | immagini fallite=${result.images.failed}`
    );
    console.log(
      `Storage: raw=${result.storageSync.rawSetsUploaded} | images=${result.storageSync.imagesUploaded} | catalog=${result.storageSync.catalogUploaded} | prices=${result.storageSync.pricesUploaded}`
    );
  }
}

function collectSetNames(args) {
  const rawSetValues = [];

  for (const value of args.set) {
    if (Array.isArray(value)) rawSetValues.push(...value);
    else rawSetValues.push(value);
  }

  if (typeof args.sets === "string" && args.sets.trim()) {
    rawSetValues.push(
      ...args.sets
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    );
  }

  return rawSetValues
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
}

function parseArgs(args) {
  return args.reduce(
    (acc, arg) => {
      if (!arg.startsWith("--")) return acc;

      const [rawKey, rawValue] = arg.slice(2).split("=", 2);
      const key = rawKey.trim();
      const value = rawValue === undefined ? true : rawValue.trim();

      if (key === "set") {
        acc.set.push(value);
        return acc;
      }

      acc[key] = value;
      return acc;
    },
    { set: [] }
  );
}

function printHelp() {
  console.log(`
Uso:
  node scripts/scrape-one-piece-official.js --set="ROMANCE DAWN [OP01]"

Opzioni:
  --set=<nome-set>          Ripetibile. Esempio: --set="ROYAL BLOOD [OP10]"
  --sets=<a,b,c>            Lista separata da virgole
  --help                    Mostra questo messaggio
`);
}
