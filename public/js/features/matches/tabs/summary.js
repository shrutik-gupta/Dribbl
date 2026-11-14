/* Summary tab (live and full time): goal timeline, live scoring controls, man of the match. */
import { S, UI, P } from "../../../core/state.js";
import { esc } from "../../../lib/utils.js";
import { derive } from "../../../domain/derive.js";
import { inMatch, teamLabel } from "../../../domain/match.js";
import { avatar, emptyState, rBadge } from "../../../ui/components.js";
import { teamCol } from "../teamcol.js";

function timeline(m) {
  const evs = (m.events || []).slice().sort((a, b) => (a.min ?? 999) - (b.min ?? 999) || a.at - b.at);
  if (!evs.length) return emptyState("🥅", m.status === "live" ? "No goals yet." : "No goal times recorded.");
  let a = 0, b = 0;
  return `<div class="card flush">${evs.map(e => {
    if (e.side === "A") a++; else b++;
    const who = `⚽ <b>${e.pid ? esc((P(e.pid) || {}).name || "Removed player") : "Other goal"}</b>`;
    const sc = `<span class="sc2">${a}-${b}</span>`;
    return `<div class="ev"><div class="l">${e.side === "A" ? who + " " + sc : ""}</div><div class="m"><span>${e.min ? e.min + "'" : "–"}</span></div><div class="r">${e.side === "B" ? sc + " " + who : ""}</div></div>`;
  }).join("")}</div>`;
}

function extrasCtl(m) {
  const mid = esc(m.id);
  const one = side => {
    const name = esc(teamLabel(m, side)), n = m["extra" + side] || 0;
    return `<div class="row"><span><b>${name}</b> other goals</span>
      <button class="iconbtn" data-act="extra" data-d="-1" data-side="${side}" data-m="${mid}" ${n ? "" : "disabled"} aria-label="Remove other goal for ${name}">−</button><b class="num">${n}</b>
      <button class="iconbtn plus" data-act="extra" data-d="1" data-side="${side}" data-m="${mid}" aria-label="Add other goal for ${name}">+</button></div>`;
  };
  return `<div class="card"><div class="extras">${one("A")}${one("B")}</div>
    <p class="muted tiny foot">Tap + next to a player when they score. The minute is saved by itself. Use "other goals" for own goals or unknown scorers.</p></div>`;
}

export function tabSummary(m, ctl) {
  const mid = esc(m.id), mi = derive().info[m.id];
  const teams = mode => `<div class="teams">${teamCol(m, "A", mode, ctl)}${teamCol(m, "B", mode, ctl)}</div>`;

  if (m.status === "live") {
    return `${ctl ? `<section>${extrasCtl(m)}</section><section>${teams("live")}</section>` : ""}
      <section><div class="sec-h"><h2>Goals</h2></div>${timeline(m)}</section>
      ${ctl ? `<section class="card spread"><p class="small muted">When the final whistle goes, end the match. Players can then rate each other.</p><button class="btn accent" data-act="endMatch" data-m="${mid}">End match</button></section>`
        : `<p class="muted small foot">Only the host can update the score and end this match.</p>`}`;
  }

  const motm = P(mi.motm);
  const editing = UI.editRes[m.id];
  const needRate = inMatch(m, S.me) && !S.ratings[m.id + "_" + S.me];
  return `${needRate ? `<section class="card callout"><span class="bubble" aria-hidden="true">⭐</span><div class="callout-t"><b>Rate the players from this match</b></div>
        <button class="btn accent sm" data-act="mtab" data-m="${mid}" data-t="ratings">Rate now</button></section>` : ""}
    ${motm ? `<section class="card motm spread"><div class="row">${avatar(motm, 52)}<div><span class="eyebrow">🏆 Man of the match</span><div class="motm-n">${esc(motm.name)}</div></div></div>${rBadge(mi.avg[mi.motm].avg, { star: true, lg: true })}</section>` : ""}
    <section><div class="sec-h"><h2>Goals</h2>${ctl ? `<button class="btn sm" data-act="editRes" data-m="${mid}">${editing ? "Done editing" : "Fix score or scorers"}</button>` : ""}</div>
      ${editing ? `${extrasCtl(m)}<div style="margin-top:10px">${teams("ended")}</div>` : timeline(m)}</section>`;
}
