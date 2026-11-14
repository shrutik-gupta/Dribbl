/* Hash router. Routes: matches, match-<id>, players, player-<id>, stats, graphs, me, admin.
   A shared link to a private match carries its join code: #match-<id>?code=XXXXXX */
import { UI } from "./state.js";
import { rememberCode } from "../domain/match.js";
import { render } from "./render.js";

function current() {
  const [route, query] = ((location.hash || "").slice(1) || "matches").split("?");
  const code = new URLSearchParams(query || "").get("code");
  if (code && route.startsWith("match-")) {
    rememberCode(route.slice(6), code);
    history.replaceState(null, "", "#" + route);   // keep the code out of the address bar and history
  }
  return route;
}

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
