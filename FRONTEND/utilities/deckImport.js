// utils/deckImport.js
// Requisito: allCards = lista del tuo db locale con campi almeno:
// { code: "OP07-003", setName: "500 YEARS IN THE FUTURE [OP-07]", imageId?: "OP07-003" | "OP07-003_p1", type?: "LEADER" | "CHARACTER" | ... }

function underscoreSetName(setName) {
  return String(setName).replace(/ /g, "_");
}

function serializeCardId(card) {
  // Preferisci imageId se presente (gestisce già _p1), fallback su code
  const left = card.imageId ?? card.code;
  const right = underscoreSetName(card.setName);
  return `${left}_${right}`;
}

function findCardByCodeAndVariant(allCards, baseCode, variant) {
  // variant e.g. 'p1' | null
  // 1) prova match su imageId completo (OP07-015_p1)
  if (variant) {
    const byImageId = allCards.find(
      c => (c.imageId && c.imageId.toLowerCase() === `${baseCode.toLowerCase()}_${variant}`)
    );
    if (byImageId) return byImageId;
  }
  // 2) prova match su code (normale)
  const byCode = allCards.find(c => c.code?.toLowerCase() === baseCode.toLowerCase());
  if (byCode) {
    // se si voleva p1 ma non esiste imageId p1, clona logicalmente per serializzazione
    if (variant && !(byCode.imageId && byCode.imageId.toLowerCase().endsWith(`_${variant}`))) {
      return { ...byCode, imageId: `${byCode.code}_${variant}` };
    }
    return byCode;
  }
  return null;
}

function parseLine(line) {
  // supporta sia "3xOP07-015" che "3xOP07-015_p1"
  const m = line.trim().match(/^(\d+)\s*x\s*([A-Za-z0-9\-]+)(?:_(p\d+))?$/i);
  if (!m) return null;
  const count = parseInt(m[1], 10);
  const baseCode = m[2].toUpperCase();
  const variant = m[3] ? m[3].toLowerCase() : null; // p1, p2...
  return { count, baseCode, variant };
}

export function parseDeckClipboardText(text, allCards, { deckName, slug }) {
  if (!text) throw new Error("Clipboard vuoto.");
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (!lines.length) throw new Error("Nessuna riga valida nel testo.");

  const entries = [];
  for (const line of lines) {
    const parsed = parseLine(line);
    if (!parsed) {
      // consenti commenti o righe vuote “non matching”
      // Se vuoi essere più severo: throw new Error(`Riga non valida: ${line}`);
      continue;
    }
    entries.push(parsed);
  }

  if (!entries.length) throw new Error("Formato non riconosciuto (es. 3xOP07-015).");

  // Prova a determinare il leader: prima riga che mappa a una carta type=LEADER, altrimenti la prima riga con count==1.
  let leaderCardObj = null;
  let leaderIndex = -1;

  // primo pass: cerca type=LEADER
  for (let i = 0; i < entries.length; i++) {
    const { baseCode, variant } = entries[i];
    const card = findCardByCodeAndVariant(allCards, baseCode, variant);
    if (card && String(card.type).toUpperCase() === "LEADER") {
      leaderCardObj = card;
      leaderIndex = i;
      break;
    }
  }
  // fallback: prima riga con count == 1
  if (!leaderCardObj) {
    const idx = entries.findIndex(e => e.count === 1);
    if (idx >= 0) {
      const { baseCode, variant } = entries[idx];
      const card = findCardByCodeAndVariant(allCards, baseCode, variant);
      if (!card) throw new Error(`Carta non trovata: ${baseCode}${variant ? "_" + variant : ""}`);
      leaderCardObj = card;
      leaderIndex = idx;
    }
  }
  if (!leaderCardObj) throw new Error("Leader non trovato (servono 1x<CODE> in lista).");

  const leaderId = serializeCardId(leaderCardObj);

  // costruisci le 50 carte (escludendo la riga del leader se coincide con leader)
  const cardIds = [];
  entries.forEach((e, i) => {
    const isLeaderLine =
      i === leaderIndex ||
      (leaderCardObj.code?.toLowerCase() === e.baseCode.toLowerCase() &&
        e.count === 1 &&
        ((leaderCardObj.imageId && e.variant && leaderCardObj.imageId.toLowerCase().endsWith(`_${e.variant}`)) ||
          (!e.variant))); // copre caso variante non specificata

    // Se questa riga è stata usata come leader, non inserirla nelle carte
    const times = isLeaderLine ? e.count - 1 : e.count;
    if (times <= 0) return;

    const card = findCardByCodeAndVariant(allCards, e.baseCode, e.variant);
    if (!card) throw new Error(`Carta non trovata: ${e.baseCode}${e.variant ? "_" + e.variant : ""}`);

    const id = serializeCardId(card);
    for (let k = 0; k < times; k++) cardIds.push(id);
  });

  // Controlli base
  if (cardIds.length !== 50) {
    // Puoi rilassare questa regola se vuoi accettare liste parziali
    throw new Error(`Il mazzo deve contenere 50 carte (ne ho trovate ${cardIds.length}).`);
  }

  const deck = {
    name: deckName,
    slug,
    leader: leaderId,
    cards: cardIds,
    visibility: "private",
    isPublished: true,
    isLocal: true,
  };

  return deck;
}

export async function importDeckFromClipboard(deckName, allCards) {
  const text = await navigator.clipboard.readText();
  const slug = deckName.toLowerCase().replace(/\s+/g, "-");
  return parseDeckClipboardText(text, allCards, { deckName, slug });
}
