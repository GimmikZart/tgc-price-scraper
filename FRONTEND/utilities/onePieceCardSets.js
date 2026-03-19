export function buildOnePieceCardsFileName(expansionName) {
  const rawName = String(expansionName ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’`]+/g, "")
    .replace(/[\[\]]/g, " ")
    .replace(/[-–—]+/g, " ")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  if (!rawName) {
    throw new Error("Nome espansione non valido per la generazione del file JSON.");
  }

  return `${rawName}.json`;
}
