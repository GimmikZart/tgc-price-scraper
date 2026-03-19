import "dotenv/config";

process.env.SCRAPE_HEADLESS = process.env.SCRAPE_HEADLESS ?? "0";
process.env.MAX_FILES = process.env.MAX_FILES ?? "2";
process.env.CHECKPOINT_MIN_SECONDS = process.env.CHECKPOINT_MIN_SECONDS ?? "5";
process.env.CHECKPOINT_EVERY_UPDATES = process.env.CHECKPOINT_EVERY_UPDATES ?? "1";

const { main } = await import("./run-scrape-cards-price.js");

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
