/* Small reusable pieces of HTML: avatars, badges, pills, selects. */
import { POS_NAME, MAX_STRIKES } from "../config/constants.js";
import { esc, f1, fmtDate, hashStr } from "../lib/utils.js";
import { ratingOf, suspended } from "../domain/derive.js";
import { teamLabel } from "../domain/match.js";
import { ICON } from "./icons.js";

/* Initials avatars stay inside the brand palette: [background, text] */
const AVATAR_TONES = [
  ["#01935c", "#ffffff"], ["#61df6e", "#06301c"], ["#232a26", "#ffffff"], ["#0b6b47", "#d9f8dd"],
  ["#a8ecae", "#06301c"], ["#56615b", "#ffffff"], ["#cfd6d2", "#141917"], ["#14b877", "#04130b"]
];

/* Shared with the exported images (features/share), which draw avatars on a canvas */
export const initials = p => ((p && p.name) || "?").trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
export const avatarTone = p => AVATAR_TONES[hashStr(p.id) % AVATAR_TONES.length];

export function avatar(p, size = 36) {
  const box = `width:${size}px;height:${size}px`;
  if (!p) return `<span class="av" style="${box};background:var(--surface-2)"></span>`;
  if (p.photo) return `<img class="av" src="${esc(p.photo)}" alt="" style="${box}">`;
  const ini = initials(p);
  const [bg, ink] = avatarTone(p);
  return `<span class="av" style="${box};background:${bg};color:${ink};font-size:${Math.round(size * .4)}px">${esc(ini)}</span>`;
}

/* Overlapping avatars with a "+3" overflow bubble */
export function avatarStack(players, max = 5, size = 30) {
  const shown = players.slice(0, max), more = players.length - shown.length;
  return `<span class="stackav">${shown.map(p => avatar(p, size)).join("")}${more > 0 ? `<span class="av more" style="width:${size}px;height:${size}px">+${more}</span>` : ""}</span>`;
}

export const posBadge = (pos, alt) => `<span class="pos ${esc(pos)} ${alt ? "alt" : ""}" title="${esc(POS_NAME[pos] || "")}">${esc(pos || "–")}</span>`;

/* Primary position, followed by secondary and extra positions in a quieter style */
export function posBadges(p) {
  if (!p) return "";
  const alts = [p.position2, p.position3].filter(x => x && x !== p.position);
  return posBadge(p.position) + alts.map(x => posBadge(x, true)).join("");
}

export const tagBadge = p => (p && p.tag === "C" ? '<span class="cv" title="Captain">C</span>'
  : p && p.tag === "VC" ? '<span class="cv vc" title="Vice captain">VC</span>' : "");

export function rBadge(v, opts = {}) {
  if (v == null) return `<span class="rb none ${opts.lg ? "lg" : ""}">–</span>`;
  const cls = opts.seed ? "seed" : v >= 8.5 ? "top" : v >= 7 ? "hi" : v >= 6 ? "mid" : "lo";
  const title = opts.seed ? "Starting score (no peer ratings yet)" : "Rating";
  return `<span class="rb ${cls} ${opts.lg ? "lg" : ""}" title="${title}">${f1(v)}${opts.star ? ICON.star : ""}</span>`;
}
export const playerBadge = (pid, lg) => { const r = ratingOf(pid); return rBadge(r.v, { seed: !r.peer, lg }); };

export function injPill(p) {
  const i = (p && p.injury) || {}; const s = i.status || "fit";
  const tip = esc([i.note, i.returnDate ? "Back " + fmtDate(i.returnDate) : ""].filter(Boolean).join(" · "));
  if (s === "injured") return `<span class="pill bad" title="${tip}">Injured</span>`;
  if (s === "recovering") return `<span class="pill warn" title="${tip}">Recovering</span>`;
  return `<span class="pill good">Fit</span>`;
}
export const statusPill = p => (suspended(p.id) ? '<span class="pill bad">Suspended</span>' : injPill(p));

export const strikes = n => `<span class="strikes" aria-label="${n} of ${MAX_STRIKES} penalties">${[0, 1, 2].map(i => `<i class="${i < n ? "on" : ""}"></i>`).join("")}</span>`;

export const teamDot = side => `<span class="dot ${side}"></span>`;
export const teamTag = (m, side) => `${teamDot(side)}${esc(teamLabel(m, side))}`;

/* <select> from [value, label] pairs */
export const sel = (name, opts, cur, attrs = "") => `<select id="f-${name}" name="${name}" ${attrs}>${opts.map(([v, l]) =>
  `<option value="${esc(v)}" ${String(v) === String(cur ?? "") ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;

/* `icon` is a key of ICON */
export const emptyState = (icon, html) => `<div class="empty"><span class="empty-ic" aria-hidden="true">${ICON[icon]}</span><p>${html}</p></div>`;
