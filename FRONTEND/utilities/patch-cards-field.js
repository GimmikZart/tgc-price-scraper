// patch-cards-field.js
// Node 18+
// Uso: node patch-cards-field.js ./data
import fs from "fs/promises";
import path from "path";
import { getCardEffectText } from "./cardEffect.js";

const TARGET_KEYWORD = "[On Play]";

async function isDir(p) {
  try {
    const s = await fs.stat(p);
    return s.isDirectory();
  } catch {
    return false;
  }
}
async function isFile(p) {
  try {
    const s = await fs.stat(p);
    return s.isFile();
  } catch {
    return false;
  }
}

function patchCard(card) {
  // Se non c'è effect, non facciamo nulla
  if (!card || typeof card !== "object") return card;
  const effect = getCardEffectText(card.effect ?? card.text, "en");
  if (typeof effect !== "string") return card;

  if (effect.includes(TARGET_KEYWORD)) {
    // Prepara l'array abilityKeywords
    if (!Array.isArray(card.abilityKeywords)) {
      card.abilityKeywords = [];
    }
    // Aggiungi [On Play] se non già presente
    if (!card.abilityKeywords.includes(TARGET_KEYWORD)) {
      card.abilityKeywords.push(TARGET_KEYWORD);
    }
  }
  return card;
}

function patchUnknownJson(json) {
  // Il file può contenere un oggetto singolo o un array di carte
  if (Array.isArray(json)) {
    return json.map(patchCard);
  }
  if (json && typeof json === "object") {
    return patchCard(json);
  }
  return json;
}

async function walkAndPatch(dir) {
  if (!(await isDir(dir))) {
    throw new Error(`Percorso non valido o non è una cartella: ${dir}`);
  }
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      await walkAndPatch(full);
    } else if (e.isFile() && e.name.toLowerCase().endsWith(".json")) {
      try {
        const raw = await fs.readFile(full, "utf8");
        const data = JSON.parse(raw);
        const patched = patchUnknownJson(data);
        // Solo se cambia, riscrivo (per semplicità riscrivo sempre formattato)
        await fs.writeFile(full, JSON.stringify(patched, null, 2), "utf8");
      } catch (err) {
        console.error("Errore su", full, "-", err.message);
      }
    }
  }
}

const root = process.argv[2] ?? ".";
walkAndPatch(path.resolve(root))
  .then(() => console.log("Fatto ✅"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
