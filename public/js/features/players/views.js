/* Squad list and the player profile page (also the "Me" tab). */
import { S, P, activePlayers, isAdmin } from "../../core/state.js";
import { MAX_STRIKES, CLEAR_AFTER, POS_NAME } from "../../config/constants.js";
import { esc, f1, fmtDate } from "../../lib/utils.js";
import { derive, penOf, ratingOf } from "../../domain/derive.js";
import { teamLabel } from "../../domain/match.js";
import { ICON } from "../../ui/icons.js";
import { accountBtns } from "../admin/view.js";
import { avatar, emptyState, playerBadge, posBadges, rBadge, statusPill, strikes, tagBadge, teamDot } from "../../ui/components.js";

export function vPlayers() {
  const st = derive().all;
  const list = activePlayers();
  return `<div class="pagehead"><div><h1>Players</h1><p class="muted small">${list.length} in the squad. Ratings are the average of peer ratings. Dashed badges are starting scores, used until a player gets rated.</p></div></div>
    <section><div class="pgrid">${list.map(p => {
      const s = st[p.id], pen = penOf(p.id);
      return `<a class="pcard" href="#player-${esc(p.id)}">${avatar(p, 52)}<div class="meta"><span class="nm">${esc(p.name)} ${tagBadge(p)}</span>
          <span class="row tight">${posBadges(p)}${statusPill(p)}${pen.active && !pen.suspended ? strikes(pen.active) : ""}</span></div>
        <div class="rt">${playerBadge(p.id, true)}<span class="muted tiny">${s ? s.mp + " played" : "No games"}</span></div></a>`;
    }).join("")}</div></section>`;
}

function penaltyList(pid) {
  const pen = penOf(pid);
  const shown = pen.list.filter(i => i.state === "active" || i.state === "cleared").slice(0, 8);
  if (!shown.length) return "";
  const admin = isAdmin();
  return `<section><div class="sec-h"><h2>Penalties</h2><span class="row small">${strikes(pen.active)} <span class="muted">${pen.active} of ${MAX_STRIKES} active</span></span></div>
    <div class="card flush plist">${shown.map(i => `<div class="it"><span class="nm">${i.type === "noshow" ? "No-show" : "Dropped out late"} <a class="muted small" href="#match-${esc(i.mid)}">${fmtDate(i.date)}</a></span>
      ${i.state === "active" ? `<span class="pill bad">Active · ${i.played}/${CLEAR_AFTER} games played</span>` : `<span class="pill mute">Cleared</span>`}
      ${admin && i.state === "active" ? `<span class="acts"><button class="toggle" data-act="waive" data-type="${i.type}" data-m="${esc(i.mid)}" data-rid="${esc(i.rid || "")}" data-p="${esc(pid)}">Remove</button></span>` : ""}</div>`).join("")}</div>
    <p class="muted tiny foot">Each penalty clears after ${CLEAR_AFTER} more games played. ${MAX_STRIKES} active penalties mean suspension until the admin reapproves.</p></section>`;
}

export function vPlayer(pid) {
  const p = P(pid);
  const back = `<a class="back" href="#players">${ICON.back} Players</a>`;
  if (!p) return `${back}<section>${emptyState("help", "Player not found.")}</section>`;
  const isMe = pid === S.me, admin = isAdmin();
  const s = derive().all[pid] || { mp: 0, w: 0, d: 0, l: 0, goals: 0, motm: 0, hist: [], avg: null, form: [], rN: 0 };
  const r = ratingOf(pid), inj = p.injury || {}, pen = penOf(pid);
  const recent = s.hist.slice().reverse().slice(0, 10);
  const positions = [p.position, p.position2, p.position3].filter(Boolean).map(x => POS_NAME[x]).join(" · ");

  const buttons = [
    isMe ? `<button class="btn sm" data-act="editProfile">Edit my profile</button><button class="btn sm" data-act="payDetails">My UPI details</button><button class="btn sm" data-act="changePw">Change password</button>` : "",
    admin && pen.suspended ? `<button class="btn sm accent" data-act="reapprove" data-p="${esc(pid)}">Reapprove</button>` : "",
    admin ? `<button class="btn sm" data-act="editPlayer" data-p="${esc(pid)}">Edit as admin</button>` : "",
    admin && !isMe ? accountBtns(p) : "",
    isMe && admin ? `<a class="btn sm" href="#admin">Admin</a>` : "",
    isMe ? `<button class="btn sm ghost" data-act="logout">Log out</button>` : ""
  ].join("");

  return `${isMe ? "" : back}
    <section class="phero card">${avatar(p, 88)}<div class="stack tight"><h1>${esc(p.name)} ${tagBadge(p)}</h1>
        <div class="row tight">${posBadges(p)}${statusPill(p)}${p.isAdmin ? '<span class="pill mute">Admin</span>' : ""}</div>
        <p class="small muted">${esc(positions)}${isMe ? ` · @${esc(p.username)}` : ""}</p>
        ${inj.status && inj.status !== "fit" ? `<p class="small muted">${esc(inj.note || "")}${inj.returnDate ? `${inj.note ? " · " : ""}Expected back ${fmtDate(inj.returnDate)}` : ""}</p>` : ""}</div></section>
    ${buttons ? `<div class="row tools">${buttons}</div>` : ""}
    ${p.active === false ? `<section class="note bad"><b>Account suspended.</b> ${esc(p.name)} can't log in or be picked until an admin restores the account.</section>` : ""}
    ${pen.suspended ? `<section class="note bad"><b>Suspended.</b> ${pen.active} active penalties. ${isMe ? "Ask the admin to reapprove you." : "Only the admin can reapprove."}</section>` : ""}
    <section class="tiles">
      <div class="tile"><div class="k">Rating</div><div class="v">${rBadge(r.v, { seed: !r.peer, lg: true })}</div><div class="s">${r.peer ? `Peer average · ${s.rN} rated games` : "Starting score"}</div></div>
      <div class="tile"><div class="k">Played</div><div class="v">${s.mp}</div><div class="s">${s.w}W ${s.d}D ${s.l}L</div></div>
      <div class="tile"><div class="k">Goals</div><div class="v">${s.goals}</div><div class="s">${s.mp ? f1(s.goals / s.mp) + " per game" : "–"}</div></div>
      <div class="tile"><div class="k">Man of the match</div><div class="v">${s.motm}</div><div class="s">${s.mp ? Math.round(s.w / s.mp * 100) + "% win rate" : "–"}</div></div>
    </section>
    ${penaltyList(pid)}
    ${s.hist.some(h => h.rating != null) ? `<section><div class="sec-h"><h2>Rating by match</h2></div><div class="card"><div class="chartbox"><canvas id="ch-player" data-pid="${esc(pid)}" aria-label="Rating by match"></canvas></div></div></section>` : ""}
    <section><div class="sec-h"><h2>Recent matches</h2></div>
      ${recent.length ? `<div class="mgroup">${recent.map(h => {
        const m = S.matches[h.mid];
        return `<a class="mrow hist" href="#match-${esc(h.mid)}"><span class="form"><i class="${h.res}">${h.res}</i></span>
          <span class="side">${fmtDate(h.date)} <span class="muted small">${teamDot(h.side)}${esc(teamLabel(m, h.side))} ${h.sA}-${h.sB}</span></span>
          <span class="small gcount">${h.goals ? ICON.ball + h.goals : ""}</span>${h.rating != null ? rBadge(h.rating, { star: h.motm }) : rBadge(null)}</a>`;
      }).join("")}</div>` : emptyState("ball", "No matches played yet.")}
    </section>`;
}
