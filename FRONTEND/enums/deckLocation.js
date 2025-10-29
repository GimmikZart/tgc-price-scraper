export const DeckLocation = Object.freeze({
  BOZZA: "bozza",
  CLOUD: "cloud",
});

export const deckLocationOptions = Object.freeze([
  { label: "Bozza", value: DeckLocation.BOZZA },
  { label: "Cloud", value: DeckLocation.CLOUD },
]);

export function getDeckLocationLabel(value) {
  const opt = deckLocationOptions.find((o) => o.value === value);
  return opt ? opt.label : null;
}
