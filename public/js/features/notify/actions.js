/* Notifications: the bell panel, and a pop-up when a match is hosted while the app is open. */
import { S, P } from "../../core/state.js";
import { render } from "../../core/render.js";
import { go } from "../../core/router.js";
import { esc, firstName, fmtDate, fmtTime } from "../../lib/utils.js";
import { announcements, markSeen, seenAt } from "../../domain/notify.js";
import { ICON } from "../../ui/icons.js";
import { avatar, emptyState } from "../../ui/components.js";
import { closeModal, openModal } from "../../ui/modal.js";
import { toast } from "../../ui/toast.js";

const MAX_SHOWN = 15;

/* Called on every repaint. The first call just notes which matches exist; after that,
   any match id that wasn't there before was hosted while the app was open. */
let known = null;
export function watchNewMatches() {
  const ids = Object.keys(S.matches);
  if (!known) { known = new Set(ids); return; }
  for (const id of ids) {
    if (known.has(id)) continue;
    known.add(id);
    const m = S.matches[id];
    if (m.hostId !== S.me && m.status === "setup") toast(`${firstName(P(m.hostId))} is hosting a ${m.private ? "private " : ""}match on ${fmtDate(m.date)}.`);
  }
}

export const actions = {
  openNotifs() {
    const since = seenAt(), list = announcements().slice(0, MAX_SHOWN);
    const row = m => `<a class="it" href="#match-${esc(m.id)}" data-act="openNotif" data-m="${esc(m.id)}">${avatar(P(m.hostId), 36)}
        <span class="nt"><span><b>${esc(firstName(P(m.hostId)))}</b> is hosting a ${m.private ? "private " : ""}match</span>
          <span class="muted small">${fmtDate(m.date)} · ${fmtTime(m.time)}${m.venue && !m.private ? " · " + esc(m.venue) : ""}</span></span>
        ${m.private ? `<span class="muted" title="Private match">${ICON.lock}</span>` : ""}${(m.createdAt || 0) > since ? `<span class="pill good">New</span>` : ""}</a>`;
    openModal("Notifications", list.length ? `<div class="card flush plist notifs">${list.map(row).join("")}</div>`
      : emptyState("bell", "Nothing yet. When someone hosts a match it shows up here."));
    markSeen();
    render();   // clears the badge on the bell
  },
  openNotif(el) { closeModal(); go("match-" + el.dataset.m); }
};
