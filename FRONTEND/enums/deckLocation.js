export const LEGACY_DEVICE_DECK_LOCATION = "bozza";

export const DeckLocation = Object.freeze({
  DEVICE: "device",
  CLOUD: "cloud",
  RECEIVED: "received",
});

export const deckLocationOptions = Object.freeze([
  { label: "Dispositivo", value: DeckLocation.DEVICE },
  { label: "Cloud", value: DeckLocation.CLOUD },
  { label: "Ricevuti", value: DeckLocation.RECEIVED },
]);

export function normalizeDeckLocation(value) {
  if (value === DeckLocation.DEVICE || value === LEGACY_DEVICE_DECK_LOCATION) {
    return DeckLocation.DEVICE;
  }

  if (value === DeckLocation.RECEIVED) {
    return DeckLocation.RECEIVED;
  }

  return DeckLocation.CLOUD;
}

export function getDeckLocationLabel(value) {
  const normalizedValue = normalizeDeckLocation(value);
  const opt = deckLocationOptions.find((o) => o.value === normalizedValue);
  return opt ? opt.label : null;
}
