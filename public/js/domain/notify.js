/* New-match announcements. Nothing is stored in the database: an announcement is simply an
   upcoming match hosted by someone else, and "new" means created after this player last
   opened the notifications panel on this device. */
import { S } from "../core/state.js";
import { lsGet, lsSet } from "../lib/storage.js";

const SEEN_KEY = "dribbl.seen";
const readSeen = () => { try { return JSON.parse(lsGet(SEEN_KEY) || "{}") || {}; } catch (e) { return {}; } };

export const seenAt = () => Number(readSeen()[S.me]) || 0;
export function markSeen() {
  const o = readSeen(); o[S.me] = Date.now();
  lsSet(SEEN_KEY, JSON.stringify(o));
}

/* Upcoming matches hosted by other players, newest first */
export const announcements = () => Object.values(S.matches)
  .filter(m => m.status === "setup" && m.hostId !== S.me)
  .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

export const unseenCount = () => { const t = seenAt(); return announcements().filter(m => (m.createdAt || 0) > t).length; };
