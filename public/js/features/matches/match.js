/* Match centre: scoreboard header, host tools and the tab bar. Each tab lives in ./tabs. */
import { S, UI, P, isAdmin } from "../../core/state.js";
import { ABANDON_HOURS } from "../../config/constants.js";
import { esc, firstName, fmtDate, fmtLong, fmtTime, ymd } from "../../lib/utils.js";
import { derive, rosterOf, squadOf } from "../../domain/derive.js";
import { CODE_LENGTH } from "../../config/constants.js";
import { canControl, hasAccess, inMatch, isAbandoned, minuteOf, payOf, teamLabel } from "../../domain/match.js";
import { ICON } from "../../ui/icons.js";
import { avatar, emptyState } from "../../ui/components.js";
import { teamCol } from "./teamcol.js";
import { tabSquad } from "./tabs/squad.js";
import { tabSummary } from "./tabs/summary.js";
import { tabLineups } from "./tabs/lineups.js";
import { tabRatings } from "./tabs/ratings.js";
import { tabPay } from "./tabs/pay.js";

function matchTabs(m) {
  const id = m.id, tabs = [];
  tabs.push(m.status === "setup" ? ["squad", "Squad"] : ["summary", "Summary"]);
  tabs.push(["lineups", "Line-ups"]);
  if (m.status === "ended") tabs.push(["ratings", "Ratings"]);
  tabs.push(["pay", "Payments"]);
  let cur = UI.mtab[id];
  if (!tabs.some(t => t[0] === cur)) cur = tabs[0][0];
  const needRate = m.status === "ended" && inMatch(m, S.me) && !S.ratings[id + "_" + S.me];
  const needPay = m.cost > 0 && m.hostId !== S.me && rosterOf(m).includes(S.me) && !payOf(id, S.me);
  const dot = k => ((k === "ratings" && needRate) || (k === "pay" && needPay) ? `<span class="cnt">1</span>` : "");
  return {
    cur,
    html: `<div class="mtabs" role="tablist">${tabs.map(([k, l]) => `<button class="mtab ${cur === k ? "on" : ""}" role="tab" aria-selected="${cur === k}" data-act="mtab" data-m="${esc(id)}" data-t="${k}">${l}${dot(k)}</button>`).join("")}</div>`
  };
}

function matchHead(m) {
  const mi = derive().info[m.id];
  const abd = isAbandoned(m), wasLive = abd && (m.abandon || {}).wasLive;
  const status = abd ? `<span class="mstat abd">${ICON.ban} Abandoned</span>` : m.status === "live" ? `<span class="mstat live"><span class="livedot"></span>Live · ${minuteOf(m)}'</span>`
    : m.status === "ended" ? `<span class="mstat">Full time</span>` : `<span class="mstat">Kick-off ${fmtTime(m.time)}</span>`;
  const team = side => {
    const cap = P(m["cap" + side]), label = teamLabel(m, side);
    return `<div class="tm"><span class="crest ${side}">${esc(label.trim()[0].toUpperCase())}</span><span class="tname">${esc(label)}</span>
      <span class="capn">${cap ? "Capt. " + esc(firstName(cap)) : "&nbsp;"}</span></div>`;
  };
  const score = m.status === "setup" || (abd && !wasLive) ? `<span class="vs">VS</span>` : `<span>${mi.sA}</span><i>-</i><span>${mi.sB}</span>`;
  return `<div class="mhead"><div class="meta">${[fmtLong(m.date), m.venue || "Venue not set", "Host " + ((P(m.hostId) || {}).name || "Unknown"), m.private ? "Private match" : ""].filter(Boolean).map(esc).join("<span>·</span>")}</div>
    <div class="score">${team("A")}<div class="big" aria-label="Score ${mi.sA} to ${mi.sB}">${score}</div>${team("B")}</div>
    <div class="mstat-row">${status}</div></div>`;
}

