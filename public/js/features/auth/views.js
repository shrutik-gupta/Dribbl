/* Logged-out screens: log in, sign up, and the player card every new player fills in. */
import { S, UI, clubName, meP } from "../../core/state.js";
import { POS, POS_NAME, FITNESS, MIN_PASSWORD, USERNAME_HELP } from "../../config/constants.js";
import { esc } from "../../lib/utils.js";
import { ICON } from "../../ui/icons.js";
import { sel } from "../../ui/components.js";

const hero = (title, text) => `<div class="auth-hero">
    <div class="auth-pitch" aria-hidden="true"><span class="auth-ball">${ICON.ball}</span></div>
    <h1>${title}</h1><p>${text}</p></div>`;

export function vAuth() {
  const reg = UI.authMode === "register";
  const first = !Object.keys(S.players).length;
  const tab = (id, label) => `<button type="button" role="tab" aria-selected="${UI.authMode === id}" class="${UI.authMode === id ? "on" : ""}" data-act="authMode" data-k="${id}">${label}</button>`;

  const login = `<form data-form="login" class="stack">
      <div class="field"><label for="l-user">Username</label><input id="l-user" name="username" required autocapitalize="none" autocomplete="username" placeholder="e.g. shrutik10"></div>
      <div class="field"><label for="l-pass">Password</label><input id="l-pass" name="password" type="password" required autocomplete="current-password"></div>
      <p class="err" id="form-err" role="alert"></p>
      <button class="btn primary wide lg" type="submit">Log in</button>
      <p class="muted small center">New here? <a href="#" class="link" data-act="authMode" data-k="register">Create an account</a></p>
    </form>`;

  const register = `<form data-form="register" class="stack">
      ${first ? `<div class="note good">You're the first one here, so you'll be the club admin.</div>` : ""}
      <div class="field"><label for="r-user">Pick a username</label><input id="r-user" name="username" required autocapitalize="none" autocomplete="username" maxlength="24" placeholder="e.g. shrutik10">
        <span class="hint">${USERNAME_HELP}</span></div>
      <div class="field"><label for="r-pass">Create a password</label><input id="r-pass" name="password" type="password" required minlength="${MIN_PASSWORD}" autocomplete="new-password">
        <span class="hint">At least ${MIN_PASSWORD} characters. Don't reuse one from another site.</span></div>
      <p class="err" id="form-err" role="alert"></p>
      <button class="btn primary wide lg" type="submit">Create my account ${ICON.arrow}</button>
      <p class="muted small center">Already playing? <a href="#" class="link" data-act="authMode" data-k="login">Log in</a></p>
    </form>`;

  return `<div class="auth">${hero(esc(clubName()), "Your weekly kickabout, sorted. Fair teams, live scores and bragging rights.")}
    <div class="card auth-card">
      <div class="switch" role="tablist" aria-label="Log in or sign up">${tab("login", "Log in")}${tab("register", "Sign up")}</div>
      ${reg ? register : login}
    </div></div>`;
}

/* Step 2 of sign-up. Shown until the player card is saved (player.onboarded becomes true). */
export function vOnboard() {
  const p = meP();
  const posOpts = POS.map(x => [x, POS_NAME[x]]);
  const optional = [["", "None"], ...posOpts];
  return `<div class="auth">${hero("You're in!", "One last thing: fill in your player card so hosts can pick fair teams.")}
    <div class="card auth-card">
      <div class="steps" aria-label="Step 2 of 2"><span class="done"></span><span class="on"></span></div>
      <form data-form="onboard" class="stack">
        <div class="field"><label for="o-nick">Nickname</label><input id="o-nick" name="nickname" required maxlength="20" autocomplete="nickname" placeholder="What everyone shouts when you're on the ball">
          <span class="hint">This is the name the squad sees.</span></div>
        <div class="field"><label for="f-position">Primary position</label>${sel("position", posOpts, "MID", "required")}</div>
        <div class="grid2">
          <div class="field"><label for="f-position2">Secondary position</label>${sel("position2", optional, "")}</div>
          <div class="field"><label for="f-position3">Extra position</label>${sel("position3", optional, "")}</div>
        </div>
        <div class="field"><label for="f-inj">Fitness status</label>${sel("inj", FITNESS, "fit")}
          <span class="hint">You can change this any time from your profile.</span></div>
        <p class="err" id="form-err" role="alert"></p>
        <button class="btn primary wide lg" type="submit">Let's play ${ICON.ball}</button>
        <p class="muted small center">Signed up as <b>${esc(p.username)}</b> · <a href="#" class="link" data-act="logout">Log out</a></p>
      </form>
    </div></div>`;
}
