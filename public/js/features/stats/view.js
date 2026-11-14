/* League table of every player, sortable, for all time / this year / this month. */
import { UI, P } from "../../core/state.js";
import { render } from "../../core/render.js";
import { esc, f1, parseD } from "../../lib/utils.js";
import { derive, playerStats } from "../../domain/derive.js";
import { avatar, emptyState, posBadge, rBadge } from "../../ui/components.js";

function filterPeriod(list, period) {
  const now = new Date();
  if (period === "year") return list.filter(m => parseD(m.date).getFullYear() === now.getFullYear());
  if (period === "month") return list.filter(m => { const d = parseD(m.date); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); });
  return list;
}

const SORT_KEYS = {
  name: s => P(s.pid).name.toLowerCase(), pos: s => P(s.pid).position,
  mp: s => s.mp, w: s => s.w, d: s => s.d, l: s => s.l, winPct: s => s.winPct,
  goals: s => s.goals, gpm: s => (s.mp ? s.goals / s.mp : 0), avg: s => (s.avg == null ? -1 : s.avg), motm: s => s.motm
};
const PERIODS = [["all", "All time"], ["year", "This year"], ["month", "This month"]];

export function vStats() {
  const D = derive(), U = UI.stats;
  const list = filterPeriod(D.ended, U.period);
  const st = Object.values(playerStats(list, D.info)).filter(s => P(s.pid));
  const goals = list.reduce((s, m) => s + D.info[m.id].sA + D.info[m.id].sB, 0);
  const rated = st.filter(s => s.avg != null).sort((a, b) => b.avg - a.avg);
  const scorers = st.filter(s => s.goals).sort((a, b) => b.goals - a.goals);
  const k = SORT_KEYS[U.sort] || SORT_KEYS.avg;
  st.sort((a, b) => { const x = k(a), y = k(b); return (x < y ? -1 : x > y ? 1 : 0) * U.dir || (b.mp - a.mp); });

  const th = (id, label, cls) => `<th class="${cls || ""} ${U.sort === id ? "on" : ""}" aria-sort="${U.sort === id ? (U.dir > 0 ? "ascending" : "descending") : "none"}"><button data-act="sortStats" data-k="${id}">${label}${U.sort === id ? (U.dir > 0 ? " ↑" : " ↓") : ""}</button></th>`;
  const row = s => {
    const p = P(s.pid);
    return `<tr><td class="l sticky"><a class="who" href="#player-${esc(p.id)}">${avatar(p, 28)}${esc(p.name)}</a></td><td class="l">${posBadge(p.position)}</td>
      <td>${s.mp}</td><td>${s.w}</td><td>${s.d}</td><td>${s.l}</td><td>${Math.round(s.winPct)}%</td><td>${s.goals}</td><td>${f1(s.goals / s.mp)}</td><td>${rBadge(s.avg)}</td><td>${s.motm || ""}</td>
      <td class="l"><span class="form">${s.form.slice(-5).map(r => `<i class="${r}">${r}</i>`).join("")}</span></td></tr>`;
  };

  return `<div class="pagehead"><div><h1>Stats</h1><p class="muted small">Every finished match, rated by the players who played it.</p></div>
      <div class="chips">${PERIODS.map(([id, l]) => `<button class="chip ${U.period === id ? "on" : ""}" data-act="statsPeriod" data-k="${id}">${l}</button>`).join("")}</div></div>
    <section class="tiles">
      <div class="tile"><div class="k">Matches</div><div class="v">${list.length}</div><div class="s">${goals} goals scored</div></div>
      <div class="tile"><div class="k">Goals per match</div><div class="v">${list.length ? f1(goals / list.length) : "–"}</div><div class="s">Both teams</div></div>
      <div class="tile"><div class="k">Top rated</div><div class="v">${rated[0] ? f1(rated[0].avg) : "–"}</div><div class="s">${rated[0] ? esc(P(rated[0].pid).name) : "No ratings yet"}</div></div>
      <div class="tile"><div class="k">Top scorer</div><div class="v">${scorers[0] ? scorers[0].goals : "–"}</div><div class="s">${scorers[0] ? esc(P(scorers[0].pid).name) : "No goals yet"}</div></div>
    </section>
    <section>${st.length ? `<div class="tscroll"><table><thead><tr>${th("name", "Player", "l sticky")}${th("pos", "Pos", "l")}${th("mp", "MP")}${th("w", "W")}${th("d", "D")}${th("l", "L")}${th("winPct", "Win %")}${th("goals", "Goals")}${th("gpm", "G/MP")}${th("avg", "Rating")}${th("motm", "MOTM")}<th class="l">Last 5</th></tr></thead>
      <tbody>${st.map(row).join("")}</tbody></table></div>` : emptyState("stats", "No finished matches in this period.")}</section>`;
}

export const actions = {
  sortStats(el) {
    const k = el.dataset.k, U = UI.stats;
    if (U.sort === k) U.dir = -U.dir; else { U.sort = k; U.dir = (k === "name" || k === "pos") ? 1 : -1; }
    render();
  },
  statsPeriod(el) { UI.stats.period = el.dataset.k; render(); }
};
