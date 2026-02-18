export const OfferStatus = Object.freeze({
  Pending: "Pending",
  Accepted: "Accepted",
  Rejected: "Rejected",
});

export const offerStatusOptions = Object.freeze([
  { value: OfferStatus.Accepted, label: "Accettato", color: "#2e7d32" },
  { value: OfferStatus.Rejected, label: "Rifiutato", color: "#e53935" },
  { value: OfferStatus.Pending, label: "Pending", color: "#fb8c00" },
]);

export function getOfferStatusMeta(value) {
  return offerStatusOptions.find((option) => option.value === value) ?? null;
}
