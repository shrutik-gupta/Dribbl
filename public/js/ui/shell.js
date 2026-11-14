/* App frame: brand bar on top, tab navigation (floating dock on phones, in the bar on desktop). */
import { clubName, meP } from "../core/state.js";
import { esc } from "../lib/utils.js";
import { ICON, LOGO } from "./icons.js";
import { avatar } from "./components.js";
import { unseenCount } from "../domain/notify.js";

const TABS = [["matches", "Matches", "ball"], ["players", "Players", "players"], ["stats", "Stats", "stats"], ["graphs", "Graphs", "graphs"], ["me", "Me", "me"]];

export function shell(body, activeTab) {
  const tab = ([id, label, icon]) => `<a class="tab ${activeTab === id ? "on" : ""}" href="#${id}" ${activeTab === id ? 'aria-current="page"' : ""}><span class="tab-ic">${ICON[icon]}</span><span>${label}</span></a>`;
  const unseen = unseenCount();
  return `<header class="top"><div class="wrap top-in">
      <a class="brand" href="#matches"><span class="brand-ball">${LOGO}</span><span class="brand-name">${esc(clubName())}</span></a>
      <nav class="tabs" aria-label="Main">${TABS.map(tab).join("")}</nav>
      <button class="iconbtn ghost bell" data-act="openNotifs" aria-label="Notifications${unseen ? ", " + unseen + " new" : ""}">${ICON.bell}${unseen ? `<span class="badge">${unseen > 9 ? "9+" : unseen}</span>` : ""}</button>
      <a class="me-chip" href="#me" aria-label="My profile">${avatar(meP(), 36)}</a>
    </div></header>
    <main class="wrap page">${body}</main>`;
}

/* Centered single-card screen used for loading and error states. icon: "logo" (loading) or a key of ICON */
export function statusScreen(icon, title, text) {
  return `<div class="status"><div class="status-ball ${icon === "logo" ? "logo-tile" : ""}" aria-hidden="true">${icon === "logo" ? LOGO : ICON[icon]}</div>
    <h2>${esc(title)}</h2><p class="muted">${text}</p></div>`;
}
