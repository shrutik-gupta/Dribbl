/* Line-ups tab: both teams drawn on a pitch, grouped by position. */
import { P } from "../../../core/state.js";
import { POS } from "../../../config/constants.js";
import { esc, firstName } from "../../../lib/utils.js";
import { derive, liveTeams } from "../../../domain/derive.js";
import { avatar, emptyState, playerBadge, rBadge, teamTag } from "../../../ui/components.js";

export function tabLineups(m, ctl) {
  const t = liveTeams(m), mi = derive().info[m.id];
  if (!t.A.length && !t.B.length) return `<section>${emptyState("📋", ctl ? "Make teams on the Squad tab first." : "The host hasn't made teams yet.")}</section>`;

  const player = (pid, side) => {
    const p = P(pid) || { id: pid, name: "?" };
    let badge;
    if (m.status === "ended") { const r = mi.avg[pid]; badge = r ? rBadge(r.avg, { star: mi.motm === pid }) : ""; }
    else badge = playerBadge(pid);
    const g = m.goals[pid] || 0;
    const cv = m["cap" + side] === pid ? '<span class="cvp">C</span>' : m["vc" + side] === pid ? '<span class="cvp">VC</span>' : "";
    return `<a class="pp ${side}" href="#player-${esc(pid)}"><span class="avw">${avatar(p, 46)}${badge}${cv}</span><span class="nm">${esc(firstName(p))}</span>
      <span class="gl">${g ? "⚽".repeat(Math.min(g, 4)) + (g > 4 ? "+" : "") : "&nbsp;"}</span></a>`;
  };

  const half = (side, ids, topHalf) => {
    const posOf = pid => m.pos[pid] || (P(pid) || {}).position || "MID";
    const order = topHalf ? POS : POS.slice().reverse();
    const rows = order.map(pos => ids.filter(p => posOf(p) === pos)).filter(r => r.length);
    return `<div class="half-p ${side}">${rows.map(r => `<div class="pl-row">${r.map(pid => player(pid, side)).join("")}</div>`).join("")}</div>`;
  };

  const caption = (side, ids) => {
    const c = P(m["cap" + side]);
    return `<div class="pitch-cap"><span>${teamTag(m, side)}${c ? ` <span class="muted small">· Capt. ${esc(c.name)}</span>` : ""}</span><span class="muted small">${ids.length} players</span></div>`;
  };

  return `<section class="pitch-wrap">${caption("B", t.B)}
    <div class="pitch" role="img" aria-label="Line-ups on a pitch">
      <span class="ln out"></span><span class="ln half"></span><span class="ln circ"></span><span class="ln boxT"></span><span class="ln boxB"></span>
      ${half("B", t.B, true)}${half("A", t.A, false)}</div>
    ${caption("A", t.A)}
    <p class="muted tiny foot">${m.status === "ended" ? "Badges show each player's rating for this match. ★ = man of the match." : "Badges show each player's current rating. Dashed = starting score."}</p></section>`;
}
