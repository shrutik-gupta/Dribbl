/* Entry point: wire the modules together and start the app. */
import { S, UI } from "./core/state.js";
import { render, setRenderer } from "./core/render.js";
import { initRouter } from "./core/router.js";
import { initDb, subscribe } from "./core/db.js";
import { bindEvents, register } from "./core/events.js";
import { renderApp } from "./app.js";

import * as modal from "./ui/modal.js";
import * as auth from "./features/auth/actions.js";
import * as matches from "./features/matches/actions.js";
import * as players from "./features/players/actions.js";
import * as stats from "./features/stats/view.js";
import * as graphs from "./features/graphs/view.js";
import * as admin from "./features/admin/actions.js";
import * as notify from "./features/notify/actions.js";
import * as share from "./features/share/actions.js";

[modal, auth, matches, players, stats, graphs, admin, notify, share].forEach(register);

/* Android app only: the phone's back button asks here first (see android/.../MainActivity.java).
   Return true when the press was used up, here to close an open modal. */
window.__nativeBack = () => {
  if (!document.getElementById("modal-root").innerHTML) return false;
  modal.actions.closeModal();
  return true;
};

async function boot() {
  setRenderer(renderApp);
  bindEvents();
  initRouter();
  render();

  /* Keep the live minute ticking on an open live match */
  setInterval(() => {
    const m = UI.route.startsWith("match-") && S.matches[UI.route.slice(6)];
    if (m && m.status === "live") render();
  }, 30000);

  if (!await initDb()) { S.bootFail = true; render(); return; }
  subscribe();
}

boot();
