/* App-wide constants. Change rules of the game here, not in the views. */

export const POS = ["GK", "DEF", "MID", "FWD"];
export const POS_NAME = { GK: "Goalkeeper", DEF: "Defender", MID: "Midfielder", FWD: "Forward" };

/* Fitness status values are stored on player.injury.status */
export const FITNESS = [
  ["fit", "Fit"],
  ["recovering", "Recovering (can play)"],
  ["injured", "Injured (can't play)"]
];

export const LATE_HOURS = 12;   // dropping out closer to kick-off than this gives a penalty
export const MAX_STRIKES = 3;   // active penalties that suspend a player
export const CLEAR_AFTER = 3;   // matches played before a penalty clears

export const APP_NAME = "Dribbl";
export const APP_URL = "https://dribbl.web.app";   // public address used in shared match links (the Android app has no address of its own)
export const DEFAULT_CLUB = APP_NAME;   // shown until the admin names the club
export const OLD_APP_NAMES = ["Turf Weekly"];  // a club still carrying a previous app name counts as unnamed
export const DEFAULT_SEED = 6;  // starting score until a player gets peer ratings
export const SESSION_KEY = "tw.me";
export const PLAYER_VIEW_KEY = "tw.playerView";   // "1" while an admin uses the app as a normal player
export const APK_URL = APP_URL + "/download/Dribbl.apk";   // latest Android app, published by `npm run apk` + deploy

export const MIN_PASSWORD = 6;
export const USERNAME_RE = /^[a-z0-9._-]{2,24}$/;
export const USERNAME_HELP = "2–24 letters, numbers, dots, dashes or underscores.";
export const TEAM_NAME_MAX = 24;
export const CODE_LENGTH = 6;    // join code of a private match

/* Chart series colours: brand greens and greys first, extra hues only when 5+ players are compared */
export const SERIES = ["#01935c", "#61df6e", "#39423d", "#9aa59f", "#f2b33d", "#3b82c4", "#e2725b", "#8e6fd1"];
