export const Condition = Object.freeze({
  Perfect: "Perfect",
  Used: "Used",
  Worn: "Worn",
  Damaged: "Damaged",
});

export const conditionOptions = Object.freeze([
  { value: Condition.Perfect, label: "Perfetta", color: "#2e7d32" },
  { value: Condition.Used, label: "Usata", color: "#8bc34a" },
  { value: Condition.Worn, label: "Usurata", color: "#fbc02d" },
  { value: Condition.Damaged, label: "Danneggiata", color: "#e53935" },
]);

export function getConditionMeta(value) {
  return conditionOptions.find((option) => option.value === value) ?? null;
}
