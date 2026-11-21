/* Sign-up, log-in, onboarding, log-out and password change. */
import { S, UI, meP } from "../../core/state.js";
import { render } from "../../core/render.js";
import { go } from "../../core/router.js";
import { savePlayer, usernameExists, clubHasPlayers } from "../../core/db.js";
import { SESSION_KEY, PLAYER_VIEW_KEY, MIN_PASSWORD, USERNAME_RE, USERNAME_HELP, DEFAULT_SEED } from "../../config/constants.js";
import { lsSet, lsDel } from "../../lib/storage.js";
import { hashPw } from "../../lib/crypto.js";
import { uid, clone, cleanUser } from "../../lib/utils.js";
import { openModal, closeModal, formErr } from "../../ui/modal.js";
import { toast } from "../../ui/toast.js";
import { readPositions } from "../players/forms.js";

export const SUSPENDED_MSG = "This account is suspended. Ask your club admin to restore it.";

/* After logging in, someone who arrived through a shared match link stays on that match */
function land() {
  if (UI.route.startsWith("match-")) render(); else go("matches");
}

function startSession(pid) {
  S.me = pid;
  lsSet(SESSION_KEY, pid);
}

export const actions = {
  authMode(el) { UI.authMode = el.dataset.k; render(); },
  logout() { S.me = null; lsDel(SESSION_KEY); lsDel(PLAYER_VIEW_KEY); UI.playerView = false; UI.authMode = "login"; go("matches"); render(); },
  changePw() {
    openModal("Change password", `<div class="field"><label for="f-cur">Current password</label><input id="f-cur" name="cur" type="password" required autocomplete="current-password"></div>
      <div class="grid2"><div class="field"><label for="f-new">New password</label><input id="f-new" name="nw" type="password" required minlength="${MIN_PASSWORD}" autocomplete="new-password"></div>
      <div class="field"><label for="f-new2">Repeat new password</label><input id="f-new2" name="nw2" type="password" required minlength="${MIN_PASSWORD}" autocomplete="new-password"></div></div>
      <p class="muted tiny">Don't reuse a password from another site.</p><button class="btn primary wide" type="submit">Change password</button>`, "password");
  }
};

export const forms = {
  /* Step 1: anyone can create an account with a username and password. */
  async register(fd) {
    const username = cleanUser(fd.get("username")), pw = String(fd.get("password") || "");
    if (!USERNAME_RE.test(username)) return formErr("Username: " + USERNAME_HELP);
    if (pw.length < MIN_PASSWORD) return formErr(`Password needs at least ${MIN_PASSWORD} characters.`);
    const takenLocally = Object.values(S.players).some(p => p.username === username);
    if (takenLocally || await usernameExists(username)) return formErr("That username is taken. Try another one.");

    const first = !Object.keys(S.players).length && !(await clubHasPlayers());
    const id = uid("p"), salt = uid("s");
    const player = {
      username, name: username, salt, hash: await hashPw(salt, pw),
      position: "MID", position2: "", position3: "", seed: DEFAULT_SEED, tag: "",
      isAdmin: first, active: true, onboarded: false, injury: { status: "fit" }, photo: "", createdAt: Date.now()
    };
    if (!await savePlayer(id, player)) return;
    S.players[id] = Object.assign({}, player, { id });
    startSession(id);
    land(); render();
  },

  /* Step 2: the player card. */
  async onboard(fd) {
    const nickname = String(fd.get("nickname") || "").trim();
    if (nickname.length < 2) return formErr("Nickname needs at least 2 characters.");
    const pos = readPositions(fd);
    if (pos.error) return formErr(pos.error);
    const p = clone(meP());
    Object.assign(p, pos, { name: nickname, onboarded: true, injury: { status: fd.get("inj") || "fit", note: "", returnDate: "" } });
    if (!await savePlayer(p.id, p)) return;
    S.players[p.id] = p;
    land(); render();
    toast(`Welcome to the squad, ${nickname}!`);
  },

  async login(fd) {
    const username = cleanUser(fd.get("username"));
    const p = Object.values(S.players).find(x => x.username === username);
    const wrong = "Username or password is wrong.";
    if (!p) return formErr(wrong);
    if (await hashPw(p.salt, fd.get("password")) !== p.hash) return formErr(wrong);
    /* Only someone who knows the password is told the account is suspended */
    if (p.active === false) return formErr(SUSPENDED_MSG);
    startSession(p.id);
    land(); render();
  },

  async password(fd) {
    const p = meP();
    if (await hashPw(p.salt, fd.get("cur")) !== p.hash) return formErr("Current password is wrong.");
    if (String(fd.get("nw")).length < MIN_PASSWORD) return formErr(`Password needs at least ${MIN_PASSWORD} characters.`);
    if (fd.get("nw") !== fd.get("nw2")) return formErr("The new passwords don't match.");
    const n = clone(p); n.salt = uid("s"); n.hash = await hashPw(n.salt, fd.get("nw"));
    if (await savePlayer(p.id, n)) { closeModal(); toast("Password changed."); }
  }
};
