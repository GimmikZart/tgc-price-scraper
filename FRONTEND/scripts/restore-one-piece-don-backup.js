import fs from "node:fs/promises";
import path from "node:path";
import { config as loadEnvFile } from "dotenv";
import {
  createSupabaseServiceClientFromEnv,
  uploadJsonObject,
  resolveGameLocalPaths,
} from "../utilities/gameStorageSync.js";
import {
  getGameCatalogObjectPath,
  getGameMetaObjectPath,
  getGamePricesObjectPath,
  getGameRawSetObjectPath,
  getGameCardImageObjectPath,
} from "../utilities/tcgStorage.js";
import { DEFAULT_ONE_PIECE_GAME_SLUG, DEFAULT_TCG_DATA_BUCKET, DEFAULT_TCG_IMAGES_BUCKET } from "../utilities/tcgGameConfig.js";

const GAME_SLUG = DEFAULT_ONE_PIECE_GAME_SLUG;
const argv = parseArgs(process.argv.slice(2));
const backupDir = String(argv.backup || "").trim();
const reportPath = String(argv.report || "").trim();
const sourceBackupDir = String(argv["source-backup"] || "").trim();
const envFile = String(argv["env-file"] || ".env.local").trim() || ".env.local";

if (!backupDir) {
  console.error("Devi specificare --backup=<cartella backup>.");
  process.exit(1);
}

loadEnvFile({ path: path.resolve(process.cwd(), envFile), override: true });

main().catch((error) => {
  console.error("Errore irreversibile durante il restore dei DON!!:", error);
  process.exitCode = 1;
});

async function main() {
  const resolvedBackupDir = path.resolve(process.cwd(), backupDir);
  const client = createSupabaseServiceClientFromEnv();
  const dataBucket = process.env.TCG_DATA_BUCKET || DEFAULT_TCG_DATA_BUCKET;
  const imagesBucket = process.env.TCG_IMAGES_BUCKET || DEFAULT_TCG_IMAGES_BUCKET;
  const setsDir = path.join(resolvedBackupDir, "sets");

  const setFiles = (await fs.readdir(setsDir)).filter((name) => name.endsWith(".json")).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );

  for (const fileName of setFiles) {
    const raw = await fs.readFile(path.join(setsDir, fileName), "utf8");
    await uploadJsonObject(client, dataBucket, getGameRawSetObjectPath(GAME_SLUG, fileName), raw, {
      cacheControl: 300,
    });
  }

  await restoreOptionalJson(client, dataBucket, resolvedBackupDir, "catalog.json", getGameCatalogObjectPath(GAME_SLUG), 300);
  await restoreOptionalJson(client, dataBucket, resolvedBackupDir, "meta.json", getGameMetaObjectPath(GAME_SLUG), 60);
  await restoreOptionalJson(client, dataBucket, resolvedBackupDir, "prices.json", getGamePricesObjectPath(GAME_SLUG), 120);

  const deletedImageObjects = reportPath
    ? await deleteCreatedImages(client, imagesBucket, path.resolve(process.cwd(), reportPath))
    : 0;

  await restoreWorkspaceSets(resolvedBackupDir);
  const restoredSourceFiles = sourceBackupDir
    ? await restoreSourceDataMirror(path.resolve(process.cwd(), sourceBackupDir))
    : 0;
  if (reportPath) {
    await removeLocalDonImages(path.resolve(process.cwd(), reportPath));
  }

  console.log(
    JSON.stringify(
      {
        backupDir: resolvedBackupDir,
        restoredSetFiles: setFiles.length,
        restoredSourceFiles,
        deletedImageObjects,
        dataBucket,
        imagesBucket,
      },
      null,
      2,
    ),
  );
}

async function restoreOptionalJson(client, bucketName, backupDir, backupFileName, objectPath, cacheControl) {
  const filePath = path.join(backupDir, backupFileName);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    await uploadJsonObject(client, bucketName, objectPath, raw, {
      cacheControl,
    });
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
}

async function deleteCreatedImages(client, bucketName, resolvedReportPath) {
  const report = JSON.parse(await fs.readFile(resolvedReportPath, "utf8"));
  const imageObjectPaths = [...new Set(
    (Array.isArray(report?.mapped) ? report.mapped : [])
      .map((row) =>
        getGameCardImageObjectPath(GAME_SLUG, {
          id: row.cardId,
          setName: row.targetSetName,
        }),
      )
      .filter(Boolean),
  )];

  if (!imageObjectPaths.length) return 0;

  const batchSize = 100;
  let deleted = 0;

  for (let index = 0; index < imageObjectPaths.length; index += batchSize) {
    const batch = imageObjectPaths.slice(index, index + batchSize);
    const { error } = await client.storage.from(bucketName).remove(batch);
    if (error) throw error;
    deleted += batch.length;
  }

  return deleted;
}

async function restoreWorkspaceSets(backupDir) {
  const { cardsDir } = resolveGameLocalPaths(GAME_SLUG);
  const sourceDir = path.join(backupDir, "sets");
  await fs.rm(cardsDir, { recursive: true, force: true });
  await fs.mkdir(cardsDir, { recursive: true });

  for (const fileName of await fs.readdir(sourceDir)) {
    await fs.copyFile(path.join(sourceDir, fileName), path.join(cardsDir, fileName));
  }
}

async function restoreSourceDataMirror(resolvedSourceBackupDir) {
  const targetDir = path.resolve(process.cwd(), "data", "cards", "one_piece_tgc");
  const entries = await fs.readdir(resolvedSourceBackupDir);
  const fileNames = entries
    .filter((name) => name.endsWith(".json") && name !== "manifest.json")
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  await fs.mkdir(targetDir, { recursive: true });

  for (const fileName of fileNames) {
    await fs.copyFile(path.join(resolvedSourceBackupDir, fileName), path.join(targetDir, fileName));
  }

  const createdFiles = await readCreatedSourceFiles(resolvedSourceBackupDir);
  for (const fileName of createdFiles) {
    if (fileNames.includes(fileName)) continue;
    await fs.rm(path.join(targetDir, fileName), { force: true });
  }

  return fileNames.length;
}

async function removeLocalDonImages(resolvedReportPath) {
  const report = JSON.parse(await fs.readFile(resolvedReportPath, "utf8"));
  const { imagesDir } = resolveGameLocalPaths(GAME_SLUG);
  const filePaths = [...new Set(
    (Array.isArray(report?.mapped) ? report.mapped : [])
      .map((row) =>
        getGameCardImageObjectPath(GAME_SLUG, {
          id: row.cardId,
          setName: row.targetSetName,
        }),
      )
      .filter(Boolean)
      .map((objectPath) => path.join(imagesDir, objectPath.replace(/^one-piece[\\/]/i, ""))),
  )];

  for (const filePath of filePaths) {
    await fs.rm(filePath, { force: true });
  }
}

async function readCreatedSourceFiles(resolvedSourceBackupDir) {
  const manifestPath = path.join(resolvedSourceBackupDir, "manifest.json");
  try {
    const raw = await fs.readFile(manifestPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.created)
      ? parsed.created.map((value) => String(value ?? "").trim()).filter(Boolean)
      : [];
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

function parseArgs(args) {
  return args.reduce((accumulator, arg) => {
    if (!arg.startsWith("--")) return accumulator;
    const [rawKey, rawValue] = arg.slice(2).split("=", 2);
    accumulator[rawKey.trim()] = rawValue === undefined ? true : rawValue.trim();
    return accumulator;
  }, {});
}
