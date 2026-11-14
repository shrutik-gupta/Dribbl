import { esc } from "../lib/utils.js";

let timer = 0;

export function toast(msg) {
  const root = document.getElementById("toast-root");
  root.innerHTML = `<div class="toast" role="status">${esc(msg)}</div>`;
  clearTimeout(timer);
  timer = setTimeout(() => { root.innerHTML = ""; }, 4200);
}
