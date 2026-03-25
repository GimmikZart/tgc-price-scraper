export const TournamentFormat = Object.freeze({
  SingleElimination: "single_elimination",
  Swiss: "swiss",
  RoundRobin: "round_robin",
});

export const TournamentVisibility = Object.freeze({
  Public: "public",
  Friends: "friends",
  Private: "private",
});

export const TournamentStatus = Object.freeze({
  Draft: "draft",
  Open: "open",
  Started: "started",
  Completed: "completed",
  Cancelled: "cancelled",
});

export const TournamentParticipantStatus = Object.freeze({
  Registered: "registered",
  Active: "active",
  Withdrawn: "withdrawn",
  Eliminated: "eliminated",
});

export const TournamentRoundStatus = Object.freeze({
  Pending: "pending",
  Active: "active",
  Completed: "completed",
});

export const TournamentMatchStatus = Object.freeze({
  Pending: "pending",
  Completed: "completed",
  Cancelled: "cancelled",
});

export const TournamentMatchResult = Object.freeze({
  Player1Win: "player1_win",
  Player2Win: "player2_win",
  Draw: "draw",
});

export const DEFAULT_TOURNAMENT_GAME = "one_piece";

export const DEFAULT_SWISS_POINTS = Object.freeze({
  win: 3,
  draw: 1,
  loss: 0,
});

export const DEFAULT_ROUND_ROBIN_POINTS = Object.freeze({
  win: 3,
  draw: 1,
  loss: 0,
});

export const SUPPORTED_TOURNAMENT_FORMATS = Object.freeze(
  Object.values(TournamentFormat),
);

export const SUPPORTED_TOURNAMENT_VISIBILITIES = Object.freeze(
  Object.values(TournamentVisibility),
);
