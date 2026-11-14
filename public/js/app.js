/* Root view: decides which screen to show for the current state and route. */
import { S, UI, allReady, clubName, isAdmin, isOnboarded, meP } from "./core/state.js";
import { APP_NAME } from "./config/constants.js";
import { shell, statusScreen } from "./ui/shell.js";
import { vAuth, vOnboard } from "./features/auth/views.js";
import { vMatches } from "./features/matches/list.js";
import { vMatch } from "./features/matches/match.js";
import { vPlayers, vPlayer } from "./features/players/views.js";
import { vStats } from "./features/stats/view.js";
import { vGraphs } from "./features/graphs/view.js";
import { vAdmin } from "./features/admin/view.js";
import { destroyCharts, drawCharts } from "./features/graphs/charts.js";
import { watchNewMatches } from "./features/notify/actions.js";

let lastHtml = "";

/* Only touches the DOM when the HTML actually changed, so typing in a form survives live updates. */
function paint(html) {
  if (html === lastHtml) return false;
  destroyCharts();
  lastHtml = html;
  document.getElementById("app").innerHTML = html;
  return true;
}

function route() {
  const r = UI.route;
  if (r.startsWith("match-")) return [vMatch(r.slice(6)), "matches"];
  if (r.startsWith("player-")) return [vPlayer(r.slice(7)), r.slice(7) === S.me ? "me" : "players"];
  if (r === "players") return [vPlayers(), "players"];
  if (r === "stats") return [vStats(), "stats"];
  if (r === "graphs") return [vGraphs(), "graphs"];
  if (r === "me") return [vPlayer(S.me), "me"];
  if (r === "admin" && isAdmin()) return [vAdmin(), "me"];
  return [vMatches(), "matches"];
}

export function renderApp() {
  if (S.bootFail) return paint(statusScreen("warn", "Can't open the club data", "The database isn't connected. Check <b>public/js/config/firebase.config.js</b> (see README.md). If it's already set up, check your connection and reload."));
  if (!S.db || !allReady()) return paint(statusScreen("logo", "Warming up…", S.slow ? "This is taking longer than usual. Check your connection." : "Fetching players and matches."));
  if (S.loadErr) return paint(statusScreen("warn", "Can't read the club data", "The database refused the request. Check the Firestore rules, then reload."));

  const club = clubName();
  document.title = club === APP_NAME ? APP_NAME : club + " · " + APP_NAME;
  const me = meP();
  if (!S.me || !me || me.active === false) return paint(vAuth());
  if (!isOnboarded(me)) return paint(vOnboard());

  watchNewMatches();
  const [body, tab] = route();
  if (paint(shell(body, tab))) drawCharts();
}
