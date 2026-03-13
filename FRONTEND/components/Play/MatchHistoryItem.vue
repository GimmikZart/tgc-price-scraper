<script setup>
const router = useRouter();

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  routePath: {
    type: String,
    default: null,
  },
  disableNavigation: {
    type: Boolean,
    default: false,
  },
  clickable: {
    type: Boolean,
    default: true,
  },
});
const emit = defineEmits(["select"]);

const challengerProfile = computed(() => props.item?.challenger_profile ?? props.item?.challengerProfile ?? null);
const challengerDeck = computed(() => props.item?.challenger_deck ?? props.item?.challengerDeck ?? null);
const opponentProfile = computed(() => props.item?.opponent_profile ?? props.item?.opponentProfile ?? null);
const opponentDeck = computed(() => props.item?.opponent_deck ?? props.item?.opponentDeck ?? null);

const challengerAvatarError = ref(false);
const opponentAvatarError = ref(false);

watch(
  () => challengerProfile.value?.avatar_url,
  () => {
    challengerAvatarError.value = false;
  },
);

watch(
  () => opponentProfile.value?.avatar_url,
  () => {
    opponentAvatarError.value = false;
  },
);

function normalizeText(value) {
  if (typeof value !== "string") return null;
  const normalizedValue = value.trim();
  return normalizedValue || null;
}

function normalizeTag(value) {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) return "@utente";
  return normalizedValue.startsWith("@") ? normalizedValue : `@${normalizedValue}`;
}

function getInitial(value) {
  const normalizedValue = normalizeText(value) ?? "";
  if (!normalizedValue) return "?";
  return normalizedValue[0].toUpperCase();
}

const challengerIdentity = computed(() => {
  const username = normalizeText(challengerProfile.value?.display_name)
    ?? normalizeText(challengerProfile.value?.username)
    ?? "Sfidante";

  return {
    username,
    userTag: normalizeTag(challengerProfile.value?.user_tag),
    avatarUrl: normalizeText(challengerProfile.value?.avatar_url),
    initial: getInitial(username),
  };
});

const opponentIdentity = computed(() => {
  const username = normalizeText(opponentProfile.value?.display_name)
    ?? normalizeText(opponentProfile.value?.username)
    ?? "Sfidato";

  return {
    username,
    userTag: normalizeTag(opponentProfile.value?.user_tag),
    avatarUrl: normalizeText(opponentProfile.value?.avatar_url),
    initial: getInitial(username),
  };
});

const rowToneClass = computed(() => {
  const tone = props.item?.resultTone;
  if (tone === "winner_left") return "play-history-row play-history-row--winner-left";
  if (tone === "winner_right") return "play-history-row play-history-row--winner-right";
  if (tone === "pending") return "play-history-row play-history-row--pending";
  if (tone === "win") return "play-history-row play-history-row--win";
  if (tone === "loss") return "play-history-row play-history-row--loss";
  if (tone === "draw") return "play-history-row play-history-row--draw";
  return "play-history-row play-history-row--invalid";
});

const tableLabel = computed(() => normalizeText(props.item?.tableLabel ?? props.item?.table_label));

const canInteract = computed(() => {
  if (props.clickable === false) return false;
  if (props.disableNavigation) return true;
  if (normalizeText(props.routePath)) return true;
  return Boolean(props.item?.id);
});

const rowClass = computed(() => [
  rowToneClass.value,
  tableLabel.value ? "play-history-row--with-table" : "",
  !canInteract.value ? "play-history-row--disabled" : "",
]);

function getDeckLabel(deck) {

  const leaderName = typeof deck?.leader_name === "string" && deck.leader_name.trim()
    ? deck.leader_name.trim()
    : "Leader non disponibile";

  const leaderColors = Array.isArray(deck?.leader_colors)
    ? deck.leader_colors
      .filter((color) => typeof color === "string" && color.trim())
      .map((color) => color.trim())
    : [];

  const colorsLabel = leaderColors.length ? leaderColors.join(" / ") : "Colori non disponibili";
  return `${leaderName} ( ${colorsLabel} )`;
}

function handleRowClick() {
  if (!canInteract.value) return;

  emit("select", props.item);

  if (props.disableNavigation) return;

  const explicitRoutePath = normalizeText(props.routePath);
  if (explicitRoutePath) {
    router.push(explicitRoutePath);
    return;
  }

  if (!props.item?.id) return;
  router.push(`/play/match/${props.item.id}`);
}

function handleChallengerAvatarError() {
  challengerAvatarError.value = true;
}

function handleOpponentAvatarError() {
  opponentAvatarError.value = true;
}
</script>

