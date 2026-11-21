/* A player's own profile, photo and UPI details. */
import { S, P, meP } from "../../core/state.js";
import { savePlayer, setDoc } from "../../core/db.js";
import { clone, esc } from "../../lib/utils.js";
import { compressImage, compressQR } from "../../lib/images.js";
import { avatar } from "../../ui/components.js";
import { closeModal, formErr, modal, openModal, openPhoto } from "../../ui/modal.js";
import { toast } from "../../ui/toast.js";
import { fitnessFields, nicknameField, photoField, positionFields, readFitness, readPositions } from "./forms.js";

const BAD_IMAGE = "That file isn't an image we can read. Try a JPG or PNG.";

export const actions = {
  viewPhoto(el) { const p = P(el.dataset.p); if (p && p.photo) openPhoto(p.photo, p.name); },
  editProfile() {
    const p = meP();
    openModal("My profile", `${photoField(p)}${nicknameField(p)}${positionFields(p)}${fitnessFields(p)}
      <button class="btn primary wide" type="submit">Save</button>`, "profile", { pid: p.id, photo: undefined });
  },
  payDetails() {
    const info = S.payinfo[S.me] || {};
    openModal("My UPI details", `<p class="muted small">Players see these on the Payments tab of matches you host.</p>
      <div class="field"><label for="f-upi">UPI ID</label><input id="f-upi" name="upi" maxlength="60" autocapitalize="none" value="${esc(info.upiId || "")}" placeholder="e.g. rohan@okhdfcbank"></div>
      <div class="field"><label for="f-qr">UPI QR code</label><div class="photo-pick"><span id="qr-prev">${info.qr ? `<img class="qr" style="width:120px" src="${esc(info.qr)}" alt="Current QR">` : `<span class="muted small">No QR yet</span>`}</span>
        <input id="f-qr" type="file" accept="image/*" data-change="qr">${info.qr ? `<button type="button" class="btn sm ghost" data-act="clearQr">Remove</button>` : ""}</div>
        <span class="hint">Take a screenshot of your QR from GPay, PhonePe or Paytm and upload it.</span></div>
      <button class="btn primary wide" type="submit">Save</button>`, "payinfo", { qr: undefined });
  },
  clearPhoto() { modal.state.photo = ""; document.getElementById("photo-prev").innerHTML = avatar({ id: modal.state.pid || "x", name: "?" }, 56); },
  clearQr() { modal.state.qr = ""; document.getElementById("qr-prev").innerHTML = `<span class="muted small">QR will be removed</span>`; }
};

export const changes = {
  async photo(el) {
    const f = el.files && el.files[0]; if (!f) return;
    try {
      const url = await compressImage(f);
      modal.state.photo = url;
      document.getElementById("photo-prev").innerHTML = `<img class="av" src="${url}" alt="" style="width:56px;height:56px">`;
    } catch (e) { formErr(BAD_IMAGE); }
  },
  async qr(el) {
    const f = el.files && el.files[0]; if (!f) return;
    try {
      const url = await compressQR(f);
      modal.state.qr = url;
      document.getElementById("qr-prev").innerHTML = `<img class="qr" style="width:120px" src="${url}" alt="New QR">`;
    } catch (e) { formErr(BAD_IMAGE); }
  }
};

export const forms = {
  async profile(fd) {
    const name = String(fd.get("name") || "").trim();
    if (name.length < 2) return formErr("Nickname needs at least 2 characters.");
    const pos = readPositions(fd);
    if (pos.error) return formErr(pos.error);
    const p = clone(meP());
    Object.assign(p, pos, { name, injury: readFitness(fd) });
    if (modal.state.photo !== undefined) p.photo = modal.state.photo;
    if (await savePlayer(p.id, p)) { closeModal(); toast("Profile saved."); }
  },
  async payinfo(fd) {
    const cur = S.payinfo[S.me] || {};
    const upiId = String(fd.get("upi") || "").trim();
    if (upiId && !/^[\w.\-]{2,}@[\w.\-]{2,}$/.test(upiId)) return formErr("That doesn't look like a UPI ID. It should look like name@bank.");
    const doc = { upiId, qr: modal.state.qr !== undefined ? modal.state.qr : (cur.qr || ""), updatedAt: Date.now() };
    if (await setDoc("payinfo/" + S.me, doc)) { closeModal(); toast("UPI details saved."); }
  }
};
