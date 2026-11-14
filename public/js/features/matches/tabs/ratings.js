/* Ratings tab (after full time): anonymous peer ratings, 1 to 10. */
import { S, UI, P } from "../../../core/state.js";
import { clone, esc } from "../../../lib/utils.js";
import { derive } from "../../../domain/derive.js";
import { inMatch } from "../../../domain/match.js";
import { avatar, emptyState, posBadge, rBadge, teamTag } from "../../../ui/components.js";

function ratingForm(m) {
  const mid = esc(m.id);
  const others = [...m.teamA, ...m.teamB].filter(p => p !== S.me);
  const existing = S.ratings[m.id + "_" + S.me];
  const d = UI.draft[m.id] || (UI.draft[m.id] = existing ? clone(existing.scores || {}) : {});
  const done = others.filter(p => d[p]).length;
  const group = side => m["team" + side].filter(p => p !== S.me).map(pid => {
    const p = P(pid) || { id: pid, name: "Removed player" };
    return `<div class="rrow"><div class="rwho">${avatar(p, 30)}${esc(p.name)} ${posBadge(m.pos[pid] || p.position)}</div>
      <div class="rchips" role="group" aria-label="Rating for ${esc(p.name)}">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v =>
        `<button class="rc ${d[pid] === v ? "on" : ""}" data-act="rate" data-m="${mid}" data-p="${esc(pid)}" data-v="${v}" aria-pressed="${d[pid] === v}">${v}</button>`).join("")}</div></div>`;
  }).join("");
  return `<div class="card"><div class="spread"><h2>Rate the players</h2><span class="pill mute num">${done}/${others.length} rated</span></div>
    <p class="muted small" style="margin-top:6px">1 = poor · 5 = average · 10 = best on the pitch. You can't rate yourself. Nobody sees who gave which rating.</p>
    <h3 class="rteam">${teamTag(m, "A")}</h3>${group("A")}
    <h3 class="rteam">${teamTag(m, "B")}</h3>${group("B")}
    <button class="btn primary wide" style="margin-top:16px" data-act="submitRatings" data-m="${mid}" ${done < others.length ? "disabled" : ""}>${done < others.length ? `Rate everyone to submit (${others.length - done} left)` : "Submit ratings"}</button></div>`;
}

export function tabRatings(m) {
  const mi = derive().info[m.id];
  const players = [...m.teamA, ...m.teamB];
  const played = inMatch(m, S.me);
  const rated = !!S.ratings[m.id + "_" + S.me];
  let rateBlock = "";
  if (played && (!rated || UI.reRate[m.id])) rateBlock = ratingForm(m);
  else if (played) rateBlock = `<div class="card spread"><p><b>Thanks, your ratings are in. 🙌</b> <span class="muted small">They're anonymous.</span></p><button class="btn sm" data-act="reRate" data-m="${esc(m.id)}">Change my ratings</button></div>`;

  const rows = players.map(pid => ({ pid, side: m.teamA.includes(pid) ? "A" : "B", r: mi.avg[pid] }))
    .sort((a, b) => (b.r ? b.r.avg : -1) - (a.r ? a.r.avg : -1));

  return `${rateBlock ? `<section>${rateBlock}</section>` : ""}
    <section><div class="sec-h"><h2>Player ratings</h2><span class="muted small num">${mi.raters} of ${players.length} rated</span></div>
      ${mi.raters ? `<div class="card flush plist">${rows.map(x => {
        const p = P(x.pid) || { name: "Removed player", id: x.pid };
        return `<a class="it" href="#player-${esc(x.pid)}">${avatar(p, 34)}<span class="nm">${esc(p.name)} <span class="muted small">${teamTag(m, x.side)}</span>${m.goals[x.pid] ? `<span class="small">⚽ ${m.goals[x.pid]}</span>` : ""}</span>
          <span class="muted tiny">${x.r ? x.r.n + " votes" : ""}</span>${x.r ? rBadge(x.r.avg, { star: mi.motm === x.pid }) : rBadge(null)}</a>`;
      }).join("")}</div>
        <p class="muted tiny foot">Ratings are anonymous. Man of the match shows once 2 or more players have rated.</p>`
      : emptyState("⭐", "No ratings yet.")}
    </section>`;
}
