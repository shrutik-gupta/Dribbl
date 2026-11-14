/* Home screen: greeting, things to do, live / upcoming / finished matches. */
import { S, P, meP } from "../../core/state.js";
import { MAX_STRIKES, CLEAR_AFTER } from "../../config/constants.js";
import { esc, firstName, fmtDate, fmtLong, fmtTime, parseD, rupees, todayStr } from "../../lib/utils.js";
import { derive, penOf, suspended, squadOf, perHead } from "../../domain/derive.js";
import { hasAccess, inMatch, injured, kickoff, minuteOf, payOf, rsvpOf } from "../../domain/match.js";
import { ICON } from "../../ui/icons.js";
import { avatarStack, emptyState, strikes, teamTag } from "../../ui/components.js";

export function rsvpButtons(m) {
  const r = rsvpOf(m.id, S.me), st = r ? r.status : "";
  if (suspended(S.me)) return `<span class="pill bad">Suspended: you can't join</span>`;
  if (injured(S.me)) return `<span class="pill bad">Marked injured</span>`;
  const btn = (s, label, on) => `<button class="${st === s ? on : ""}" data-act="rsvp" data-s="${s}" data-m="${esc(m.id)}" aria-pressed="${st === s}">${label}</button>`;
  return `<div class="seg" role="group" aria-label="Are you playing?">${btn("in", st === "in" ? ICON.check + " I'm in" : "I'm in", "on-in")}${btn("out", "I'm out", "on-out")}</div>`;
}

function mrow(m) {
  const mi = derive().info[m.id];
  const st = m.status === "live" ? `<span class="st live">${minuteOf(m)}'</span>`
    : m.status === "ended" ? `<span class="st">FT</span>` : `<span class="st">${fmtTime(m.time)}</span>`;
  return `<a class="mrow" href="#match-${esc(m.id)}">${st}<span class="side">${teamTag(m, "A")}</span>
    <span class="sc">${m.status === "setup" ? "vs" : mi.sA + " - " + mi.sB}</span><span class="side b">${teamTag(m, "B")}</span></a>`;
}

function nextCard(m) {
  /* A private match the viewer hasn't unlocked shows only when it is and who hosts it */
  const open = hasAccess(m), d = parseD(m.date);
  const squad = open ? squadOf(m).map(P) : [];
  const sub = open ? [m.private ? "Private" : "", m.venue || "Venue not set", "Host " + firstName(P(m.hostId)), m.cost ? rupees(m.cost) + " turf" : ""].filter(Boolean).join(" · ")
    : "Private match · Host " + firstName(P(m.hostId));
  return `<article class="next ${open ? "" : "locked"}">
    <a class="next-top" href="#match-${esc(m.id)}">
      <span class="datechip"><b>${d.getDate()}</b><span>${d.toLocaleDateString("en-IN", { month: "short" })}</span></span>
      <span class="next-info"><b>${d.toLocaleDateString("en-IN", { weekday: "long" })} · ${fmtTime(m.time)}</b><span>${esc(sub)}</span></span>
      <span class="next-go" aria-hidden="true">${ICON.arrow}</span>
    </a>
    <div class="next-bot">${open ? `
      <span class="crowd">${squad.length ? avatarStack(squad, 5, 30) : ""}<b>${squad.length ? squad.length + " in" : "Be the first in"}</b></span>
      ${rsvpButtons(m)}` : `
      <span class="crowd">${ICON.lock}<b>Join code needed</b></span>
      <a class="btn sm accent" href="#match-${esc(m.id)}">Enter code</a>`}
    </div></article>`;
}

const callout = (icon, title, text, action, bad) => `<section class="card callout ${bad ? "bad" : ""}"><span class="bubble" aria-hidden="true">${ICON[icon]}</span>
    <div class="callout-t"><b>${title}</b><p class="muted small">${text}</p></div>${action || ""}</section>`;

export function vMatches() {
  const all = Object.values(S.matches);
  const upcoming = all.filter(m => m.status === "setup").sort((a, b) => kickoff(a) - kickoff(b));
  /* Scores of private matches are only listed for people who can open them */
  const live = all.filter(m => m.status === "live" && hasAccess(m));
  const ended = all.filter(m => m.status === "ended" && hasAccess(m)).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.endedAt || 0) - (a.endedAt || 0)));
  const toRate = ended.filter(m => inMatch(m, S.me) && !S.ratings[m.id + "_" + S.me]).slice(0, 3);
  const toPay = [...live, ...ended].filter(m => m.cost > 0 && m.hostId !== S.me && inMatch(m, S.me) && !payOf(m.id, S.me)).slice(0, 3);
  const pen = penOf(S.me), info = derive().info;
  const groups = {};
  ended.forEach(m => { (groups[m.date] || (groups[m.date] = [])).push(m); });
  const tagline = live.length ? "There's a game on right now." : upcoming.length ? "Game on. Are you in?" : "Nothing on the calendar. Fancy hosting one?";

  return `<div class="hello"><div><p class="eyebrow">${fmtLong(todayStr())}</p><h1>Hey ${esc(firstName(meP()))}</h1><p class="muted">${tagline}</p></div>
      <button class="btn primary" data-act="hostMatch">${ICON.plus} Host a match</button></div>
    ${pen.suspended ? callout("ban", "You're suspended.", `You have ${pen.active} active penalties, so you can't join matches. Ask the admin to reapprove you.`, "", true)
      : pen.active ? callout("warn", `${pen.active} of ${MAX_STRIKES} penalties`, `${MAX_STRIKES} means suspension. Each one clears after you play ${CLEAR_AFTER} matches.`, strikes(pen.active)) : ""}
    ${toRate.map(m => callout("star", "Rate your teammates", `${fmtDate(m.date)} · ${info[m.id].sA}–${info[m.id].sB}`,
      `<a class="btn accent sm" href="#match-${esc(m.id)}" data-act="openTab" data-m="${esc(m.id)}" data-t="ratings">Rate now</a>`)).join("")}
    ${toPay.map(m => callout("rupee", `Pay ${rupees(perHead(m))} to ${esc(firstName(P(m.hostId)))}`, `Turf on ${fmtDate(m.date)}`,
      `<a class="btn sm" href="#match-${esc(m.id)}" data-act="openTab" data-m="${esc(m.id)}" data-t="pay">Pay now</a>`)).join("")}
    ${live.length ? `<section><div class="sec-h"><h2><span class="livedot"></span>Live</h2></div><div class="mgroup">${live.map(mrow).join("")}</div></section>` : ""}
    <section><div class="sec-h"><h2>Upcoming</h2></div>
      ${upcoming.length ? `<div class="stack">${upcoming.map(nextCard).join("")}</div>`
        : emptyState("calendar", `No upcoming match. Tap <b>Host a match</b> to set up the next game.`)}
    </section>
    <section><div class="sec-h"><h2>Results</h2><span class="muted small">${ended.length} played</span></div>
      ${ended.length ? Object.keys(groups).map(d => `<div class="mgroup"><div class="mg-h"><span>${fmtLong(d)}</span><span class="muted">${esc(groups[d][0].venue || "")}</span></div>${groups[d].map(mrow).join("")}</div>`).join("")
        : emptyState("goal", "No results yet. The first full-time whistle will show up here.")}
    </section>`;
}
