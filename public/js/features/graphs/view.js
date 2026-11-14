/* Compare players over time: ratings, goals and club activity. Charts are drawn by ./charts.js */
import { UI, P } from "../../core/state.js";
import { render } from "../../core/render.js";
import { SERIES } from "../../config/constants.js";
import { esc } from "../../lib/utils.js";
import { derive } from "../../domain/derive.js";
import { emptyState } from "../../ui/components.js";

const GRANS = [["week", "Weekly"], ["month", "Monthly"], ["year", "Yearly"]];
const MAX_COMPARE = 8;

export function vGraphs() {
  const D = derive(), G = UI.graphs;
  if (!D.ended.length) return `<div class="pagehead"><h1>Graphs</h1></div><section>${emptyState("graphs", "Graphs appear after the first finished match.")}</section>`;
  const withGames = Object.values(D.all).filter(s => P(s.pid)).sort((a, b) => b.mp - a.mp || (b.avg || 0) - (a.avg || 0));
  if (!G.sel) G.sel = withGames.slice(0, 4).map(s => s.pid);
  G.sel = G.sel.filter(id => P(id));
  const chart = (title, id) => `<section><div class="sec-h"><h2>${title}</h2></div><div class="card"><div class="chartbox"><canvas id="${id}"></canvas></div></div></section>`;

  return `<div class="pagehead"><div><h1>Graphs</h1><p class="muted small">Pick players to compare. Each point is one ${G.gran} with at least one match.</p></div>
      <div class="chips">${GRANS.map(([id, l]) => `<button class="chip ${G.gran === id ? "on" : ""}" data-act="gran" data-k="${id}">${l}</button>`).join("")}</div></div>
    <section><div class="chips">${withGames.map(s => {
      const i = G.sel.indexOf(s.pid);
      return `<button class="chip ${i >= 0 ? "on" : ""}" data-act="selPlayer" data-p="${esc(s.pid)}" aria-pressed="${i >= 0}">${i >= 0 ? `<span class="sw" style="background:${SERIES[i % SERIES.length]}"></span>` : ""}${esc(P(s.pid).name)}</button>`;
    }).join("")}</div>
      ${G.sel.length >= MAX_COMPARE ? `<p class="muted tiny foot">Up to ${MAX_COMPARE} players at once.</p>` : ""}</section>
    ${chart("Average rating", "ch-rating")}${chart("Goals", "ch-goals")}${chart("Club activity", "ch-club")}`;
}

export const actions = {
  gran(el) { UI.graphs.gran = el.dataset.k; render(); },
  selPlayer(el) {
    const s = UI.graphs.sel, i = s.indexOf(el.dataset.p);
    if (i >= 0) s.splice(i, 1); else if (s.length < MAX_COMPARE) s.push(el.dataset.p);
    render();
  }
};
