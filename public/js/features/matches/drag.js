/* Drag and drop for the formation editor on the Line-ups tab.
   Pointer events cover mouse and touch alike (HTML drag and drop doesn't work on phones).
   A player (.pp[data-p]) can be dropped on any slot (.slot) of their own team's half. */
import { placeInSlot } from "./actions.js";

export function bindFormationDrag() {
  let d = null;

  const slotAt = (x, y) => {
    const el = document.elementFromPoint(x, y), s = el && el.closest(".pitch.edit .slot");
    return s && s.dataset.side === d.from.dataset.side ? s : null;
  };
  const setOver = s => {
    if (s === d.over) return;
    if (d.over) d.over.classList.remove("over");
    d.over = s;
    if (s && s !== d.from) s.classList.add("over");
  };
  const stop = () => {
    if (!d) return;
    setOver(null);
    d.el.classList.remove("drag"); d.el.style.transform = "";
    d = null;
  };

  document.addEventListener("pointerdown", e => {
    const el = e.target.closest && e.target.closest(".pitch.edit .pp[data-p]");
    if (!el || d || (e.pointerType === "mouse" && e.button !== 0)) return;
    d = { el, id: e.pointerId, x: e.clientX, y: e.clientY, from: el.closest(".slot"), over: null, moved: false };
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault();   // no text selection or image dragging
  });

  document.addEventListener("pointermove", e => {
    if (!d || e.pointerId !== d.id) return;
    if (!document.body.contains(d.el)) return stop();   // the page was redrawn mid-drag
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 6) return;
    d.moved = true;
    d.el.classList.add("drag");
    d.el.style.transform = `translate(${dx}px, ${dy}px) scale(1.12)`;
    setOver(slotAt(e.clientX, e.clientY));
  });

  document.addEventListener("pointerup", e => {
    if (!d || e.pointerId !== d.id) return;
    const to = d.moved && document.body.contains(d.el) ? slotAt(e.clientX, e.clientY) : null;
    if (to && to !== d.from) placeInSlot(to.dataset.m, to.dataset.side, d.el.dataset.p, to.dataset.row, +to.dataset.col);
    stop();
  });
  document.addEventListener("pointercancel", e => { if (d && e.pointerId === d.id) stop(); });
}
