/* The single source of truth. S mirrors Firestore, UI holds view state that isn't saved. */
import { SESSION_KEY, DEFAULT_CLUB } from "../config/constants.js";
import { lsGet } from "../lib/storage.js";

export const COLLECTIONS = ["players", "matches", "ratings", "rsvps", "payments", "payinfo"];

export const S = {
  db: null,
  me: lsGet(SESSION_KEY),          // id of the logged-in player
  players: {}, matches: {}, ratings: {}, rsvps: {}, payments: {}, payinfo: {}, config: {},
  ready: { players: false, matches: false, ratings: false, rsvps: false, payments: false, payinfo: false, config: false },
  bootFail: false, slow: false, loadErr: null
};

export const UI = {
  route: "matches",
  authMode: "login",               // "login" | "register"
  draft: {}, reRate: {}, editRes: {}, mtab: {},
  stats: { period: "all", sort: "avg", dir: -1 },
  graphs: { gran: "month", sel: null }
};

/* Data version: bumped on every snapshot so derived data knows when to recompute */
let ver = 0;
export const version = () => ver;
export const bump = () => ++ver;

export const allReady = () => Object.values(S.ready).every(Boolean);
export const P = id => S.players[id];
export const meP = () => S.players[S.me];
export const isAdmin = () => !!(meP() && meP().isAdmin);
export const clubName = () => (S.config && S.config.name) || DEFAULT_CLUB;

/* A self-registered player has onboarded:false until they finish their player card.
   Players created before self-registration have no flag and count as onboarded. */
export const isOnboarded = p => !!p && p.onboarded !== false;
export const activePlayers = () => Object.values(S.players)
  .filter(p => p.active !== false && isOnboarded(p))
  .sort((a, b) => a.name.localeCompare(b.name));
