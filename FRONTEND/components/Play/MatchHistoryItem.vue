<script setup>
const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
});

function formatDate(value) {
  if (!value) return "";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "";

  return parsedDate.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const resultLabel = computed(() => props.item?.resultLabel ?? "-"
);

const resultToneClass = computed(() => {
  const tone = props.item?.resultTone;
  if (tone === "win") return "play-history-result play-history-result--win";
  if (tone === "loss") return "play-history-result play-history-result--loss";
  return "play-history-result play-history-result--invalid";
});

const createdAtLabel = computed(() => formatDate(props.item?.created_at));

function colorsLabel(deck) {
  const colors = Array.isArray(deck?.leader_colors)
    ? deck.leader_colors.filter((color) => typeof color === "string")
    : [];

  return colors.length ? colors.join(" - ") : "Colori non disponibili";
}
</script>

<template>
  <article class="play-history-card">
    <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2 items-center">
      <div class="play-history-side">
        <div class="play-history-leader-wrap">
          <NuxtImg
            v-if="item?.meDeck?.leader_image"
            :src="item.meDeck.leader_image"
            :alt="`Leader ${item.meDeck.leader_name ?? ''}`"
            class="play-history-leader-image"
            loading="lazy"
          />
          <div v-else class="play-history-leader-fallback">
            <v-icon icon="mdi-help-circle-outline" size="20" />
          </div>
        </div>

        <div class="min-w-0 flex-1 space-y-1">
          <UserIdentityHeader
            :username="item?.meProfile?.display_name ?? item?.meProfile?.username"
            :user-tag="item?.meProfile?.user_tag"
            :profile-tag="item?.meProfile?.user_tag"
            :avatar-url="item?.meProfile?.avatar_url"
            size="sm"
          />
          <p class="play-history-subline">{{ item?.meDeck?.leader_name ?? "Leader non disponibile" }}</p>
          <p class="play-history-subline play-history-subline--muted">{{ colorsLabel(item?.meDeck) }}</p>
        </div>
      </div>

      <div :class="resultToneClass">
        {{ resultLabel }}
      </div>

      <div class="play-history-side play-history-side--right">
        <div class="min-w-0 flex-1 space-y-1">
          <UserIdentityHeader
            :username="item?.opponentProfile?.display_name ?? item?.opponentProfile?.username"
            :user-tag="item?.opponentProfile?.user_tag"
            :profile-tag="item?.opponentProfile?.user_tag"
            :avatar-url="item?.opponentProfile?.avatar_url"
            size="sm"
          />
          <p class="play-history-subline text-right">{{ item?.opponentDeck?.leader_name ?? "Leader non disponibile" }}</p>
          <p class="play-history-subline play-history-subline--muted text-right">{{ colorsLabel(item?.opponentDeck) }}</p>
        </div>

        <div class="play-history-leader-wrap">
          <NuxtImg
            v-if="item?.opponentDeck?.leader_image"
            :src="item.opponentDeck.leader_image"
            :alt="`Leader ${item.opponentDeck.leader_name ?? ''}`"
            class="play-history-leader-image"
            loading="lazy"
          />
          <div v-else class="play-history-leader-fallback">
            <v-icon icon="mdi-help-circle-outline" size="20" />
          </div>
        </div>
      </div>
    </div>

    <p class="play-history-date">{{ createdAtLabel }}</p>
  </article>
</template>

<style scoped>
.play-history-card {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 1.05rem;
  background: linear-gradient(140deg, rgba(15, 23, 42, 0.8), rgba(2, 6, 23, 0.88));
  box-shadow:
    0 16px 30px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  padding: 0.62rem;
}

.play-history-side {
  display: flex;
  align-items: center;
  gap: 0.52rem;
  min-width: 0;
}

.play-history-side--right {
  justify-content: flex-end;
}

.play-history-leader-wrap {
  width: 3.35rem;
  min-width: 3.35rem;
  aspect-ratio: 2/3;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 0.62rem;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.78);
}

.play-history-leader-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.play-history-leader-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-content: center;
  color: rgba(148, 163, 184, 0.95);
}

.play-history-subline {
  margin: 0;
  color: rgba(248, 250, 252, 0.88);
  font-size: 0.66rem;
  font-weight: 700;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.play-history-subline--muted {
  color: rgba(148, 163, 184, 0.95);
}

.play-history-result {
  width: 4.5rem;
  min-width: 4.5rem;
  height: 4.5rem;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  display: grid;
  place-content: center;
  text-align: center;
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.3rem;
}

.play-history-result--win {
  background: linear-gradient(145deg, rgba(22, 163, 74, 0.9), rgba(20, 83, 45, 0.95));
  color: rgba(236, 253, 245, 0.98);
  box-shadow: 0 0 20px rgba(34, 197, 94, 0.28);
}

.play-history-result--loss {
  background: linear-gradient(145deg, rgba(220, 38, 38, 0.9), rgba(127, 29, 29, 0.95));
  color: rgba(254, 242, 242, 0.98);
  box-shadow: 0 0 20px rgba(248, 113, 113, 0.28);
}

.play-history-result--invalid {
  background: linear-gradient(145deg, rgba(71, 85, 105, 0.92), rgba(30, 41, 59, 0.95));
  color: rgba(226, 232, 240, 0.98);
  box-shadow: 0 0 20px rgba(148, 163, 184, 0.2);
}

.play-history-date {
  margin: 0.5rem 0 0;
  color: rgba(148, 163, 184, 0.92);
  text-align: center;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
</style>
