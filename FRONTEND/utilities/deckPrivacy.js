export const SECRET_DECK_VISIBILITY = "secret";
export const SECRET_DECK_NAME = "Mazzo anonimo";
export const SECRET_DECK_LEADER_NAME = "Leader segreto";
export const SECRET_DECK_PLACEHOLDER_LABEL = "Dati del mazzo nascosti";

export function isSecretDeckSnapshot(deck) {
  if (!deck || typeof deck !== "object" || Array.isArray(deck)) {
    return false;
  }

  return deck.is_secret === true || deck.visibility === SECRET_DECK_VISIBILITY;
}

export function createSecretDeckSnapshot(game = "one_piece") {
  return {
    game,
    slug: null,
    name: SECRET_DECK_NAME,
    leader_id: null,
    leader_name: SECRET_DECK_LEADER_NAME,
    leader_image: null,
    leader_colors: [],
    cards: [],
    cards_count: null,
    saved_at: new Date().toISOString(),
    is_secret: true,
    visibility: SECRET_DECK_VISIBILITY,
    placeholder_label: SECRET_DECK_PLACEHOLDER_LABEL,
  };
}
