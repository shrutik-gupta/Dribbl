/* Render scheduler. Anything can call render(); the root view is drawn once per frame.
   The root view is injected from main.js so core modules never import feature code. */
let renderer = null;
let rafId = 0;

export function setRenderer(fn) { renderer = fn; }

export function render() {
  if (rafId) return;
  rafId = requestAnimationFrame(() => { rafId = 0; if (renderer) renderer(); });
}
