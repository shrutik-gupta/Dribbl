/* Line-ups tab: both teams drawn on a pitch, grouped by position. */
import { P, UI } from "../../../core/state.js";
import { POS } from "../../../config/constants.js";
import { esc, firstName } from "../../../lib/utils.js";
import { derive, liveTeams } from "../../../domain/derive.js";
import { gridOf, posOf, shapeOf } from "../../../domain/formation.js";
import { ICON } from "../../../ui/icons.js";
import { avatar, emptyState, playerBadge, rBadge, teamTag } from "../../../ui/components.js";

export function tabLineups(m, ctl) {
  const t = liveTeams(m), mi = derive().info[m.id];
  if (!t.A.length && !t.B.length) return `<section>${emptyState("clipboard", ctl ? "Make teams on the Squad tab first." : "The host hasn't made teams yet.")}</section>`;

  /* The host can rearrange each team on a grid of slots (see domain/formation.js).
     A team that doesn't fit the grid (4+ in one line) is drawn as plain rows by position. */
  const mid = esc(m.id);
  const canEdit = ctl && (!!gridOf(m, t.A, true) || !!gridOf(m, t.B, true));
  const editing = canEdit && !!UI.editForm[m.id];
  const grids = { A: gridOf(m, t.A, editing), B: gridOf(m, t.B, editing) };

  const player = (pid, side, drag) => {
    const p = P(pid) || { id: pid, name: "?" };
    let badge;
    if (m.status === "ended") { const r = mi.avg[pid]; badge = r ? rBadge(r.avg, { star: mi.motm === pid }) : ""; }
    else badge = playerBadge(pid);
    const g = m.goals[pid] || 0;
    const cv = m["cap" + side] === pid ? '<span class="cvp">C</span>' : m["vc" + side] === pid ? '<span class="cvp">VC</span>' : "";
    const inner = `<span class="avw">${avatar(p, 46)}${badge}${cv}</span><span class="nm">${esc(firstName(p))}</span>`;
    if (drag) return `<div class="pp ${side}" data-p="${esc(pid)}">${inner}</div>`;
    return `<a class="pp ${side}" href="#player-${esc(pid)}">${inner}
      <span class="gl">${g ? ICON.ball.repeat(Math.min(g, 4)) + (g > 4 ? "+" : "") : "&nbsp;"}</span></a>`;
  };

  const half = (side, ids, topHalf) => {
    const order = topHalf ? POS : POS.slice().reverse(), g = grids[side];
    let rows;
    if (!g) rows = order.map(pos => ids.filter(p => posOf(m, p) === pos)).filter(r => r.length).map(r => `<div class="pl-row">${r.map(pid => player(pid, side)).join("")}</div>`);
    else if (editing) rows = order.map(pos => `<div class="pl-row grid"><span class="rowl">${pos}</span>${g[pos].map((pid, c) =>
      `<div class="slot ${pid ? "" : "free"}" data-m="${mid}" data-side="${side}" data-row="${pos}" data-col="${c}">${pid ? player(pid, side, true) : ""}</div>`).join("")}</div>`);
    else rows = order.filter(pos => g[pos].some(Boolean)).map(pos => `<div class="pl-row grid">${g[pos].map(pid => (pid ? player(pid, side) : "<span></span>")).join("")}</div>`);
    return `<div class="half-p ${side}">${rows.join("")}</div>`;
  };

  const caption = (side, ids) => {
    const c = P(m["cap" + side]), shape = grids[side] ? shapeOf(grids[side]) : "";
    return `<div class="pitch-cap"><span>${teamTag(m, side)}${c ? ` <span class="muted small">· Capt. ${esc(c.name)}</span>` : ""}</span><span class="muted small">${shape ? `<b class="num">${shape}</b> · ` : ""}${ids.length} players</span></div>`;
  };

  /* Once the match has started the line-up is final, so it can be exported as an image */
  const tools = [
    canEdit ? `<button class="btn sm ${editing ? "primary" : ""}" data-act="editForm" data-m="${mid}">${editing ? ICON.check + " Done" : "Edit formation"}</button>` : "",
    m.status === "setup" || editing ? "" : `<button class="btn sm accent" data-act="exportLineup" data-m="${mid}">${ICON.image} Export image</button>`
  ].join("");
  const foot = editing ? "Drag a player to any slot on their own half. Dropping on another player swaps the two. The line a player stands on sets their position."
    : m.status === "ended" ? `Badges show each player's rating for this match. ${ICON.star} = man of the match.` : "Badges show each player's current rating. Dashed = starting score.";

  return `<section class="pitch-wrap">${tools ? `<div class="row end">${tools}</div>` : ""}${caption("B", t.B)}
    <div class="pitch ${editing ? "edit" : ""}" role="img" aria-label="Line-ups on a pitch">
      <span class="ln out"></span><span class="ln half"></span><span class="ln circ"></span><span class="ln boxT"></span><span class="ln boxB"></span>
      ${half("B", t.B, true)}${half("A", t.A, false)}</div>
    ${caption("A", t.A)}
    <p class="muted tiny foot">${foot}</p></section>`;
}
