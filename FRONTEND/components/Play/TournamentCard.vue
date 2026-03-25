<script setup>
import {
  formatTournamentFormatLabel,
  formatTournamentGameLabel,
  formatTournamentHashtagLabel,
  formatTournamentLocationLabel,
  formatTournamentStatusLabel,
  formatTournamentVisibilityLabel,
  resolveTournamentStatusChipClass,
} from "@/utilities/tournaments";

const props = defineProps({
  tournament: {
    type: Object,
    required: true,
  },
  interactive: {
    type: Boolean,
    default: false,
  },
  showLocation: {
    type: Boolean,
    default: true,
  },
  showStatus: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["click"]);

const rootTag = computed(() => (props.interactive ? "button" : "article"));
const rootAttributes = computed(() => (
  props.interactive
    ? { type: "button" }
    : {}
));

const organizerDisplayName = computed(() => {
  return props.tournament?.organizer_profile?.display_name
    ?? props.tournament?.organizer_profile?.username
    ?? "Organizer";
});

const organizerTag = computed(() => {
  return props.tournament?.organizer_profile?.user_tag
    ?? props.tournament?.organizer_profile?.username
    ?? props.tournament?.organizer_profile?.display_name
    ?? organizerDisplayName.value;
});

const locationLabel = computed(() => {
  if (!props.showLocation) return null;
  return formatTournamentLocationLabel(props.tournament);
});

function handleClick() {
  if (!props.interactive) return;
  emit("click", props.tournament);
}
</script>

<template>
  <component
    :is="rootTag"
    v-bind="rootAttributes"
    class="tournament-card"
    :class="{ 'tournament-card--interactive': interactive }"
    @click="handleClick"
  >
    <div class="tournament-card__body">
      <div class="tournament-card__identity">
        <UserIdentityHeader
          :username="organizerDisplayName"
          :user-tag="organizerTag"
          :avatar-url="tournament.organizer_profile?.avatar_url"
          size="sm"
          :navigable="false"
        />
      </div>

      <div class="tournament-card__content">
        <p class="tournament-card__title">{{ tournament.name }}</p>

        <div class="tournament-card__hashtags">
          <span class="tournament-card__hashtag">
            {{ formatTournamentHashtagLabel(formatTournamentGameLabel(tournament.game)) }}
          </span>
          <span class="tournament-card__hashtag">
            {{ formatTournamentHashtagLabel(formatTournamentFormatLabel(tournament.format)) }}
          </span>
          <span class="tournament-card__visibility-chip">
            {{ formatTournamentVisibilityLabel(tournament.visibility) }}
          </span>
        </div>

        <div v-if="locationLabel" class="tournament-card__location">
          <v-icon size="14" icon="mdi-map-marker" />
          <span>{{ locationLabel }}</span>
        </div>
      </div>

      <div class="tournament-card__footer">
        <div class="tournament-card__participants">
          <span class="tournament-card__participants-label">Partecipanti</span>
          <span class="tournament-card__participants-value">
            {{ tournament.participants_count ?? 0 }} / {{ tournament.max_participants ?? "-" }}
          </span>
        </div>

        <span
          v-if="showStatus"
          :class="[
            'tournament-card__status-chip',
            resolveTournamentStatusChipClass(tournament.status),
          ]"
        >
          {{ formatTournamentStatusLabel(tournament.status) }}
        </span>
      </div>
    </div>
  </component>
</template>

<style scoped>
.tournament-card {
  width: 100%;
  text-align: left;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 1.15rem;
  background: rgba(8, 12, 20, 0.96);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 12px 24px rgba(0, 0, 0, 0.24);
  padding: 0.88rem;
}

.tournament-card--interactive {
  display: block;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    filter 160ms ease;
}

.tournament-card--interactive:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.18);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 14px 28px rgba(0, 0, 0, 0.28);
  filter: brightness(1.01);
}

.tournament-card--interactive:focus-visible {
  outline: none;
  border-color: rgba(255, 255, 255, 0.24);
  box-shadow:
    0 0 0 2px rgba(255, 255, 255, 0.12),
    0 12px 24px rgba(0, 0, 0, 0.24);
}

.tournament-card__body {
  display: grid;
  gap: 0.82rem;
}

.tournament-card__identity :deep(.user-identity) {
  border-color: rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.04);
  box-shadow: none;
}

.tournament-card__identity :deep(.user-identity-name) {
  font-size: 0.88rem;
}

.tournament-card__identity :deep(.user-identity-tag) {
  font-size: 0.6rem;
}

.tournament-card__content {
  display: grid;
  gap: 0.6rem;
}

.tournament-card__title {
  margin: 0;
  color: rgba(255, 245, 235, 0.98);
  font-size: 1.05rem;
  font-weight: 900;
  line-height: 1.1;
}

.tournament-card__hashtags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.tournament-card__hashtag {
  display: inline-flex;
  align-items: center;
  min-height: 1.85rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.03);
  color: rgba(226, 232, 240, 0.92);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  padding: 0.34rem 0.72rem;
}

.tournament-card__visibility-chip {
  display: inline-flex;
  align-items: center;
  min-height: 1.85rem;
  border: 1px solid rgba(255, 183, 124, 0.22);
  border-radius: 999px;
  background: rgba(255, 122, 24, 0.08);
  color: rgba(255, 226, 204, 0.94);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.03em;
  padding: 0.34rem 0.72rem;
}

.tournament-card__location {
  display: inline-flex;
  align-items: center;
  gap: 0.32rem;
  width: fit-content;
  max-width: 100%;
  border: 1px solid rgba(255, 183, 124, 0.22);
  border-radius: 999px;
  background: rgba(255, 122, 24, 0.08);
  color: rgba(255, 226, 204, 0.94);
  font-size: 0.73rem;
  font-weight: 700;
  line-height: 1.35;
  padding: 0.38rem 0.72rem;
}

.tournament-card__location span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tournament-card__footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.7rem;
}

.tournament-card__participants {
  display: grid;
  gap: 0.16rem;
}

.tournament-card__participants-label {
  color: rgba(148, 163, 184, 0.9);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.tournament-card__participants-value {
  color: rgba(248, 250, 252, 0.98);
  font-size: 0.92rem;
  font-weight: 900;
  line-height: 1;
}

.tournament-card__status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  min-height: 2.25rem;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 0.95rem;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 12px 20px rgba(0, 0, 0, 0.2);
  font-size: 0.76rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  padding: 0.5rem 0.92rem;
  text-transform: uppercase;
}

.tournament-card__status-chip--draft {
  background: rgba(51, 65, 85, 0.92);
  border-color: rgba(148, 163, 184, 0.42);
  color: rgba(241, 245, 249, 0.96);
}

.tournament-card__status-chip--open {
  background: rgba(8, 47, 73, 0.94);
  border-color: rgba(125, 211, 252, 0.5);
  color: rgba(224, 242, 254, 0.98);
}

.tournament-card__status-chip--started {
  background: rgba(120, 53, 15, 0.94);
  border-color: rgba(252, 211, 77, 0.52);
  color: rgba(255, 247, 237, 0.98);
}

.tournament-card__status-chip--completed {
  background: rgba(20, 83, 45, 0.94);
  border-color: rgba(134, 239, 172, 0.5);
  color: rgba(240, 253, 244, 0.98);
}

.tournament-card__status-chip--cancelled {
  background: rgba(127, 29, 29, 0.94);
  border-color: rgba(252, 165, 165, 0.48);
  color: rgba(255, 241, 242, 0.98);
}
</style>
