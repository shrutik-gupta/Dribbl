/* Event delegation. Views are plain HTML strings, so behaviour is wired through attributes:
     data-act="name"     click   -> actions.name(el, event)
     data-change="name"  change  -> changes.name(el, event)
     <form data-form="name">     -> forms.name(FormData)
   Feature modules export { actions, changes, forms } and main.js registers them here. */
import { formErr } from "../ui/modal.js";

const registry = { actions: {}, changes: {}, forms: {} };

export function register(handlers) {
  for (const kind of Object.keys(registry)) Object.assign(registry[kind], handlers[kind] || {});
}

export function bindEvents() {
  document.addEventListener("click", e => {
    const el = e.target.closest("[data-act]");
    if (!el || el.disabled) return;
    const fn = registry.actions[el.dataset.act];
    if (!fn) return;
    if (el.tagName === "A") e.preventDefault();
    fn(el, e);
  });

  document.addEventListener("change", e => {
    const el = e.target.closest("[data-change]");
    const fn = el && registry.changes[el.dataset.change];
    if (fn) fn(el, e);
  });

  document.addEventListener("submit", async e => {
    const form = e.target.closest("form[data-form]");
    if (!form) return;
    e.preventDefault();
    const fn = registry.forms[form.dataset.form];
    if (!fn) return;
    const btn = form.querySelector("button[type=submit]");
    if (btn) btn.disabled = true;
    formErr("");
    try { await fn(new FormData(form), form); }
    catch (err) { console.error(err); formErr("Something went wrong. Try again."); }
    finally { if (btn && document.body.contains(btn)) btn.disabled = false; }
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && document.getElementById("modal-root").innerHTML) registry.actions.closeModal();
  });
}