<template>
  <button
    type="button"
    :class="rowClass"
    :disabled="!canInteract"
    @click="handleRowClick"
  >
    <p v-if="tableLabel" class="play-history-row__table">
      {{ tableLabel }}
    </p>

    <div class="play-history-row__content">
      <div class="play-history-row__side play-history-row__side--challenger">
        <div class="play-history-row__identity">
          <div class="play-history-row__avatar">
            <img
              v-if="challengerIdentity.avatarUrl && !challengerAvatarError"
              :src="challengerIdentity.avatarUrl"
              :alt="`Avatar di ${challengerIdentity.username}`"
              class="play-history-row__avatar-image"
              @error="handleChallengerAvatarError"
            />
            <span v-else class="play-history-row__avatar-fallback">{{ challengerIdentity.initial }}</span>
          </div>

          <div class="play-history-row__identity-copy">
            <p class="play-history-row__name">{{ challengerIdentity.username }}</p>
            <p class="play-history-row__tag">{{ challengerIdentity.userTag }}</p>
          </div>
        </div>

        <p class="play-history-row__deck">{{ getDeckLabel(challengerDeck) }}</p>
      </div>

      <div class="play-history-row__side play-history-row__side--opponent">
        <div class="play-history-row__identity play-history-row__identity--right">
          <div class="play-history-row__identity-copy play-history-row__identity-copy--right">
            <p class="play-history-row__name">{{ opponentIdentity.username }}</p>
            <p class="play-history-row__tag">{{ opponentIdentity.userTag }}</p>
          </div>

          <div class="play-history-row__avatar">
            <img
              v-if="opponentIdentity.avatarUrl && !opponentAvatarError"
              :src="opponentIdentity.avatarUrl"
              :alt="`Avatar di ${opponentIdentity.username}`"
              class="play-history-row__avatar-image"
              @error="handleOpponentAvatarError"
            />
            <span v-else class="play-history-row__avatar-fallback">{{ opponentIdentity.initial }}</span>
          </div>
        </div>

        <p class="play-history-row__deck play-history-row__deck--right">{{ getDeckLabel(opponentDeck) }}</p>
      </div>

      <div class="play-history-row__vs">VS</div>
    </div>
  </button>
</template>

<style scoped>
.play-history-row {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 1.05rem;
  text-align: left;
  padding: 0.52rem 0.6rem 0.28rem;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    filter 160ms ease;
}

.play-history-row--with-table {
  padding-top: 0.36rem;
}

.play-history-row--disabled {
  cursor: default;
  opacity: 0.72;
}

.play-history-row:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.03);
}

.play-history-row:focus-visible {
  outline: none;
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.42);
  box-shadow:
    0 0 0 2px rgba(255, 255, 255, 0.22),
    0 10px 22px rgba(0, 0, 0, 0.28);
}

.play-history-row--win {
  background: linear-gradient(135deg, rgba(22, 163, 74, 0.44), rgba(20, 83, 45, 0.56));
}

.play-history-row--loss {
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.43), rgba(127, 29, 29, 0.58));
}

.play-history-row--draw {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.44), rgba(120, 53, 15, 0.58));
}

.play-history-row--pending {
  border-color: rgba(251, 146, 60, 0.62);
  background: rgba(234, 88, 12, 0.08);
  box-shadow: inset 0 0 0 1px rgba(249, 115, 22, 0.22);
}

.play-history-row--winner-left {
  background: linear-gradient(
    95deg,
    rgba(21, 128, 61, 0.56) 0%,
    rgba(21, 128, 61, 0.22) 42%,
    rgba(220, 38, 38, 0.18) 58%,
    rgba(153, 27, 27, 0.56) 100%
  );
}

.play-history-row--winner-right {
  background: linear-gradient(
    95deg,
    rgba(153, 27, 27, 0.56) 0%,
    rgba(220, 38, 38, 0.18) 42%,
    rgba(21, 128, 61, 0.22) 58%,
    rgba(21, 128, 61, 0.56) 100%
  );
}

.play-history-row--invalid {
  background: linear-gradient(135deg, rgba(71, 85, 105, 0.5), rgba(30, 41, 59, 0.62));
}

.play-history-row__table {
  margin: 0 0 0.28rem;
  text-align: center;
  color: rgba(255, 237, 213, 0.96);
  font-size: 0.63rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.play-history-row__content {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45rem;
  align-items: stretch;
}

.play-history-row__side {
  min-width: 0;
  border-radius: 0.86rem;
  padding: 0.38rem 0.45rem;
}

.play-history-row__side--challenger {
  padding-right: 1.32rem;
}

.play-history-row__side--opponent {
  padding-left: 1.32rem;
}

.play-history-row__identity {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
}

.play-history-row__identity--right {
  justify-content: flex-end;
}

.play-history-row__avatar {
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 9999px;
  overflow: hidden;
  border: 2px solid rgba(248, 250, 252, 0.8);
  background: rgba(15, 23, 42, 0.8);
  display: grid;
  place-content: center;
  flex: 0 0 auto;
}

.play-history-row__avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.play-history-row__avatar-fallback {
  font-size: 0.64rem;
  font-weight: 800;
  color: rgba(241, 245, 249, 0.95);
}

.play-history-row__identity-copy {
  min-width: 0;
}

.play-history-row__identity-copy--right {
  text-align: right;
}

.play-history-row__name {
  margin: 0;
  color: rgba(248, 250, 252, 0.95);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.play-history-row__tag {
  margin: 0;
  color: rgba(203, 213, 225, 0.85);
  font-size: 0.56rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.play-history-row__vs {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.26);
  background: rgba(15, 23, 42, 0.72);
  display: grid;
  place-items: center;
  color: rgba(248, 250, 252, 0.96);
  font-size: 0.52rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  box-shadow:
    0 6px 12px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.14);
}

.play-history-row__deck {
  color: rgba(241, 245, 249, 0.94);
  font-size: 0.58rem;
  font-weight: 700;
  line-height: 1.18;
  white-space: nowrap;
  overflow: hidden;
  text-align: left;
  margin-left: 2rem;
  text-overflow: ellipsis;
}

.play-history-row__deck--right {
  text-align: right;
  margin-left: 0;
  margin-right: 2rem;
}
</style>
