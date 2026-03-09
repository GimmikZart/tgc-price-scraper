export const Visibility = Object.freeze({
  PUBLIC: "public",
  FRIENDS: "friends",
  PRIVATE: "private",
});

export const visibilityOptions = Object.freeze([
  { label: "Pubblico", value: Visibility.PUBLIC },
  { label: "Solo Amici", value: Visibility.FRIENDS },
  { label: "Privato", value: Visibility.PRIVATE },
]);

export const publicPrivateVisibilityOptions = Object.freeze([
  { label: "Pubblico", value: Visibility.PUBLIC },
  { label: "Privato", value: Visibility.PRIVATE },
]);

export function getVisibilityLabel(value) {
  const opt = visibilityOptions.find((o) => o.value === value);
  return opt ? opt.label : null;
}
