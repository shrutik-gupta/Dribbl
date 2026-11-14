/* Exporting images: a match's line-up (before or after kick-off) and a player's own match card.
   The image is drawn (see cards.js), shown in a modal, then shared or saved from there. */
import { S, P } from "../../core/state.js";
import { firstName } from "../../lib/utils.js";
import { hasAccess, inMatch } from "../../domain/match.js";
import { closeModal, openModal } from "../../ui/modal.js";
import { toast } from "../../ui/toast.js";
import { ICON } from "../../ui/icons.js";
import { lineupCard, statsCard } from "./cards.js";

let cur = null;   // the image on show: { blob, url, name }

const isNative = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const asFile = () => new File([cur.blob], cur.name, { type: "image/png" });
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "player";

function canShareFile() {
  if (isNative()) return true;
  try { return !!navigator.canShare && navigator.canShare({ files: [asFile()] }); } catch (e) { return false; }
}

const base64 = blob => new Promise((resolve, reject) => {
  const fr = new FileReader();
  fr.onload = () => resolve(String(fr.result).split(",")[1]);
  fr.onerror = reject;
  fr.readAsDataURL(blob);
});

async function show(title, name, draw) {
  openModal(title, `<div id="xcard" class="xcard wait" role="status">Making your image…</div>`);
  try {
    const canvas = await draw();
    const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
    if (!blob) throw new Error("no image");
    const slot = document.getElementById("xcard");
    if (!slot) return;                                  // the modal was closed while drawing
    if (cur) URL.revokeObjectURL(cur.url);
    cur = { blob, url: URL.createObjectURL(blob), name };
    const share = canShareFile();
    /* The Android app can't download from a link, so there it is share only
       (the share sheet can also save the image). */
    slot.outerHTML = `<img class="xcard" src="${cur.url}" alt="${title}">
      <div class="stack">
        ${share ? `<button class="btn primary wide" data-act="shareCard">${ICON.share} Share</button>` : ""}
        ${isNative() ? "" : `<a class="btn ${share ? "" : "primary"} wide" href="${cur.url}" download="${name}">${ICON.download} Save image</a>`}
        <p class="muted small" style="text-align:center">Sized for stories (1080 × 1920).</p></div>`;
  } catch (e) {
    console.error(e);
    if (document.getElementById("xcard")) closeModal();
    toast("Couldn't make the image. Try again.");
  }
}

export const actions = {
  exportLineup(el) {
    const m = S.matches[el.dataset.m];
    if (!m || !hasAccess(m)) return;
    show("Line-up image", `dribbl-lineup-${m.date}.png`, () => lineupCard(m));
  },
  exportMyStats(el) {
    const m = S.matches[el.dataset.m];
    if (!m || m.status !== "ended" || !inMatch(m, S.me)) return;
    show("Your match card", `dribbl-${slug(firstName(P(S.me)))}-${m.date}.png`, () => statsCard(m, S.me));
  },
  async shareCard() {
    if (!cur) return;
    try {
      if (isNative()) {
        /* Android app: write the image to the app's cache, then hand that file to the share sheet */
        const { Filesystem, Share } = window.Capacitor.Plugins;
        const file = await Filesystem.writeFile({ path: cur.name, data: await base64(cur.blob), directory: "CACHE" });
        await Share.share({ files: [file.uri], dialogTitle: "Share image" });
      } else {
        await navigator.share({ files: [asFile()] });
      }
    } catch (e) {
      if (/abort|cancel/i.test(String(e && e.name) + " " + String(e && e.message))) return;   // user closed the share sheet
      console.error(e);
      toast(isNative() ? "Couldn't open sharing. Try again." : "Couldn't open sharing. Use Save image instead.");
    }
  }
};
