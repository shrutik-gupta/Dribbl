/* Hash router. Routes: matches, match-<id>, players, player-<id>, stats, graphs, me, admin */
import { UI } from "./state.js";
import { render } from "./render.js";

const current = () => (location.hash || "").slice(1) || "matches";

export function initRouter() {
  UI.route = current();
  window.addEventListener("hashchange", () => {
    UI.route = current();
    window.scrollTo(0, 0);
    render();
  });
}

export function go(route) {
  UI.route = route;
  if (location.hash.slice(1) !== route) { location.hash = route; return; }
  window.scrollTo(0, 0);
  render();
}
