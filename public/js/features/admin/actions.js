/* Admin-only actions: edit, suspend and delete players, club settings, penalties. */
import { S, UI, P, clubName, isAdmin, isRealAdmin } from "../../core/state.js";
import { render } from "../../core/render.js";
import { go } from "../../core/router.js";
import { mutateMatch, restoreDoc, savePlayer, setDoc, softDelete } from "../../core/db.js";
import { DEFAULT_CLUB, PLAYER_VIEW_KEY, MIN_PASSWORD, USERNAME_RE, USERNAME_HELP } from "../../config/constants.js";
import { hashPw } from "../../lib/crypto.js";
import { cleanUser, clone, esc, uid } from "../../lib/utils.js";
import { closeModal, confirmBox, formErr, modal, openModal } from "../../ui/modal.js";
import { toast } from "../../ui/toast.js";
import { lsDel, lsSet } from "../../lib/storage.js";
import { adminPlayerForm, readFitness, readPositions } from "../players/forms.js";

export const actions = {
  /* Player view hides every admin tool so an admin sees the app exactly as a player does.
     Only this device remembers the choice; the account keeps its admin rights. */
  togglePlayerView() {
    if (!isRealAdmin()) return;
    UI.playerView = !UI.playerView;
    if (UI.playerView) lsSet(PLAYER_VIEW_KEY, "1"); else lsDel(PLAYER_VIEW_KEY);
    toast(UI.playerView ? "Player view on. Admin tools are hidden." : "Admin view on.");
    render();
  },
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
  },

  /* Account suspension is the player's `active` flag: a suspended player is logged out,
     can't log in and can't be picked. Not the same as the penalty suspension (3 strikes). */
  async suspendPlayer(el) {
    const pid = el.dataset.p, name = (P(pid) || {}).name;
    if (!isAdmin() || !P(pid)) return;
    if (pid === S.me) return toast("You can't suspend yourself.");
    if (!await confirmBox("Suspend " + name + "?", "They are logged out and can't log in until you restore the account. Their stats and match history stay.", "Suspend account", true)) return;
    const p = P(pid); if (!p) return;
    const n = clone(p); n.active = false; n.suspendedAt = Date.now();
    if (await savePlayer(pid, n)) toast(name + " is suspended.");
  },
  async restorePlayer(el) {
    const p = P(el.dataset.p);
    if (!isAdmin() || !p) return;
    const n = clone(p); n.active = true; delete n.suspendedAt;
    if (await savePlayer(p.id, n)) toast(p.name + " can log in again.");
  },
  async deletePlayer(el) {
    const pid = el.dataset.p, name = (P(pid) || {}).name;
    if (!isAdmin() || !P(pid)) return;
    if (pid === S.me) return toast("You can't delete your own account.");
    if (!await confirmBox("Delete " + name + "?", `Their account, login and UPI details are hidden and they can't log in. Finished matches keep their scores and show "Removed player". You can restore the account from Me > Admin.`, "Delete account", true)) return;
    if (!P(pid)) return;
    /* Their match replies stay: squads only list players who exist, so they vanish from them anyway */
    if (!await softDelete("players/" + pid)) return;
    if (S.payinfo[pid]) softDelete("payinfo/" + pid);
    if (UI.route === "player-" + pid) go("admin");
    toast(name + "'s account is deleted.");
  },

  /* Bring back something soft-deleted */
  async undeleteMatch(el) {
    const id = el.dataset.m;
    if (!isAdmin() || !(S.deleted.matches || {})[id]) return;
    if (await restoreDoc("matches/" + id)) toast("Match restored.");
  },
  async undeletePlayer(el) {
    const pid = el.dataset.p, p = (S.deleted.players || {})[pid];
    if (!isAdmin() || !p) return;
    if (!await restoreDoc("players/" + pid)) return;
    if ((S.deleted.payinfo || {})[pid]) restoreDoc("payinfo/" + pid);
    toast(p.name + "'s account is restored.");
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
    if ([...Object.values(S.players), ...Object.values(S.deleted.players || {})].some(p => p.username === username && p.id !== existing.id)) return formErr("That username is already taken.");
    const pos = readPositions(fd);
    if (pos.error) return formErr(pos.error);
    const seed = Number(fd.get("seed"));
    if (!(seed >= 1 && seed <= 10)) return formErr("Starting score must be between 1 and 10.");
    const pw = String(fd.get("password") || "");
    if (pw && pw.length < MIN_PASSWORD) return formErr(`Password needs at least ${MIN_PASSWORD} characters.`);
    if (existing.id === S.me && !fd.get("isAdmin")) return formErr("You can't remove your own admin access.");

    const p = clone(existing);
    Object.assign(p, pos, { name, username, seed, tag: fd.get("tag"), isAdmin: !!fd.get("isAdmin"), injury: readFitness(fd) });
    if (modal.state.photo !== undefined) p.photo = modal.state.photo;
    if (pw) { p.salt = uid("s"); p.hash = await hashPw(p.salt, pw); }
    if (await savePlayer(p.id, p)) { closeModal(); toast(pw ? `Saved. Tell ${name} their new password.` : "Saved."); }
  },
  async club(fd) {
    const doc = Object.assign({}, S.config, { name: String(fd.get("club")).trim() || DEFAULT_CLUB, venue: String(fd.get("venue") || "").trim() });
    if (await setDoc("config/club", doc)) closeModal();
  }
};
