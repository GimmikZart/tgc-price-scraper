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
const DON_TYPE = "Don!!";
const REPORTS_DIR = path.resolve(".cache", "reports");
const CONCURRENCY = 8;

loadEnvFile({ path: path.resolve(process.cwd(), LOCAL_ENV_FILE), override: true });

main().catch((error) => {
  console.error("Errore irreversibile durante la verifica slug DON!!:", error);
  process.exitCode = 1;
});

async function main() {
  const workspace = await readGameCardsFromLocalFiles(GAME_SLUG);
  const slugChecks = collectSlugChecks(workspace.setFiles);
  const checks = await verifyChecks(slugChecks);
  const verificationByCardId = new Map(checks.map((entry) => [entry.cardId, entry]));
  const touchedFiles = [];

  for (const setFile of workspace.setFiles) {
    const cards = JSON.parse(setFile.raw);
    let fileChanged = false;

    const nextCards = cards.map((card) => {
      if (String(card?.type ?? "") !== DON_TYPE) return card;
      const verification = verificationByCardId.get(String(card?.id ?? ""));
      if (!verification) return card;

      const nextSlugs = Array.isArray(card?.slugs)
        ? card.slugs.map((slug) => {
            if (slug?.service !== "Card Trader") return slug;
            return {
              ...slug,
              verified: verification.verified,
            };
          })
        : card.slugs;

      if (JSON.stringify(nextSlugs) !== JSON.stringify(card?.slugs ?? null)) {
        fileChanged = true;
      }

      return {
        ...card,
        slugs: nextSlugs,
      };
    });

    if (!fileChanged) continue;

    touchedFiles.push(setFile.fileName);
    await fs.writeFile(
      path.join(workspace.cardsDir, setFile.fileName),
      JSON.stringify(nextCards, null, 2),
      "utf8",
    );
  }

  const nextWorkspace = await readGameCardsFromLocalFiles(GAME_SLUG);
  const nextCards = buildGameCatalogFromSetFiles(nextWorkspace.setFiles);
  const syncSummary = await syncGameStorage(GAME_SLUG, {
    setFiles: nextWorkspace.setFiles,
    setFileNames: touchedFiles,
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
    `one-piece-don-slugs-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  const report = {
    createdAt: new Date().toISOString(),
    envFile: LOCAL_ENV_FILE,
    touchedFiles,
    checkedCount: checks.length,
    verifiedCount: checks.filter((entry) => entry.verified).length,
    failedCount: checks.filter((entry) => !entry.verified).length,
    checks,
    syncSummary,
  };
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log("");
  console.log("Verifica slug DON!! completata.");
  console.log(
    JSON.stringify(
      {
        touchedFiles,
        checkedCount: report.checkedCount,
        verifiedCount: report.verifiedCount,
        failedCount: report.failedCount,
        reportPath,
        syncSummary,
      },
      null,
      2,
    ),
  );
}

function collectSlugChecks(setFiles) {
  const checks = [];

  for (const setFile of Array.isArray(setFiles) ? setFiles : []) {
    const cards = JSON.parse(setFile.raw);
    for (const card of cards) {
      if (String(card?.type ?? "") !== DON_TYPE) continue;
      const slug = Array.isArray(card?.slugs)
        ? card.slugs.find((entry) => entry?.service === "Card Trader")
        : null;
      if (!slug?.url) continue;

      checks.push({
        fileName: setFile.fileName,
        cardId: String(card?.id ?? ""),
        imageId: String(card?.imageId ?? ""),
        cardName: card?.name ?? null,
        setName: card?.setName ?? null,
        url: String(slug.url),
      });
    }
  }

  return checks;
}

async function verifyChecks(checks) {
  const results = new Array(checks.length);
  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, checks.length || 1) }, async () => {
      while (true) {
        const index = nextIndex;
        nextIndex += 1;
        const check = checks[index];
        if (!check) return;

        results[index] = await verifySingleCheck(check);
      }
    }),
  );

  return results.filter(Boolean);
}

async function verifySingleCheck(check) {
  try {
    const response = await fetch(check.url, {
      headers: {
        "user-agent": "Mozilla/5.0",
        accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    const html = await response.text();
    const title =
      html.match(/<meta property="og:title" content="([^"]+)"/i)?.[1]
      || html.match(/<title>([^<]+)<\/title>/i)?.[1]
      || "";
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1] || "";
    const finalUrl = String(response.url || "");
    const normalizedTitle = normalizeText(title);
    const normalizedName = normalizeText(check.cardName);
    const titleLooksLikeDon = /\bdon\b/i.test(normalizedTitle);
    const titleLooksLikeOnePiece = /one piece/i.test(normalizedTitle);
    const canonicalLooksRight = /^https:\/\/www\.cardtrader\.com\/en\/cards\//i.test(canonical || finalUrl);
    const reachable = response.ok;
    const nameCompatible =
      !normalizedName
      || normalizedTitle.includes(normalizedName)
      || normalizeText(check.url).includes(normalizedName);

    const verified = Boolean(
      reachable
      && canonicalLooksRight
      && titleLooksLikeDon
      && titleLooksLikeOnePiece
      && nameCompatible,
    );

    return {
      ...check,
      verified,
      status: response.status,
      finalUrl,
      canonical,
      title,
      reason: verified ? "ok" : buildFailureReason({
        reachable,
        canonicalLooksRight,
        titleLooksLikeDon,
        titleLooksLikeOnePiece,
        nameCompatible,
      }),
    };
  } catch (error) {
    return {
      ...check,
      verified: false,
      status: null,
      finalUrl: null,
      canonical: null,
      title: null,
      reason: error?.message || String(error),
    };
  }
}

function buildFailureReason(flags) {
  const failed = [];
  if (!flags.reachable) failed.push("not-reachable");
  if (!flags.canonicalLooksRight) failed.push("canonical-mismatch");
  if (!flags.titleLooksLikeDon) failed.push("title-no-don");
  if (!flags.titleLooksLikeOnePiece) failed.push("title-no-one-piece");
  if (!flags.nameCompatible) failed.push("name-mismatch");
  return failed.join(",");
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ");
}
