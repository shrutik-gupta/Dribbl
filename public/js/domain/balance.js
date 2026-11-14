/* Fair teams: try many random splits, score each by rating gap and position spread, pick one of the best. */
import { P } from "../core/state.js";
import { POS } from "../config/constants.js";
import { shuffle } from "../lib/utils.js";
import { ratingOf } from "./derive.js";

export function balanceTeams(ids, posOf, rateOf, avoidKey) {
  const n = ids.length, sizeA = Math.ceil(n / 2), cands = new Map(), arr = ids.slice();
  const iters = Math.min(4000, 400 + n * 300);
  for (let it = 0; it < iters; it++) {
    shuffle(arr);
    const A = arr.slice(0, sizeA).sort(), B = arr.slice(sizeA).sort();
    const key = A.join(",");
    if (cands.has(key)) continue;
    const sum = t => t.reduce((s, p) => s + rateOf(p), 0);
    let cost = Math.abs(sum(A) - sum(B));
    for (const pos of POS) {
      const ca = A.filter(p => posOf(p) === pos).length, cb = B.filter(p => posOf(p) === pos).length;
      cost += Math.abs(ca - cb) * (pos === "GK" ? 2.5 : 0.7);
    }
    cands.set(key, { A, B, cost, key });
  }
  let sorted = [...cands.values()].sort((a, b) => a.cost - b.cost);
  if (avoidKey && sorted.length > 1) sorted = sorted.filter(c => c.key !== avoidKey);
  const ok = sorted.slice(0, 6).filter(c => c.cost <= sorted[0].cost + 0.6);
  return ok[Math.floor(Math.random() * ok.length)] || sorted[0] || { A: [], B: [] };
}

/* Captain suggestion: players tagged C / VC by the admin first, then the highest rated. */
export function suggestCaps(team) {
  const rate = p => ratingOf(p).v;
  const byRate = team.slice().sort((a, b) => rate(b) - rate(a));
  const tagged = t => byRate.filter(p => (P(p) || {}).tag === t);
  const cap = tagged("C")[0] || byRate[0] || "";
  const vc = tagged("VC").find(p => p !== cap) || tagged("C").find(p => p !== cap) || byRate.find(p => p !== cap) || "";
  return { cap, vc };
}
