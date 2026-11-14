/* Everything worked out from raw data: scores, ratings, stats, penalties, squads.
   Nothing here is stored. Results are cached until the data version changes. */
import { S, P, version } from "../core/state.js";
import { MAX_STRIKES, CLEAR_AFTER, DEFAULT_SEED } from "../config/constants.js";
import { inMatch, injured } from "./match.js";

let cache = { v: -1 };

export function derive() {
  if (cache.v === version()) return cache;
  const info = {};
  const ended = Object.values(S.matches).filter(m => m.status === "ended")
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.endedAt || 0) - (b.endedAt || 0)));

  for (const m of Object.values(S.matches)) {
    const sA = m.teamA.reduce((s, p) => s + (m.goals[p] || 0), 0) + (m.extraA || 0);
    const sB = m.teamB.reduce((s, p) => s + (m.goals[p] || 0), 0) + (m.extraB || 0);
    info[m.id] = { sA, sB, acc: {}, avg: {}, raters: 0, motm: null };
  }
  for (const r of Object.values(S.ratings)) {
    const m = S.matches[r.matchId];
    if (!m || m.status !== "ended" || !inMatch(m, r.raterId)) continue;
    const mi = info[m.id]; mi.raters++;
    for (const [pid, v] of Object.entries(r.scores || {})) {
      const n = Number(v);
      if (pid === r.raterId || !inMatch(m, pid) || !(n >= 1 && n <= 10)) continue;
      const a = mi.acc[pid] || (mi.acc[pid] = { sum: 0, n: 0 });
      a.sum += n; a.n++;
    }
  }
  for (const mi of Object.values(info)) {
    let best = null;
    for (const [pid, a] of Object.entries(mi.acc)) {
      mi.avg[pid] = { avg: a.sum / a.n, n: a.n };
      if (!best || a.sum / a.n > mi.avg[best].avg || (a.sum / a.n === mi.avg[best].avg && a.n > mi.avg[best].n)) best = pid;
    }
    mi.motm = mi.raters >= 2 ? best : null;
  }
  cache = { v: version(), info, ended, all: playerStats(ended, info), pen: penalties(ended) };
  return cache;
}

/* Penalties are worked out from match data, never stored as counters.
   No-show: host marks it on the match. Late drop-out: player switches from "I'm in" to "I'm out"
   within LATE_HOURS of kick-off. Each penalty clears after the player plays CLEAR_AFTER matches.
   Admin reapproval (penaltyResetAt) clears everything given before it. */
function penalties(ended) {
  const pen = {};
  const add = (pid, item) => (pen[pid] || (pen[pid] = { list: [], active: 0, suspended: false })).list.push(item);
  for (const m of Object.values(S.matches)) {
    for (const [pid, ns] of Object.entries(m.noShows || {})) {
      add(pid, { type: "noshow", mid: m.id, date: m.date, at: ns.at || 0, waived: !!(m.waived || {})[pid] });
    }
  }
  for (const [rid, r] of Object.entries(S.rsvps)) {
    if (!r.lateAt) continue;
    const m = S.matches[r.matchId]; if (!m) continue;
    if (m.status === "ended" && inMatch(m, r.pid)) continue;
    add(r.pid, { type: "late", mid: m.id, rid, date: m.date, at: r.lateAt, waived: !!r.waived });
  }
  for (const [pid, o] of Object.entries(pen)) {
    const reset = (P(pid) || {}).penaltyResetAt || 0;
    const playedAt = ended.filter(m => inMatch(m, pid)).map(m => m.endedAt || 0);
    for (const it of o.list) {
      it.played = playedAt.filter(t => t > it.at).length;
      it.state = it.waived ? "waived" : it.at <= reset ? "reset" : it.played >= CLEAR_AFTER ? "cleared" : "active";
      if (it.state === "active") o.active++;
    }
    o.list.sort((a, b) => b.at - a.at);
    o.suspended = o.active >= MAX_STRIKES;
  }
  return pen;
}
export const penOf = pid => derive().pen[pid] || { list: [], active: 0, suspended: false };
export const suspended = pid => penOf(pid).suspended;

export function playerStats(list, info) {
  const st = {};
  const get = pid => st[pid] || (st[pid] = { pid, mp: 0, w: 0, d: 0, l: 0, goals: 0, rSum: 0, rN: 0, motm: 0, form: [], hist: [] });
  for (const m of list) {
    const mi = info[m.id];
    for (const side of ["A", "B"]) {
      const mine = side === "A" ? mi.sA : mi.sB, theirs = side === "A" ? mi.sB : mi.sA;
      const res = mine > theirs ? "W" : mine < theirs ? "L" : "D";
      for (const pid of m["team" + side]) {
        const s = get(pid); s.mp++; s[res.toLowerCase()]++;
        const g = m.goals[pid] || 0; s.goals += g;
        const r = mi.avg[pid];
        if (r) { s.rSum += r.avg; s.rN++; }
        if (mi.motm === pid) s.motm++;
        s.form.push(res);
        s.hist.push({ mid: m.id, date: m.date, res, side, goals: g, rating: r ? r.avg : null, sA: mi.sA, sB: mi.sB, motm: mi.motm === pid });
      }
    }
  }
  for (const s of Object.values(st)) { s.avg = s.rN ? s.rSum / s.rN : null; s.winPct = s.mp ? s.w / s.mp * 100 : 0; }
  return st;
}

/* Peer average once a player has been rated, their starting score until then. */
export function ratingOf(pid) {
  const s = derive().all[pid];
  if (s && s.avg != null) return { v: s.avg, peer: true };
  const p = P(pid); const seed = p && Number(p.seed);
  return { v: seed >= 1 ? seed : DEFAULT_SEED, peer: false };
}

/* Who is playing before kick-off: players who said "I'm in", minus no-shows, injured and suspended players. */
export function squadOf(m) {
  const ids = Object.values(S.rsvps).filter(r => r.matchId === m.id && r.status === "in").map(r => r.pid);
  return ids.filter(pid => P(pid) && P(pid).active !== false && !(m.noShows || {})[pid] && !injured(pid) && !suspended(pid))
    .sort((a, b) => P(a).name.localeCompare(P(b).name));
}

export function liveTeams(m) {
  if (m.status !== "setup") return { A: m.teamA, B: m.teamB, unassigned: [] };
  const sq = new Set(squadOf(m));
  const A = m.teamA.filter(p => sq.has(p)), B = m.teamB.filter(p => sq.has(p));
  const unassigned = [...sq].filter(p => !A.includes(p) && !B.includes(p));
  return { A, B, unassigned };
}

export const rosterOf = m => { const t = liveTeams(m); return m.status === "setup" ? squadOf(m) : [...t.A, ...t.B]; };
export const perHead = m => { const n = rosterOf(m).length; return m.cost > 0 && n ? Math.ceil(m.cost / n) : 0; };
