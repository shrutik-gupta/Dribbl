/* Admin page: manage the squad. Players create their own accounts; the admin tunes them. */
import { S, clubName, isOnboarded } from "../../core/state.js";
import { esc, f1 } from "../../lib/utils.js";
import { penOf, ratingOf, suspended } from "../../domain/derive.js";
import { ICON } from "../../ui/icons.js";
import { avatar, posBadges, rBadge, statusPill, strikes, tagBadge } from "../../ui/components.js";

/* Suspend / restore and delete buttons for one account (never shown for the admin's own row) */
export const accountBtns = p => {
  const who = `data-p="${esc(p.id)}"`;
  return (p.active === false ? `<button class="btn sm accent" data-act="restorePlayer" ${who}>Restore</button>` : `<button class="btn sm" data-act="suspendPlayer" ${who}>Suspend</button>`)
    + `<button class="btn sm danger" data-act="deletePlayer" ${who}>Delete</button>`;
};

export function vAdmin() {
  const list = Object.values(S.players).sort((a, b) => (a.active === false) - (b.active === false) || a.name.localeCompare(b.name));
  const susp = list.filter(p => suspended(p.id));
  const warned = list.filter(p => !suspended(p.id) && penOf(p.id).active);
  const status = p => (p.active === false ? '<span class="pill bad">Account suspended</span>'
    : !isOnboarded(p) ? '<span class="pill warn">Signing up</span>' : statusPill(p));

  return `<a class="back" href="#me">${ICON.back} Me</a>
    <div class="pagehead"><div><h1>Admin</h1><p class="muted small">${esc(clubName())} · ${list.length} accounts. Set starting scores, captains and who can play.</p></div>
      <button class="btn" data-act="editClub">Club settings</button></div>
    <section class="note good"><b>Growing the squad:</b> share the website link. Friends tap <b>Sign up</b>, pick a username and password, and fill in their player card themselves.</section>
    ${susp.length ? `<section><div class="sec-h"><h2>Suspended for penalties</h2></div><div class="card flush plist">${susp.map(p => `<div class="it">${avatar(p, 34)}<a class="nm" href="#player-${esc(p.id)}">${esc(p.name)} ${strikes(penOf(p.id).active)}</a>
        <span class="acts"><button class="btn sm accent" data-act="reapprove" data-p="${esc(p.id)}">Reapprove</button></span></div>`).join("")}</div>
      <p class="muted tiny foot">Reapproving clears all their current penalties. Their history stays on their profile.</p></section>` : ""}
    ${warned.length ? `<section><div class="sec-h"><h2>On penalties</h2></div><div class="card flush plist">${warned.map(p => `<div class="it">${avatar(p, 34)}<a class="nm" href="#player-${esc(p.id)}">${esc(p.name)}</a>${strikes(penOf(p.id).active)}</div>`).join("")}</div>
      <p class="muted tiny foot">Open a player to remove a penalty given by mistake.</p></section>` : ""}
    <section><div class="sec-h"><h2>Accounts</h2></div><div class="tscroll"><table><thead><tr><th class="l sticky">Player</th><th class="l">Username</th><th class="l">Positions</th><th>Start score</th><th>Rating</th><th class="l">Tag</th><th class="l">Status</th><th></th></tr></thead><tbody>
      ${list.map(p => {
        const r = ratingOf(p.id);
        return `<tr><td class="l sticky"><span class="who">${avatar(p, 28)}${esc(p.name)}${p.isAdmin ? ' <span class="pill mute">Admin</span>' : ""}</span></td>
          <td class="l">${esc(p.username)}</td><td class="l"><span class="row tight nowrap">${posBadges(p)}</span></td><td>${f1(Number(p.seed))}</td><td>${r.peer ? rBadge(r.v) : "–"}</td><td class="l">${tagBadge(p) || ""}</td>
          <td class="l">${status(p)}</td><td><span class="row tight nowrap end"><button class="btn sm" data-act="editPlayer" data-p="${esc(p.id)}">Edit</button>${p.id === S.me ? "" : accountBtns(p)}</span></td></tr>`;
      }).join("")}
    </tbody></table></div>
      <p class="muted tiny foot"><b>Suspend</b> logs a player out and blocks their login until you restore them. <b>Delete</b> removes the account for good; finished matches keep their scores.</p></section>`;
}
