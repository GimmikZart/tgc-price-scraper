export function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize("NFD") // separa lettere e accenti
    .replace(/[\u0300-\u036f]/g, "") // rimuove gli accenti
    .replace(/[^a-z0-9]+/g, "-") // sostituisce tutto ciò che non è alfanumerico con -
    .replace(/^-+|-+$/g, "") // rimuove i trattini iniziali/finali
    .replace(/--+/g, "-"); // rimuove i doppi trattini
}
