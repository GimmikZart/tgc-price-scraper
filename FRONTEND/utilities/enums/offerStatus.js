export const OfferStatus = Object.freeze({
  Pending: "Pending",
  Accepted: "Accepted",
  Rejected: "Rejected",
});

export const offerStatusOptions = Object.freeze([
  {
    value: OfferStatus.Accepted,
    label: "Accettato",
    color: "#2e7d32",
    icon: "mdi-check-bold",
  },
  {
    value: OfferStatus.Rejected,
    label: "Rifiutato",
    color: "#e53935",
    icon: "mdi-close-thick",
  },
  {
    value: OfferStatus.Pending,
    label: "Pending",
    color: "#fb8c00",
    icon: "mdi-timer-sand",
  },
]);

export function getOfferStatusMeta(value) {
  return offerStatusOptions.find((option) => option.value === value) ?? null;
}
