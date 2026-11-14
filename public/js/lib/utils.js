/* Small pure helpers: escaping, ids, dates, formatting. No app state in here. */

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ESC[c]);

export const uid = prefix => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const pad = n => String(n).padStart(2, "0");
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const clone = o => JSON.parse(JSON.stringify(o));

export const ymd = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
export const todayStr = () => ymd(new Date());
export const parseD = s => new Date((s || todayStr()) + "T00:00:00");
export const fmtDate = s => parseD(s).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
export const fmtLong = s => parseD(s).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
export const fmtTime = t => {
  if (!t) return "";
  const [h, mi] = t.split(":").map(Number);
  return ((h % 12) || 12) + ":" + pad(mi) + (h < 12 ? " am" : " pm");
};

export const rupees = n => "₹" + Math.round(n).toLocaleString("en-IN");
export const f1 = n => (n == null || isNaN(n) ? "–" : n.toFixed(1));

export function hashStr(s) {
  let h = 0;
  for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

export function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const firstName = p => (p && p.name ? p.name : "Someone").trim().split(/\s+/)[0];
export const possessive = name => name + "'s";
export const cleanUser = u => String(u || "").trim().toLowerCase();
