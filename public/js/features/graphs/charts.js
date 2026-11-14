/* Chart.js drawing. Called after the page HTML changes; looks for known <canvas> ids.
   Chart.js is loaded from a <script> tag in index.html (window.Chart). */
import { UI, P } from "../../core/state.js";
import { SERIES } from "../../config/constants.js";
import { fmtDate, pad, parseD, ymd } from "../../lib/utils.js";
import { derive } from "../../domain/derive.js";
import { inMatch } from "../../domain/match.js";

let charts = [];
export function destroyCharts() {
  charts.forEach(c => { try { c.destroy(); } catch (e) {} });
  charts = [];
}

const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const FONT = { family: "Figtree" };

function periodKey(dateStr, gran) {
  const d = parseD(dateStr);
  if (gran === "year") return String(d.getFullYear());
  if (gran === "month") return d.getFullYear() + "-" + pad(d.getMonth() + 1);
  const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return ymd(mon);
}
function periodLabel(key, gran) {
  if (gran === "year") return key;
  if (gran === "month") { const [y, mo] = key.split("-"); return new Date(+y, +mo - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }); }
  return "Wk of " + parseD(key).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function baseOpts(yTitle, yMin, yMax) {
  const ink = css("--muted"), line = css("--line");
  return {
    responsive: true, maintainAspectRatio: false, animation: false, interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { labels: { color: css("--ink"), boxWidth: 12, boxHeight: 12, font: Object.assign({ size: 13 }, FONT) } },
      tooltip: { callbacks: { label: c => `${c.dataset.label}: ${c.parsed.y == null ? "–" : (Number.isInteger(c.parsed.y) ? c.parsed.y : c.parsed.y.toFixed(1))}` } }
    },
    scales: {
      x: { ticks: { color: ink, font: FONT }, grid: { display: false }, border: { color: line } },
      y: { min: yMin, max: yMax, beginAtZero: yMin == null, ticks: { color: ink, precision: 0, font: FONT }, grid: { color: line }, border: { display: false },
        title: { display: !!yTitle, text: yTitle, color: ink, font: FONT } }
    }
  };
}

function drawPlayerChart(canvas, D) {
  const h = (D.all[canvas.dataset.pid] || { hist: [] }).hist.filter(x => x.rating != null);
  const brand = css("--chart");
  const opts = baseOpts("Rating (1–10)", 0, 10);
  opts.plugins.legend = { display: false };
  charts.push(new Chart(canvas, {
    type: "line",
    data: { labels: h.map(x => fmtDate(x.date)), datasets: [{ label: "Match rating", data: h.map(x => +x.rating.toFixed(2)), borderColor: brand, backgroundColor: brand + "22", fill: true, tension: .3, pointRadius: 3, pointHoverRadius: 5 }] },
    options: opts
  }));
}

function drawCompareCharts(D) {
  const G = UI.graphs;
  const keys = [...new Set(D.ended.map(m => periodKey(m.date, G.gran)))].sort();
  const labels = keys.map(k => periodLabel(k, G.gran));
  const byKey = {}; keys.forEach(k => { byKey[k] = []; });
  D.ended.forEach(m => byKey[periodKey(m.date, G.gran)].push(m));

  const ratingSets = [], goalSets = [];
  G.sel.forEach((pid, i) => {
    const col = SERIES[i % SERIES.length], name = P(pid).name;
    const rat = [], gl = [];
    keys.forEach(k => {
      let sum = 0, n = 0, g = 0, played = false;
      byKey[k].forEach(m => {
        if (!inMatch(m, pid)) return;
        played = true; g += m.goals[pid] || 0;
        const r = D.info[m.id].avg[pid];
        if (r) { sum += r.avg; n++; }
      });
      rat.push(n ? +(sum / n).toFixed(2) : null); gl.push(played ? g : null);
    });
    ratingSets.push({ label: name, data: rat, borderColor: col, backgroundColor: col, spanGaps: true, tension: .3, pointRadius: 3, pointHoverRadius: 5 });
    goalSets.push({ label: name, data: gl, backgroundColor: col, borderRadius: 6, maxBarThickness: 22 });
  });

  const el = id => document.getElementById(id);
  charts.push(new Chart(el("ch-rating"), { type: "line", data: { labels, datasets: ratingSets }, options: baseOpts("Rating (1–10)", 0, 10) }));
  charts.push(new Chart(el("ch-goals"), { type: "bar", data: { labels, datasets: goalSets }, options: baseOpts("Goals") }));
  charts.push(new Chart(el("ch-club"), {
    type: "bar",
    data: { labels, datasets: [
      { label: "Matches", data: keys.map(k => byKey[k].length), backgroundColor: SERIES[0], borderRadius: 6, maxBarThickness: 26 },
      { label: "Goals", data: keys.map(k => byKey[k].reduce((s, m) => s + D.info[m.id].sA + D.info[m.id].sB, 0)), backgroundColor: SERIES[1], borderRadius: 6, maxBarThickness: 26 }
    ] },
    options: baseOpts("Count")
  }));
}

export function drawCharts() {
  const boxes = document.querySelectorAll(".chartbox");
  if (!boxes.length) return;
  if (typeof Chart === "undefined") {
    boxes.forEach(b => { b.innerHTML = `<p class="muted small">Charts couldn't load. Check your connection and reload.</p>`; b.style.height = "auto"; });
    return;
  }
  const D = derive();
  const playerCanvas = document.getElementById("ch-player");
  if (playerCanvas) drawPlayerChart(playerCanvas, D);
  if (document.getElementById("ch-rating")) drawCompareCharts(D);
}
