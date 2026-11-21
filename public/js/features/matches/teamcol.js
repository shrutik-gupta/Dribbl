/* One team as a list. mode: "setup" (host edits positions, captains), "live"/"ended" (goals). */
import { UI, P } from "../../core/state.js";
import { POS } from "../../config/constants.js";
import { esc, f1, firstName } from "../../lib/utils.js";
import { ratingOf } from "../../domain/derive.js";
import { otherSide, tallyOf, teamLabel } from "../../domain/match.js";
import { ICON } from "../../ui/icons.js";
import { avatar, playerBadge, posBadge } from "../../ui/components.js";

export function teamCol(m, side, mode, ctl, idsIn) {
  const ids = idsIn || m["team" + side];
  const cap = m["cap" + side], vc = m["vc" + side];
  const editGoals = ctl && (mode === "live" || (mode === "ended" && UI.editRes[m.id]));
  const other = esc(teamLabel(m, otherSide(side)));
  const mid = esc(m.id);
  const tally = tallyOf(m), os = otherSide(side);

  const rows = ids.map(pid => {
    const p = P(pid) || { id: pid, name: "Removed player" };
    const pos = m.pos[pid] || p.position;
    /* Goals for this team; goals from before a mid-game switch are noted separately */
    const g = tally.g[side][pid] || 0, og = (tally.og.A[pid] || 0) + (tally.og.B[pid] || 0), gOther = tally.g[os][pid] || 0;
    const note = gOther ? `<span class="gnote">+${gOther} for ${other} before switching</span>` : "";
    const badges = (cap === pid ? '<span class="cv" title="Captain">C</span>' : "") + (vc === pid ? '<span class="cv vc" title="Vice captain">VC</span>' : "");
    const who = `data-m="${mid}" data-p="${esc(pid)}"`;
    let right;
    if (mode === "setup") {
      /* The player's own preferred positions are marked with a dot in the host's dropdown */
      const prefers = [p.position, p.position2, p.position3];
      right = ctl ? `<div class="ctl">
          <select data-change="setPos" ${who} aria-label="Position for ${esc(p.name)}">${POS.map(x => `<option value="${x}" ${x === pos ? "selected" : ""}>${x}${prefers.includes(x) ? " •" : ""}</option>`).join("")}</select>
          <button class="toggle ${cap === pid ? "on" : ""}" data-act="setCap" data-role="cap" data-side="${side}" ${who} title="Make captain">C</button>
          <button class="toggle ${vc === pid ? "on" : ""}" data-act="setCap" data-role="vc" data-side="${side}" ${who} title="Make vice captain">VC</button>
          <button class="toggle ic" data-act="movePlayer" ${who} title="Move to ${other}" aria-label="Move ${esc(p.name)} to ${other}">${ICON.swap}</button>
        </div>${playerBadge(pid)}`
        : `${posBadge(pos)}${playerBadge(pid)}`;
    } else if (editGoals) {
      right = `<div class="goalc"><button class="iconbtn" data-act="goal" data-d="-1" ${who} ${g ? "" : "disabled"} aria-label="Remove goal for ${esc(p.name)}">−</button><b>${g}</b>
        <button class="iconbtn plus" data-act="goal" data-d="1" ${who} aria-label="Add goal for ${esc(p.name)}">+</button>
        <button class="toggle ic" data-act="movePlayer" ${who} title="Move to ${other}" aria-label="Move ${esc(p.name)} to ${other}">${ICON.swap}</button>
        <button class="toggle ic warn" data-act="removeFromTeam" ${who} title="Remove from the match" aria-label="Remove ${esc(p.name)} from the match">${ICON.close}</button></div>`;
    } else {
      right = `${posBadge(pos)}<span class="small gcount goals-n">${g ? ICON.ball + g : ""}${og ? ` <span class="gkind og">${og > 1 ? og + " " : ""}OG</span>` : ""}</span>`;
    }
    return `<div class="prow">${avatar(p, 34)}<span class="nm">${esc(p.name)} ${badges}${note}</span>${right}</div>`;
  }).join("");

  const capP = P(cap);
  const add = editGoals ? `<div class="prow"><button class="btn sm" data-act="addPlayerPicker" data-m="${mid}" data-side="${side}">${ICON.plus} Add player</button></div>` : "";
  return `<div class="team ${side}"><div class="team-h"><h3>${esc(teamLabel(m, side))}</h3>
      <span class="muted small">${ids.length} players${capP && ids.includes(cap) ? " · Capt. " + esc(firstName(capP)) : ""}</span></div>
    ${rows || `<div class="prow muted small">No players</div>`}${add}</div>`;
}

/* Strength bar comparing the two teams' total ratings */
export function balanceStrip(m, t) {
  const tot = ids => ids.reduce((s, p) => s + ratingOf(p).v, 0);
  const a = tot(t.A), b = tot(t.B), pct = a + b ? a / (a + b) * 100 : 50;
  const side = (s, total, n) => `<span><b>${esc(teamLabel(m, s))}</b> <span class="num">${f1(total)}</span> total · <span class="num">${f1(n ? total / n : 0)}</span> avg</span>`;
  return `<div class="card"><div class="spread small">${side("A", a, t.A.length)}${side("B", b, t.B.length)}</div>
    <div class="balance" role="img" aria-label="Team strength split ${Math.round(pct)} to ${100 - Math.round(pct)}"><span style="width:${pct}%"></span><span></span></div></div>`;
}
