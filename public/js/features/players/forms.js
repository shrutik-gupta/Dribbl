/* Form fields shared by the player's own profile and the admin's player editor. */
import { POS, POS_NAME, FITNESS, MIN_PASSWORD } from "../../config/constants.js";
import { esc } from "../../lib/utils.js";
import { avatar, sel } from "../../ui/components.js";

const POS_OPTS = POS.map(x => [x, POS_NAME[x]]);
const POS_OPTIONAL = [["", "None"], ...POS_OPTS];

export function photoField(p) {
  return `<div class="field"><label for="f-photo">Photo</label><div class="photo-pick"><span id="photo-prev">${avatar(p, 56)}</span>
    <input id="f-photo" type="file" accept="image/*" data-change="photo">
    ${p && p.photo ? `<button type="button" class="btn sm ghost" data-act="clearPhoto">Remove</button>` : ""}</div></div>`;
}

export const nicknameField = p => `<div class="field"><label for="f-name">Nickname</label>
    <input id="f-name" name="name" required maxlength="20" value="${esc(p.name || "")}"><span class="hint">The name the squad sees.</span></div>`;

export function positionFields(p) {
  return `<div class="field"><label for="f-position">Primary position</label>${sel("position", POS_OPTS, p.position || "MID", "required")}</div>
    <div class="grid2"><div class="field"><label for="f-position2">Secondary position</label>${sel("position2", POS_OPTIONAL, p.position2 || "")}</div>
      <div class="field"><label for="f-position3">Extra position</label>${sel("position3", POS_OPTIONAL, p.position3 || "")}</div></div>`;
}

export function fitnessFields(p) {
  const i = (p && p.injury) || {};
  return `<div class="grid2"><div class="field"><label for="f-inj">Fitness status</label>${sel("inj", FITNESS, i.status || "fit")}</div>
      <div class="field"><label for="f-ret">Expected back</label><input id="f-ret" name="ret" type="date" value="${esc(i.returnDate || "")}"></div></div>
    <div class="field"><label for="f-note">Fitness note</label><input id="f-note" name="note" maxlength="80" value="${esc(i.note || "")}" placeholder="e.g. Ankle sprain, light jogging only"></div>`;
}

/* Reads the three position dropdowns. Returns {position, position2, position3} or {error}. */
export function readPositions(fd) {
  const position = String(fd.get("position") || "");
  let position2 = String(fd.get("position2") || ""), position3 = String(fd.get("position3") || "");
  if (!POS.includes(position)) return { error: "Pick your primary position." };
  if (position2 && !POS.includes(position2)) position2 = "";
  if (position3 && !POS.includes(position3)) position3 = "";
  if (position2 === position) return { error: "Secondary position is the same as your primary. Pick a different one or None." };
  if (position3 && (position3 === position || position3 === position2)) return { error: "Extra position repeats another one. Pick a different one or None." };
  if (!position2 && position3) { position2 = position3; position3 = ""; }
  return { position, position2, position3 };
}

export const readFitness = fd => ({ status: fd.get("inj") || "fit", note: String(fd.get("note") || "").trim(), returnDate: fd.get("ret") || "" });

/* Admin editor for an existing player. Accounts are created by the players themselves. */
export function adminPlayerForm(p) {
  return `${photoField(p)}${nicknameField(p)}
    <div class="grid2"><div class="field"><label for="f-user">Username</label><input id="f-user" name="username" required autocapitalize="none" maxlength="24" value="${esc(p.username || "")}"></div>
      <div class="field"><label for="f-pass">Reset password</label><input id="f-pass" name="password" type="text" minlength="${MIN_PASSWORD}" placeholder="Leave blank to keep" autocomplete="off"></div></div>
    ${positionFields(p)}
    <div class="grid2"><div class="field"><label for="f-seed">Starting score (1–10)</label><input id="f-seed" name="seed" type="number" min="1" max="10" step="0.5" required value="${esc(p.seed ?? 6)}"><span class="hint">Used until their first peer rating.</span></div>
      <div class="field"><label for="f-tag">Leadership tag</label>${sel("tag", [["", "None"], ["C", "Captain"], ["VC", "Vice captain"]], p.tag || "")}<span class="hint">Suggested to hosts when picking captains.</span></div></div>
    ${fitnessFields(p)}
    <label class="check"><input type="checkbox" name="isAdmin" ${p.isAdmin ? "checked" : ""}> Admin (can edit players and control any match)</label>
    <button class="btn primary wide" type="submit">Save changes</button>`;
}
