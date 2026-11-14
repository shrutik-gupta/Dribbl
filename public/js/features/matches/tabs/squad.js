/* Squad tab (before kick-off): who's in, host controls, team making. */
import { S, P, activePlayers } from "../../../core/state.js";
import { LATE_HOURS, MAX_STRIKES } from "../../../config/constants.js";
import { esc } from "../../../lib/utils.js";
import { liveTeams, squadOf, suspended } from "../../../domain/derive.js";
import { injured, isLateNow, rsvpOf, teamLabel } from "../../../domain/match.js";
import { avatar, injPill, playerBadge, posBadges } from "../../../ui/components.js";
import { rsvpButtons } from "../list.js";
import { balanceStrip, teamCol } from "../teamcol.js";

export function tabSquad(m, ctl) {
  const mid = esc(m.id);
  const squad = squadOf(m), sqSet = new Set(squad);
  const n = squad.length, split = n >= 2 ? `${Math.ceil(n / 2)} v ${Math.floor(n / 2)}` : "";
  const late = isLateNow(m);
  const others = activePlayers().filter(p => !sqSet.has(p.id));

  const myCard = `<section class="card spread"><div><b>Are you playing?</b><p class="muted small">${late
    ? `Kick-off is less than ${LATE_HOURS} hours away. Dropping out now gives you a penalty.`
    : `Free to drop out until ${LATE_HOURS} hours before kick-off.`}</p></div>${rsvpButtons(m)}</section>`;

  const reason = p => {
    if (suspended(p.id)) return '<span class="pill bad">Suspended</span>';
    if (injured(p.id)) return injPill(p);
    if ((m.noShows || {})[p.id]) return '<span class="pill bad">No-show</span>';
    const r = rsvpOf(m.id, p.id);
    return r && r.status === "out" ? '<span class="pill mute">Out</span>' : '<span class="pill mute">No reply</span>';
  };

  const inRows = squad.map(pid => {
    const p = P(pid), r = rsvpOf(m.id, pid);
    return `<div class="it">${avatar(p, 34)}<span class="nm">${esc(p.name)} ${posBadges(p)} ${(p.injury || {}).status === "recovering" ? injPill(p) : ""}${r && r.by && r.by !== pid ? '<span class="muted tiny">added by host</span>' : ""}</span>
      ${ctl ? `<span class="acts"><button class="toggle warn" data-act="noShow" data-m="${mid}" data-p="${esc(pid)}" title="Didn't turn up: gives a penalty">No-show</button>
        <button class="toggle" data-act="hostRemove" data-m="${mid}" data-p="${esc(pid)}" title="Remove without penalty">Remove</button></span>` : playerBadge(pid)}</div>`;
  }).join("");

  const outRows = others.map(p => {
    const ns = (m.noShows || {})[p.id], blocked = suspended(p.id) || injured(p.id);
    return `<div class="it">${avatar(p, 34)}<span class="nm">${esc(p.name)} ${reason(p)}</span>
      ${ctl ? `<span class="acts">${ns ? `<button class="toggle" data-act="undoNoShow" data-m="${mid}" data-p="${esc(p.id)}">Undo no-show</button>`
        : `<button class="toggle" data-act="hostAdd" data-m="${mid}" data-p="${esc(p.id)}" ${blocked ? "disabled" : ""}>Add</button>`}</span>` : ""}</div>`;
  }).join("");

  const t = liveTeams(m);
  const hasTeams = t.A.length && t.B.length;
  const missing = [];
  if (!hasTeams) missing.push("make teams");
  if (t.unassigned.length) missing.push("place " + t.unassigned.length + " new player" + (t.unassigned.length > 1 ? "s" : ""));
  if (hasTeams && (!t.A.includes(m.capA) || !t.B.includes(m.capB))) missing.push("pick both captains");
  const changed = hasTeams && (t.A.length !== m.teamA.length || t.B.length !== m.teamB.length || t.unassigned.length);

  const unassigned = t.unassigned.length ? `<div class="card flush plist" style="margin-top:10px"><div class="list-h">Not in a team yet</div>${t.unassigned.map(pid =>
    `<div class="it">${avatar(P(pid), 32)}<span class="nm">${esc(P(pid).name)}</span>${ctl ? `<span class="acts">${["A", "B"].map(s =>
      `<button class="toggle" data-act="placeIn" data-side="${s}" data-m="${mid}" data-p="${esc(pid)}">→ ${esc(teamLabel(m, s))}</button>`).join("")}</span>` : ""}</div>`).join("")}</div>` : "";

  return `${myCard}
    <section><div class="sec-h"><h2>Squad</h2><span class="muted small num">${n} in${split ? " · " + split : ""}</span></div>
      <div class="card flush plist"><div class="list-h">Playing (${n})</div>${inRows || `<div class="it muted small">Nobody yet. Players tap "I'm in".</div>`}
        <div class="list-h">Not in (${others.length})</div>${outRows || `<div class="it muted small">Everyone's in.</div>`}</div>
      ${ctl ? `<p class="muted tiny foot"><b>No-show</b> removes the player and gives a penalty. <b>Remove</b> takes them out with no penalty. ${MAX_STRIKES} active penalties suspend a player.</p>` : ""}
    </section>
    ${ctl ? `<section class="row"><button class="btn primary" data-act="makeTeams" data-m="${mid}" ${n < 4 ? "disabled" : ""}>${hasTeams ? "🔀 Rebalance teams" : "⚖️ Make fair teams"}</button>
      <span class="muted small">${n < 4 ? "Needs at least 4 players." : "Balances by rating and position."}</span></section>` : ""}
    ${changed ? `<section class="note warn"><b>The squad changed since teams were made.</b> ${ctl ? "Rebalance, or add the new players by hand below." : "The host will update the teams."}</section>` : ""}
    ${hasTeams || t.unassigned.length ? `<section><div class="sec-h"><h2>Teams</h2></div>${hasTeams ? balanceStrip(m, t) : ""}${unassigned}
      <div class="teams" style="margin-top:10px">${teamCol(m, "A", "setup", ctl, t.A)}${teamCol(m, "B", "setup", ctl, t.B)}</div></section>` : ""}
    ${ctl && hasTeams ? `<section class="card spread"><p class="small muted">${missing.length ? "To start, " + missing.join(", ") + "." : "Teams are set. Start at kick-off."}</p>
      <button class="btn accent" data-act="startMatch" data-m="${mid}" ${missing.length ? "disabled" : ""}>Start match</button></section>` : ""}`;
}
