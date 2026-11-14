/* Match centre: scoreboard header, host tools and the tab bar. Each tab lives in ./tabs. */
import { S, UI, P, isAdmin } from "../../core/state.js";
import { esc, firstName, fmtLong, fmtTime } from "../../lib/utils.js";
import { derive, rosterOf } from "../../domain/derive.js";
import { canControl, inMatch, minuteOf, payOf, teamLabel } from "../../domain/match.js";
import { ICON } from "../../ui/icons.js";
import { emptyState } from "../../ui/components.js";
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
  const status = m.status === "live" ? `<span class="mstat live"><span class="livedot"></span>Live · ${minuteOf(m)}'</span>`
    : m.status === "ended" ? `<span class="mstat">Full time</span>` : `<span class="mstat">Kick-off ${fmtTime(m.time)}</span>`;
  const team = side => {
    const cap = P(m["cap" + side]), label = teamLabel(m, side);
    return `<div class="tm"><span class="crest ${side}">${esc(label.trim()[0].toUpperCase())}</span><span class="tname">${esc(label)}</span>
      <span class="capn">${cap ? "Capt. " + esc(firstName(cap)) : "&nbsp;"}</span></div>`;
  };
  const score = m.status === "setup" ? `<span class="vs">VS</span>` : `<span>${mi.sA}</span><i>-</i><span>${mi.sB}</span>`;
  return `<div class="mhead"><div class="meta">${[fmtLong(m.date), m.venue || "Venue not set", "Host " + ((P(m.hostId) || {}).name || "Unknown")].map(esc).join("<span>·</span>")}</div>
    <div class="score">${team("A")}<div class="big" aria-label="Score ${mi.sA} to ${mi.sB}">${score}</div>${team("B")}</div>
    <div class="mstat-row">${status}</div></div>`;
}

export function vMatch(id) {
  const m = S.matches[id];
  const back = `<a class="back" href="#matches">${ICON.back} Matches</a>`;
  if (!m) return `${back}<section>${emptyState("help", "This match was deleted or doesn't exist.")}</section>`;
  const ctl = canControl(m);
  const tabs = matchTabs(m);
  const tools = ctl ? `<div class="row tools">
      ${m.status !== "ended" ? `<button class="btn sm" data-act="editMatch" data-m="${esc(id)}">Edit details</button>` : ""}
      ${m.status === "ended" ? `<button class="btn sm" data-act="renameTeams" data-m="${esc(id)}">Rename teams</button>` : ""}
      ${m.status === "setup" ? `<button class="btn sm danger" data-act="cancelMatch" data-m="${esc(id)}">Cancel match</button>` : ""}
      ${m.status === "ended" && isAdmin() ? `<button class="btn sm danger" data-act="deleteMatch" data-m="${esc(id)}">Delete match</button>` : ""}
      ${m.hostId !== S.me ? `<span class="muted small">You control this match as admin.</span>` : ""}</div>` : "";
  const body = tabs.cur === "squad" ? tabSquad(m, ctl)
    : tabs.cur === "summary" ? tabSummary(m, ctl)
    : tabs.cur === "lineups" ? tabLineups(m, ctl)
    : tabs.cur === "ratings" ? tabRatings(m)
    : tabPay(m, ctl);
  return `${back}${matchHead(m)}${tools}${tabs.html}${body}`;
}