/* An abandoned match: why, who called it off, and who was due to play */
function abandonedBody(m) {
  const a = m.abandon || { auto: true }, by = P(a.by);
  const why = a.auto ? `It didn't start within ${ABANDON_HOURS} hours of kick-off, so it was abandoned automatically.`
    : `Abandoned by ${esc(by ? by.name : "the host")}${a.at ? " on " + fmtDate(ymd(new Date(a.at))) : ""}${a.wasLive ? (m.startedAt && a.at ? `, ${Math.max(1, Math.floor((a.at - m.startedAt) / 60000) + 1)} minutes in` : " during the match") : ""}.`;
  const note = `<section class="note bad"><b>Match abandoned.</b> ${why}${a.reason ? ` Reason: ${esc(a.reason)}.` : ""} It doesn't count in stats, and no penalties were given.</section>`;
  if (a.wasLive) return `${note}<section><div class="sec-h"><h2>Teams</h2></div><div class="teams">${teamCol(m, "A", "ended", false)}${teamCol(m, "B", "ended", false)}</div></section>`;
  const squad = squadOf(m);
  return `${note}<section><div class="sec-h"><h2>Who was in</h2><span class="muted small num">${squad.length}</span></div>
    ${squad.length ? `<div class="card flush plist">${squad.map(pid => `<a class="it" href="#player-${esc(pid)}">${avatar(P(pid), 34)}<span class="nm">${esc(P(pid).name)}</span></a>`).join("")}</div>`
      : emptyState("players", "Nobody had signed up.")}</section>`;
}

/* Shown instead of a private match until the viewer has its join code */
function lockScreen(m) {
  return `<section class="card lockbox"><span class="empty-ic" aria-hidden="true">${ICON.lock}</span><h2>Private match</h2>
      <p class="muted">${esc(firstName(P(m.hostId)))} is hosting on ${fmtLong(m.date)} at ${fmtTime(m.time)}. Enter the join code to see the squad and join.</p>
      <form data-form="joinCode" class="stack"><input type="hidden" name="mid" value="${esc(m.id)}">
        <div class="field"><label for="f-code">Join code</label><input id="f-code" class="code-in" name="code" required maxlength="${CODE_LENGTH}" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="6 characters"></div>
        <p class="err" id="form-err" role="alert"></p>
        <button class="btn primary wide" type="submit">Unlock match</button></form>
      <p class="muted tiny">Ask the host for the code, or open the match link they shared.</p></section>`;
}

export function vMatch(id) {
  const m = S.matches[id];
  const back = `<a class="back" href="#matches">${ICON.back} Matches</a>`;
  if (!m) return `${back}<section>${emptyState("help", "This match was deleted or doesn't exist.")}</section>`;
  if (!hasAccess(m)) return back + lockScreen(m);
  const ctl = canControl(m);
  if (isAbandoned(m)) {
    const del = ctl && isAdmin() ? `<div class="row tools"><button class="btn sm danger" data-act="deleteMatch" data-m="${esc(id)}">Delete match</button></div>` : "";
    return `${back}${matchHead(m)}${del}${abandonedBody(m)}`;
  }
  const tabs = matchTabs(m);
  const share = `<button class="btn sm accent" data-act="shareMatch" data-m="${esc(id)}">${ICON.share} Share</button>
      ${m.private ? `<button class="btn sm" data-act="copyCode" data-m="${esc(id)}" title="Copy the join code">${ICON.lock} Code <b>${esc(m.code)}</b></button>` : ""}`;
  const tools = `<div class="row tools">${share}${!ctl ? "" : `
      ${m.status !== "ended" ? `<button class="btn sm" data-act="editMatch" data-m="${esc(id)}">Edit details</button>` : ""}
      ${m.status === "ended" ? `<button class="btn sm" data-act="renameTeams" data-m="${esc(id)}">Rename teams</button>` : ""}
      ${m.status !== "ended" ? `<button class="btn sm danger" data-act="abandonMatch" data-m="${esc(id)}">Abandon match</button>` : ""}
      ${m.status !== "live" && isAdmin() ? `<button class="btn sm danger" data-act="deleteMatch" data-m="${esc(id)}">Delete match</button>` : ""}
      ${m.hostId !== S.me ? `<span class="muted small">You control this match as admin.</span>` : ""}`}</div>`;
  const body = tabs.cur === "squad" ? tabSquad(m, ctl)
    : tabs.cur === "summary" ? tabSummary(m, ctl)
    : tabs.cur === "lineups" ? tabLineups(m, ctl)
    : tabs.cur === "ratings" ? tabRatings(m)
    : tabPay(m, ctl);
  return `${back}${matchHead(m)}${tools}${tabs.html}${body}`;
}
