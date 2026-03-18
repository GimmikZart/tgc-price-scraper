import { TournamentFormat, TournamentStatus } from "@/api/tournaments/constants";
import { formatCoordinatesLabel, normalizeCoordinates } from "@/utilities/geo";

export const TOURNAMENT_FORMAT_OPTIONS = Object.freeze([
  {
    value: TournamentFormat.SingleElimination,
    label: "Eliminazione diretta",
    cardLabel: "Single Elimination",
    summary: "Bracket rapido: perdi un match e sei fuori.",
    rules: [
      "Tabellone a eliminazione singola con bye automatici quando servono.",
      "Nessun pareggio: ogni match deve avere un vincitore.",
      "Ideale per eventi veloci e ad alto ritmo.",
    ],
  },
  {
    value: TournamentFormat.Swiss,
    label: "Swiss",
    cardLabel: "Swiss",
    summary: "Piu round garantiti, classifica a punti fino alla fine.",
    rules: [
      "Tutti giocano piu round, anche dopo una sconfitta.",
      "Abbinamenti per classifica con pareggi consentiti.",
      "Perfetto per eventi competitivi con ranking finale.",
    ],
  },
  {
    value: TournamentFormat.RoundRobin,
    label: "Round Robin",
    cardLabel: "Round Robin",
    summary: "Ogni partecipante affronta tutti gli altri.",
    rules: [
      "Calendario completo contro ogni altro giocatore.",
      "Pareggi consentiti e classifica basata sui punti.",
      "Ottimo per gruppi piccoli dove conta la costanza.",
    ],
  },
]);

export function getTournamentFormatMeta(format) {
  return TOURNAMENT_FORMAT_OPTIONS.find((option) => option.value === format) ?? null;
}

export function formatTournamentFormatLabel(format) {
  return getTournamentFormatMeta(format)?.cardLabel ?? "-";
}

export function formatTournamentFormatSelectorLabel(format) {
  return getTournamentFormatMeta(format)?.label ?? formatTournamentFormatLabel(format);
}

export function formatTournamentGameLabel(game) {
  const normalizedGame = String(game ?? "").trim();
  if (!normalizedGame) return "Game";
  if (normalizedGame === "one_piece") return "One Piece";

  return normalizedGame
    .split(/[_-]+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

export function formatTournamentStatusLabel(status) {
  if (status === TournamentStatus.Draft) return "Bozza";
  if (status === TournamentStatus.Open) return "Aperto";
  if (status === TournamentStatus.Started) return "In corso";
  if (status === TournamentStatus.Completed) return "Completato";
  if (status === TournamentStatus.Cancelled) return "Annullato";
  return "-";
}

export function formatTournamentHashtagLabel(label) {
  const normalizedLabel = String(label ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9\s_-]/g, "")
    .replace(/[\s_-]+/g, "");

  return normalizedLabel ? `#${normalizedLabel}` : "#Torneo";
}

export function resolveTournamentStatusChipClass(status) {
  if (status === TournamentStatus.Open) return "tournament-card__status-chip--open";
  if (status === TournamentStatus.Started) return "tournament-card__status-chip--started";
  if (status === TournamentStatus.Completed) return "tournament-card__status-chip--completed";
  if (status === TournamentStatus.Cancelled) return "tournament-card__status-chip--cancelled";
  return "tournament-card__status-chip--draft";
}

export function formatTournamentLocationLabel(location) {
  if (!location || typeof location !== "object") return null;

  const explicitLabel = String(
    location.location_label
      ?? location.locationLabel
      ?? location.label
      ?? "",
  ).trim();

  if (explicitLabel) {
    return explicitLabel;
  }

  const coordinates = normalizeCoordinates({
    lat: location.latitude ?? location.lat,
    lng: location.longitude ?? location.lng,
  });

  return coordinates ? formatCoordinatesLabel(coordinates, 4) : null;
}

export function resolveSingleEliminationRounds(participantsCount) {
  const normalizedCount = Math.max(2, Number(participantsCount) || 2);
  return Math.ceil(Math.log2(normalizedCount));
}

export function resolveSwissRoundsForParticipants(participantsCount) {
  const normalizedCount = Math.max(2, Number(participantsCount) || 2);
  return Math.max(3, Math.ceil(Math.log2(normalizedCount)) + 1);
}

export function resolveRoundRobinRounds(participantsCount) {
  const normalizedCount = Math.max(2, Number(participantsCount) || 2);
  return normalizedCount % 2 === 1
    ? normalizedCount
    : normalizedCount - 1;
}
