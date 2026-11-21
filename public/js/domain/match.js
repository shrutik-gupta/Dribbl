/* Questions you can ask about a single match or a player's place in it. */
import { S, P, isAdmin } from "../core/state.js";
import { ABANDON_HOURS, APP_URL, LATE_HOURS } from "../config/constants.js";
import { lsGet, lsSet } from "../lib/storage.js";
import { firstName, possessive } from "../lib/utils.js";

export const inMatch = (m, pid) => !!m && (m.teamA.includes(pid) || m.teamB.includes(pid));
export const canControl = m => !!m && !!S.me && (m.hostId === S.me || isAdmin());
export const kickoff = m => new Date(m.date + "T" + (m.time || "20:00") + ":00").getTime();
export const isLateNow = m => Date.now() > kickoff(m) - LATE_HOURS * 3600000;
export const minuteOf = m => (m.startedAt ? Math.max(1, Math.floor((Date.now() - m.startedAt) / 60000) + 1) : null);

export const rsvpOf = (mid, pid) => S.rsvps[mid + "_" + pid];
export const payOf = (mid, pid) => S.payments[mid + "_" + pid];
export const injured = pid => ((P(pid) || {}).injury || {}).status === "injured";

export const otherSide = side => (side === "A" ? "B" : "A");
export const sideOf = (m, pid) => (m.teamA.includes(pid) ? "A" : m.teamB.includes(pid) ? "B" : "");

/* Abandoned: the host or admin called it off, or it never started within ABANDON_HOURS of
   kick-off. An overdue match counts as abandoned straight away; a sweep then saves it. */
export const isOverdue = m => !!m && m.status === "setup" && Date.now() > kickoff(m) + ABANDON_HOURS * 3600000;
export const isAbandoned = m => !!m && (m.status === "abandoned" || isOverdue(m));
export const isUpcoming = m => !!m && m.status === "setup" && !isOverdue(m);

/* Goals by the team the player was playing for when they scored, so a player who switches
   teams mid-game leaves their earlier goals with their old team.
     g.A[pid]  goals pid scored while playing for A (count for A)
     og.A[pid] own goals pid scored while playing for A (count for B)
   m.goals / m.og keep each player's totals for stats. Matches saved before team switches
   existed have no gBy, so their goals belong to the team the player is in. */
export function tallyOf(m) {
  if (m.gBy) return { g: { A: {}, B: {}, ...m.gBy }, og: { A: {}, B: {}, ...(m.ogBy || {}) } };
  const g = { A: {}, B: {} }, og = { A: {}, B: {} };
  for (const s of ["A", "B"]) for (const p of m["team" + s]) {
    if (m.goals[p]) g[s][p] = m.goals[p];
    if ((m.og || {})[p]) og[s][p] = m.og[p];
  }
  return { g, og };
}
const total = o => Object.values(o).reduce((s, n) => s + (n || 0), 0);
export function scoreOf(m) {
  const t = tallyOf(m);
  return { sA: total(t.g.A) + (m.extraA || 0) + total(t.og.B), sB: total(t.g.B) + (m.extraB || 0) + total(t.og.A) };
}
/* The team a goal event was scored by (an own goal counts for the other side) */
export const teamOfEvent = e => e.team || (e.kind === "og" ? otherSide(e.side) : e.side);

/* Team name: the host's custom name if they set one, otherwise the captain's name
   with an apostrophe ("Shrutik's"). Before a captain is picked it's "Team A" / "Team B". */
export function teamLabel(m, side) {
  const custom = m && String(m["name" + side] || "").trim();
  if (custom) return custom;
  const cap = m && P(m["cap" + side]);
  return cap ? possessive(firstName(cap)) : "Team " + side;
}

/* ---------- private matches ----------
   A private match has a join code. You can open and join it if you host it, are the admin,
   are already part of it (any reply, or picked in a team), or have entered its code on this device. */
const CODES_KEY = "dribbl.codes";
const savedCodes = () => { try { return JSON.parse(lsGet(CODES_KEY) || "{}") || {}; } catch (e) { return {}; } };
const cleanCode = c => String(c || "").trim().toUpperCase();

export function rememberCode(mid, code) {
  const o = savedCodes(); o[mid] = cleanCode(code);
  lsSet(CODES_KEY, JSON.stringify(o));
}
export const codeMatches = (m, code) => !!m.code && cleanCode(code) === m.code;

export function hasAccess(m) {
  if (!m || !m.private) return true;
  if (!S.me) return false;
  return m.hostId === S.me || isAdmin() || inMatch(m, S.me) || !!rsvpOf(m.id, S.me) || codeMatches(m, savedCodes()[m.id]);
}

/* Link to share. For a private match the code rides along, so the friend doesn't have to type it. */
export const matchLink = m => APP_URL + "/#match-" + m.id + (m.private && m.code ? "?code=" + m.code : "");
