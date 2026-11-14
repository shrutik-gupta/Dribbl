/* One modal at a time. `modal.state` carries data between opening a form and submitting it
   (which player is being edited, a freshly picked photo, a confirm promise). */
import { esc } from "../lib/utils.js";
import { ICON } from "./icons.js";

export const modal = { state: {} };

export function openModal(title, inner, formName, state) {
  modal.state = Object.assign({ form: formName }, state || {});
  document.getElementById("modal-root").innerHTML = `<div class="modal-bg" data-act="closeModalBg">
    <div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-h"><h2>${esc(title)}</h2><button class="iconbtn ghost" data-act="closeModal" aria-label="Close">${ICON.close}</button></div>
      ${formName ? `<form data-form="${formName}" class="stack">${inner}<p class="err" id="form-err" role="alert"></p></form>` : inner}
    </div></div>`;
  const first = document.querySelector("#modal-root input:not([type=file]):not([readonly]), #modal-root select, #modal-root button.primary, #modal-root button.accent");
  if (first) first.focus();
}

export function closeModal() {
  document.getElementById("modal-root").innerHTML = "";
  modal.state = {};
}

/* Resolves true when confirmed, false when dismissed. */
export function confirmBox(title, text, okLabel, danger) {
  return new Promise(resolve => {
    openModal(title, `<p>${esc(text)}</p>
      <div class="row end" style="margin-top:18px"><button class="btn" data-act="closeModal">Go back</button>
      <button class="btn ${danger ? "danger" : "primary"}" data-act="confirmOk">${esc(okLabel)}</button></div>`, null, { resolve });
  });
}

/* Shows a message in the nearest open form (modal or auth screen). */
export function formErr(msg) {
  const e = document.getElementById("form-err");
  if (e) e.textContent = msg;
}

export const actions = {
  closeModal() { if (modal.state.resolve) modal.state.resolve(false); closeModal(); },
  closeModalBg(el, e) { if (e.target === el) actions.closeModal(); },
  confirmOk() { const r = modal.state.resolve; closeModal(); if (r) r(true); }
};
