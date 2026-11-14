/* Admin-only actions: edit any player, club settings, penalties. */
import { S, P, clubName } from "../../core/state.js";
import { mutateMatch, savePlayer, setDoc } from "../../core/db.js";
import { DEFAULT_CLUB, MIN_PASSWORD, USERNAME_RE, USERNAME_HELP } from "../../config/constants.js";
import { hashPw } from "../../lib/crypto.js";
import { cleanUser, clone, esc, uid } from "../../lib/utils.js";
import { closeModal, confirmBox, formErr, modal, openModal } from "../../ui/modal.js";
import { toast } from "../../ui/toast.js";
import { adminPlayerForm, readFitness, readPositions } from "../players/forms.js";

export const actions = {
  editClub() {
    openModal("Club settings", `<div class="field"><label for="f-club">Club name</label><input id="f-club" name="club" required maxlength="40" value="${esc(clubName())}"></div>
      <div class="field"><label for="f-dv">Usual turf (pre-fills new matches)</label><input id="f-dv" name="venue" maxlength="60" value="${esc(S.config.venue || "")}"></div>
      <button class="btn primary wide" type="submit">Save</button>`, "club");
  },
  editPlayer(el) {
    const p = P(el.dataset.p);
    openModal("Edit " + p.name, adminPlayerForm(p), "player", { pid: p.id, photo: undefined });
  },
  async waive(el) {
    const { type, m: mid, rid, p: pid } = el.dataset;
    if (!await confirmBox("Remove this penalty?", `It will no longer count against ${(P(pid) || {}).name || "this player"}.`, "Remove penalty")) return;
    if (type === "noshow") mutateMatch(mid, m => { m.waived = m.waived || {}; m.waived[pid] = true; });
    else if (S.rsvps[rid]) setDoc("rsvps/" + rid, Object.assign({}, S.rsvps[rid], { waived: true }));
  },
  async reapprove(el) {
    const p = P(el.dataset.p);
    if (!await confirmBox("Reapprove " + p.name + "?", "All their current penalties are cleared and they can join matches again.", "Reapprove")) return;
    const n = clone(p); n.penaltyResetAt = Date.now();
    if (await savePlayer(p.id, n)) toast(p.name + " is reapproved.");
  }
};

export const forms = {
  async player(fd) {
    const existing = P(modal.state.pid);
    if (!existing) return formErr("This player no longer exists.");
    const name = String(fd.get("name") || "").trim();
    if (name.length < 2) return formErr("Nickname needs at least 2 characters.");
    const username = cleanUser(fd.get("username"));
    if (!USERNAME_RE.test(username)) return formErr("Username: " + USERNAME_HELP);
    if (Object.values(S.players).some(p => p.username === username && p.id !== existing.id)) return formErr("That username is already taken.");
    const pos = readPositions(fd);
    if (pos.error) return formErr(pos.error);
    const seed = Number(fd.get("seed"));
    if (!(seed >= 1 && seed <= 10)) return formErr("Starting score must be between 1 and 10.");
    const pw = String(fd.get("password") || "");
    if (pw && pw.length < MIN_PASSWORD) return formErr(`Password needs at least ${MIN_PASSWORD} characters.`);
    if (existing.id === S.me && !fd.get("isAdmin")) return formErr("You can't remove your own admin access.");
    if (existing.id === S.me && !fd.get("active")) return formErr("You can't deactivate yourself.");

    const p = clone(existing);
    Object.assign(p, pos, { name, username, seed, tag: fd.get("tag"), isAdmin: !!fd.get("isAdmin"), active: !!fd.get("active"), injury: readFitness(fd) });
    if (modal.state.photo !== undefined) p.photo = modal.state.photo;
    if (pw) { p.salt = uid("s"); p.hash = await hashPw(p.salt, pw); }
    if (await savePlayer(p.id, p)) { closeModal(); toast(pw ? `Saved. Tell ${name} their new password.` : "Saved."); }
  },
  async club(fd) {
    const doc = Object.assign({}, S.config, { name: String(fd.get("club")).trim() || DEFAULT_CLUB, venue: String(fd.get("venue") || "").trim() });
    if (await setDoc("config/club", doc)) closeModal();
  }
};
