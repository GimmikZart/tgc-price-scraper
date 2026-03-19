export function buildOnePieceCardsFileName(expansionName) {
  const rawName = String(expansionName ?? "")
    .replace(/[-\[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!rawName) {
    throw new Error("Nome espansione non valido per la generazione del file JSON.");
  }

  return `${rawName.replace(/\s/g, "_").toLowerCase()}.json`;
}
