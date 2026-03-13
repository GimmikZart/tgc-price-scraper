import { TournamentFormat } from "@/api/tournaments/constants";
import { normalizeTournamentFormat } from "@/api/tournaments/normalizers";
import { roundRobinHandler } from "@/api/tournaments/engine/round-robin";
import { singleEliminationHandler } from "@/api/tournaments/engine/single-elimination";
import { swissHandler } from "@/api/tournaments/engine/swiss";

const FORMAT_HANDLER_BY_TOURNAMENT_FORMAT = Object.freeze({
  [TournamentFormat.SingleElimination]: singleEliminationHandler,
  [TournamentFormat.Swiss]: swissHandler,
  [TournamentFormat.RoundRobin]: roundRobinHandler,
});

export function getTournamentFormatHandler(format) {
  const normalizedFormat = normalizeTournamentFormat(format);

  if (!normalizedFormat) {
    throw new Error("Formato torneo non supportato");
  }

  const handler = FORMAT_HANDLER_BY_TOURNAMENT_FORMAT[normalizedFormat];
  if (!handler) {
    throw new Error(`Nessun handler trovato per il formato "${normalizedFormat}"`);
  }

  return handler;
}

export function normalizeTournamentSettingsByFormat(format, settings = {}) {
  const handler = getTournamentFormatHandler(format);
  return handler.normalizeSettings(settings);
}

export function resolveTournamentTotalRounds({ format, participantsCount, settings = {} }) {
  const handler = getTournamentFormatHandler(format);
  return handler.resolveTotalRounds({
    participantsCount,
    settings,
  });
}

export function tournamentFormatAllowsDraws(format) {
  const handler = getTournamentFormatHandler(format);
  return Boolean(handler.allowsDraws?.());
}
