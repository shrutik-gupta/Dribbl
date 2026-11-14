/* Questions you can ask about a single match or a player's place in it. */
import { S, P, isAdmin } from "../core/state.js";
import { LATE_HOURS } from "../config/constants.js";
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

/* Team name: the host's custom name if they set one, otherwise the captain's name
   with an apostrophe ("Shrutik's"). Before a captain is picked it's "Team A" / "Team B". */
export function teamLabel(m, side) {
  const custom = m && String(m["name" + side] || "").trim();
  if (custom) return custom;
  const cap = m && P(m["cap" + side]);
  return cap ? possessive(firstName(cap)) : "Team " + side;
}
