/* Images people export and post on their stories: the line-up on a pitch, and one player's
   match card. Both are 1080 x 1920 (the story size) and drawn straight onto a canvas, so
   there is no screenshot library and the result looks the same on every phone.
   Each function returns a <canvas>. */
import { P } from "../../core/state.js";
import { APP_NAME, APP_URL, POS, POS_NAME } from "../../config/constants.js";
import { f1, firstName, fmtLong, fmtTime } from "../../lib/utils.js";
import { derive, liveTeams, ratingOf } from "../../domain/derive.js";
import { otherSide, teamLabel } from "../../domain/match.js";
import { gridOf, posOf } from "../../domain/formation.js";
import { avatarTone, initials } from "../../ui/components.js";

const W = 1080, H = 1920, PAD = 60;
const DISPLAY = '"Bricolage Grotesque", "Figtree", system-ui, sans-serif';
const BODY = '"Figtree", system-ui, -apple-system, "Segoe UI", sans-serif';
const C = {
  brand: "#01935c", lime: "#61df6e", limeInk: "#06301c", night: "#0d110f", ink: "#141917",
  white: "#ffffff", mist: "rgba(255, 255, 255, .64)", panel: "rgba(255, 255, 255, .08)",
  teamA: "#61df6e", teamB: "#e9eeeb"
};
const STAR = "M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z";
const BALL = "M12 7.5l3.8 2.8-1.5 4.4H9.7l-1.5-4.4zM12 3v4.5M15.8 10.3l4.6-1.6M14.3 14.7l2.8 4M9.7 14.7l-2.8 4M8.2 10.3L3.6 8.7";
const SITE = APP_URL.replace(/^https?:\/\//, "");

/* ---------- loading ---------- */
function loadImg(src) {
  return new Promise(resolve => {
    if (!src) return resolve(null);
    const img = new Image();
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous";   // keeps the canvas exportable
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function photos(ids) {
  const out = {};
  await Promise.all(ids.map(async pid => { out[pid] = await loadImg((P(pid) || {}).photo); }));
  return out;
}

/* Canvas text falls back to a system font unless the web fonts have finished loading */
function fontsReady() {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  const want = [`800 40px ${DISPLAY}`, `700 40px ${DISPLAY}`, `600 40px ${BODY}`, `700 40px ${BODY}`, `800 40px ${BODY}`];
  const all = Promise.all(want.map(f => document.fonts.load(f))).catch(() => {});
  return Promise.race([all, new Promise(r => setTimeout(r, 2500))]);
}

/* ---------- drawing helpers ---------- */
function newCanvas() {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  ctx.textBaseline = "alphabetic";
  return { c, ctx };
}

function box(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* Draws one line of text. With maxW the text first shrinks (down to 62% of its size),
   then is cut with an ellipsis. Returns the width it took. */
function text(ctx, str, x, y, o) {
  str = String(str ?? "");
  let size = o.size;
  const set = () => { ctx.font = `${o.weight || 700} ${size}px ${o.family || BODY}`; };
  ctx.save();
  if ("letterSpacing" in ctx) ctx.letterSpacing = (o.spacing || 0) + "px";
  set();
  if (o.maxW) {
    while (ctx.measureText(str).width > o.maxW && size > o.size * .62) { size -= 1; set(); }
    if (ctx.measureText(str).width > o.maxW) {
      while (str.length > 1 && ctx.measureText(str + "…").width > o.maxW) str = str.slice(0, -1).trimEnd();
      str += "…";
    }
  }
  ctx.textAlign = o.align || "left";
  ctx.fillStyle = o.fill || C.white;
  if (o.shadow) { ctx.shadowColor = "rgba(0, 0, 0, .5)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2; }
  ctx.fillText(str, x, y);
  const w = ctx.measureText(str).width;
  ctx.restore();
  return w;
}

function measure(ctx, str, o) {
  ctx.save();
  if ("letterSpacing" in ctx) ctx.letterSpacing = (o.spacing || 0) + "px";
  ctx.font = `${o.weight || 700} ${o.size}px ${o.family || BODY}`;
  const w = ctx.measureText(str).width;
  ctx.restore();
  return w;
}

/* An icon from a 24-unit SVG path, with its top-left corner at x, y */
function icon(ctx, d, x, y, size, o) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(size / 24, size / 24);
  const path = new Path2D(d);
  if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(path); }
  if (o.stroke) {
    ctx.strokeStyle = o.stroke; ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.arc(12, 12, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.stroke(path);
  }
  ctx.restore();
}

function drawAvatar(ctx, p, img, cx, cy, r, ring, ringW) {
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, .35)"; ctx.shadowBlur = r * .3; ctx.shadowOffsetY = r * .1;
  ctx.fillStyle = ring;
  ctx.beginPath(); ctx.arc(cx, cy, r + ringW, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
  if (img) {
    const s = Math.max(2 * r / img.width, 2 * r / img.height), w = img.width * s, h = img.height * s;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  } else {
    const [bg, ink] = avatarTone(p);
    ctx.fillStyle = bg; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    ctx.textBaseline = "middle";
    text(ctx, initials(p), cx, cy + r * .04, { size: r * .8, weight: 800, family: DISPLAY, fill: ink, align: "center" });
  }
  ctx.restore();
}

/* A pill centred on cx, cy. `o.star` adds the man-of-the-match star, `o.ball` a football. */
function pill(ctx, label, cx, cy, h, o) {
  const size = h * .6, gap = h * .12, ic = o.star || o.ball ? size * .95 : 0;
  const tw = measure(ctx, label, { size, weight: 800 });
  const w = Math.max(h * 1.35, tw + (ic ? ic + gap : 0) + h * .56);
  const x = cx - w / 2, y = cy - h / 2;
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, .35)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
  box(ctx, x, y, w, h, o.round ? h / 2 : h * .34);
  ctx.fillStyle = o.bg; ctx.fill();
  ctx.restore();
  if (o.dashed) {
    ctx.save();
    ctx.setLineDash([h * .16, h * .12]); ctx.lineWidth = Math.max(2, h * .06); ctx.strokeStyle = o.dashed;
    box(ctx, x, y, w, h, h * .34); ctx.stroke();
    ctx.restore();
  }
  let tx = cx - (tw + (ic ? ic + gap : 0)) / 2;
  if (o.ball) { icon(ctx, BALL, tx, cy - ic / 2, ic, { stroke: o.ink }); tx += ic + gap; }
  ctx.save(); ctx.textBaseline = "middle";
  text(ctx, label, tx, cy + h * .04, { size, weight: 800, fill: o.ink });
  ctx.restore();
  if (o.star) icon(ctx, STAR, tx + tw + gap, cy - ic / 2, ic, { fill: o.ink });
  return w;
}

/* Same colour steps as the rating badges in the app */
function ratingStyle(v, seed) {
  if (seed) return { bg: C.white, ink: C.ink, dashed: "#56615b" };
  if (v >= 8.5) return { bg: C.ink, ink: C.white };
  if (v >= 7) return { bg: C.lime, ink: C.limeInk };
  if (v >= 6) return { bg: "#cfd6d2", ink: C.ink };
  return { bg: "#56615b", ink: C.white };
}

/* Dribbl mark, name and web address: the bottom of every exported image */
function watermark(ctx, logo) {
  const size = 88, gap = 22, y = 1722;
  const nameW = measure(ctx, APP_NAME, { size: 54, weight: 800, family: DISPLAY });
  const siteW = measure(ctx, SITE, { size: 30, weight: 600 });
  const x = (W - (size + gap + Math.max(nameW, siteW))) / 2;
  box(ctx, x, y, size, size, 24); ctx.fillStyle = C.brand; ctx.fill();
  if (logo) ctx.drawImage(logo, x + 10, y + 10, size - 20, size - 20);
  text(ctx, APP_NAME, x + size + gap, y + 44, { size: 54, weight: 800, family: DISPLAY });
  text(ctx, SITE, x + size + gap, y + 82, { size: 30, weight: 600, fill: C.mist });
}

const upper = s => String(s).toUpperCase();
const dateLine = m => [fmtLong(m.date), m.status === "ended" ? "" : fmtTime(m.time), m.venue].filter(Boolean).join("  ·  ");

/* ---------- line-up ---------- */
function drawPitch(ctx, x, y, w, h) {
  ctx.save();
  box(ctx, x, y, w, h, 44); ctx.clip();
  ctx.fillStyle = C.brand; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "rgba(255, 255, 255, .055)";
  for (let sy = y; sy < y + h; sy += 192) ctx.fillRect(x, sy, w, 96);

  const inset = 24, mid = y + h / 2;
  ctx.strokeStyle = "rgba(255, 255, 255, .5)"; ctx.lineWidth = 4;
  box(ctx, x + inset, y + inset, w - 2 * inset, h - 2 * inset, 28); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + inset, mid); ctx.lineTo(x + w - inset, mid); ctx.stroke();
  ctx.beginPath(); ctx.arc(x + w / 2, mid, 92, 0, Math.PI * 2); ctx.stroke();
  const bw = w * .4, bh = 112, bx = x + (w - bw) / 2, r = 20;
  ctx.beginPath(); ctx.moveTo(bx, y + inset); ctx.arcTo(bx, y + inset + bh, bx + bw, y + inset + bh, r);
  ctx.arcTo(bx + bw, y + inset + bh, bx + bw, y + inset, r); ctx.lineTo(bx + bw, y + inset); ctx.stroke();
  const by = y + h - inset;
  ctx.beginPath(); ctx.moveTo(bx, by); ctx.arcTo(bx, by - bh, bx + bw, by - bh, r);
  ctx.arcTo(bx + bw, by - bh, bx + bw, by, r); ctx.lineTo(bx + bw, by); ctx.stroke();
  ctx.restore();
}

export async function lineupCard(m) {
  const t = liveTeams(m), mi = derive().info[m.id], ended = m.status === "ended";
  const [imgs, logo] = await Promise.all([photos([...t.A, ...t.B]), loadImg("assets/logo.png"), fontsReady()]);
  const { c, ctx } = newCanvas();

  ctx.fillStyle = C.night; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, 900);
  glow.addColorStop(0, "rgba(1, 147, 92, .5)"); glow.addColorStop(1, "rgba(1, 147, 92, 0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, 900);

  /* Header: team, score (or VS), team, the same way round as the scoreboard in the app */
  text(ctx, ended ? "FULL TIME" : m.status === "live" ? "MATCH DAY LINE-UPS" : "LINE-UPS", W / 2, 150, { size: 30, weight: 800, fill: C.lime, align: "center", spacing: 5 });
  const mid = ended ? `${mi.sA} – ${mi.sB}` : "VS";
  const midW = text(ctx, mid, W / 2, 262, { size: ended ? 104 : 72, weight: 800, family: DISPLAY, align: "center", fill: ended ? C.white : C.mist });
  const nameW = (W - midW) / 2 - PAD - 36;
  text(ctx, teamLabel(m, "A"), PAD + nameW / 2, 252, { size: 54, weight: 800, family: DISPLAY, align: "center", maxW: nameW });
  text(ctx, teamLabel(m, "B"), W - PAD - nameW / 2, 252, { size: 54, weight: 800, family: DISPLAY, align: "center", maxW: nameW });
  text(ctx, dateLine(m), W / 2, 330, { size: 30, weight: 600, fill: C.mist, align: "center", maxW: W - 2 * PAD });

  const px = PAD, py = 446, pw = W - 2 * PAD, ph = 1150;
  const caption = (side, ids, y) => {
    ctx.fillStyle = C["team" + side]; ctx.beginPath(); ctx.arc(px + 22, y - 12, 12, 0, Math.PI * 2); ctx.fill();
    const count = ids.length + " players", cw = measure(ctx, count, { size: 30, weight: 600 });
    text(ctx, count, px + pw - 8, y, { size: 30, weight: 600, fill: C.mist, align: "right" });
    const cap = P(m["cap" + side]), room = pw - cw - 80;
    const w = text(ctx, teamLabel(m, side), px + 46, y, { size: 36, weight: 800, maxW: cap ? room * .55 : room });
    if (cap) text(ctx, "·  Capt. " + firstName(cap), px + 46 + w + 14, y, { size: 30, weight: 600, fill: C.mist, maxW: room - w - 14 });
  };
  caption("B", t.B, py - 26);
  drawPitch(ctx, px, py, pw, ph);
  caption("A", t.A, py + ph + 56);

  const half = (side, ids, top) => {
    const order = top ? POS : POS.slice().reverse();
    /* Same layout as the Line-ups tab: the host's formation grid when the team fits it */
    const grid = gridOf(m, ids);
    const rows = grid ? order.map(pos => grid[pos]).filter(r => r.some(Boolean))
      : order.map(pos => ids.filter(p => posOf(m, p) === pos)).filter(r => r.length);
    const y0 = top ? py + 44 : py + ph / 2 + 20, hh = ph / 2 - 64, rowH = hh / (rows.length || 1);
    rows.forEach((row, i) => {
      const edge = grid ? pw * .06 : 20, slot = (pw - 2 * edge) / row.length;
      const r = Math.min(62, slot * .3, rowH * .3);
      row.forEach((pid, j) => {
        if (!pid) return;
        const p = P(pid) || { id: pid, name: "?" };
        const cx = px + edge + (j + .5) * slot, cy = y0 + (i + .5) * rowH - r * .42;
        drawAvatar(ctx, p, imgs[pid], cx, cy, r, side === "A" ? C.lime : C.ink, Math.max(4, r * .11));
        text(ctx, firstName(p), cx, cy + r + Math.max(24, r * .6) + 8, { size: Math.max(24, r * .6), weight: 700, align: "center", maxW: slot - 10, shadow: true });

        const bh = Math.max(30, r * .66), bx = cx + r * .98, by = cy - r * .8;
        if (ended) { const a = mi.avg[pid]; if (a) pill(ctx, f1(a.avg), bx, by, bh, Object.assign({ star: mi.motm === pid }, ratingStyle(a.avg))); }
        else { const a = ratingOf(pid); pill(ctx, f1(a.v), bx, by, bh, ratingStyle(a.v, !a.peer)); }

        const tag = m["cap" + side] === pid ? "C" : m["vc" + side] === pid ? "VC" : "";
        if (tag) pill(ctx, tag, cx - r * .86, cy + r * .78, bh * .9, { bg: C.white, ink: C.ink });
        const g = m.goals[pid] || 0;
        if (g) pill(ctx, String(g), cx + r * .9, cy + r * .78, bh * .9, { bg: C.ink, ink: C.white, ball: true, round: true });
      });
    });
  };
  half("B", t.B, true);
  half("A", t.A, false);

  watermark(ctx, logo);
  return c;
}

/* ---------- my match card ---------- */
/* Everything the card says about one player in one finished match */
export function matchFacts(m, pid) {
  const d = derive(), mi = d.info[m.id];
  const side = m.teamA.includes(pid) ? "A" : "B";
  const mine = side === "A" ? mi.sA : mi.sB, theirs = side === "A" ? mi.sB : mi.sA;
  const res = mine > theirs ? "W" : mine < theirs ? "L" : "D";
  const goals = m.goals[pid] || 0, rating = mi.avg[pid] || null;
  const ranked = Object.keys(mi.avg).sort((a, b) => mi.avg[b].avg - mi.avg[a].avg);
  const all = d.all[pid] || { mp: 0, w: 0, goals: 0, avg: null, winPct: 0, hist: [] };

  /* Form and streaks run up to this match, so an older match keeps the story it had on the day */
  const at = all.hist.findIndex(h => h.mid === m.id);
  const upTo = (at < 0 ? all.hist : all.hist.slice(0, at + 1)).map(h => h.res);
  const run = ok => { let n = 0; for (let i = upTo.length - 1; i >= 0 && ok(upTo[i]); i--) n++; return n; };
  const wins = run(r => r === "W"), unbeaten = run(r => r !== "L");
  const best = Math.max(0, ...[...m.teamA, ...m.teamB].map(p => m.goals[p] || 0));
  const pos = posOf(m, pid);

  const tags = [];
  if (mi.motm === pid) tags.push({ label: "Man of the match", star: true });
  if (goals >= 3) tags.push({ label: goals === 3 ? "Hat-trick" : goals + "-goal haul" });
  else if (goals === 2) tags.push({ label: "Brace" });
  if (goals && goals === best) tags.push({ label: "Top scorer" });
  if (m["cap" + side] === pid) tags.push({ label: "Captain" });
  else if (m["vc" + side] === pid) tags.push({ label: "Vice captain" });
  if (theirs === 0 && (pos === "GK" || pos === "DEF")) tags.push({ label: "Clean sheet" });
  if (wins >= 2) tags.push({ label: wins + " wins in a row" });
  else if (unbeaten >= 3) tags.push({ label: "Unbeaten in " + unbeaten });
  if (upTo.length === 1) tags.push({ label: `${APP_NAME} debut` });
  else if (upTo.length) tags.push({ label: "Match #" + upTo.length });

  return {
    side, mine, theirs, res, goals, rating, pos, all, tags: tags.slice(0, 5),
    motm: mi.motm === pid,
    rank: rating ? ranked.indexOf(pid) + 1 : 0, rankOf: ranked.length,
    goalShare: mine ? Math.round(goals / mine * 100) : 0,
    form: upTo.slice(-5)
  };
}

function tile(ctx, x, y, w, h, label, value, sub, star) {
  box(ctx, x, y, w, h, 36); ctx.fillStyle = C.panel; ctx.fill();
  text(ctx, label, x + w / 2, y + 56, { size: 26, weight: 800, fill: C.mist, align: "center", spacing: 3 });
  const vw = text(ctx, value, x + w / 2, y + 156, { size: 100, weight: 800, family: DISPLAY, align: "center", maxW: w - 40 });
  if (star) icon(ctx, STAR, x + w / 2 + vw / 2 + 4, y + 84, 36, { fill: C.lime });
  text(ctx, sub, x + w / 2, y + 202, { size: 26, weight: 600, fill: C.mist, align: "center", maxW: w - 24 });
}

export async function statsCard(m, pid) {
  const p = P(pid) || { id: pid, name: "Player" }, f = matchFacts(m, pid);
  const [img, logo] = await Promise.all([loadImg(p.photo), loadImg("assets/logo.png"), fontsReady()]);
  const { c, ctx } = newCanvas();

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#018051"); bg.addColorStop(.42, "#0a3d29"); bg.addColorStop(1, C.night);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  /* Faint centre circle and halfway line behind the photo */
  ctx.strokeStyle = "rgba(255, 255, 255, .09)"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(W / 2, 380, 290, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 380); ctx.lineTo(W, 380); ctx.stroke();

  text(ctx, upper(dateLine(m)), W / 2, 130, { size: 28, weight: 800, fill: C.mist, align: "center", spacing: 3, maxW: W - 2 * PAD });
  drawAvatar(ctx, p, img, W / 2, 380, 150, C.lime, 10);
  pill(ctx, f.pos, W / 2, 536, 60, { bg: C.lime, ink: C.limeInk, round: true });
  text(ctx, p.name, W / 2, 670, { size: 92, weight: 800, family: DISPLAY, align: "center", maxW: W - 2 * PAD });
  text(ctx, `${POS_NAME[f.pos] || f.pos}  ·  ${teamLabel(m, f.side)}`, W / 2, 728, { size: 34, weight: 600, fill: C.mist, align: "center", maxW: W - 2 * PAD });

  /* Result */
  const ry = 776, rh = 240;
  box(ctx, PAD, ry, W - 2 * PAD, rh, 40); ctx.fillStyle = C.panel; ctx.fill();
  text(ctx, "FULL TIME", PAD + 44, ry + 64, { size: 26, weight: 800, fill: C.mist, spacing: 3 });
  text(ctx, f.res === "W" ? "WON" : f.res === "L" ? "LOST" : "DRAW", PAD + 40, ry + 186, { size: 128, weight: 800, family: DISPLAY, fill: f.res === "W" ? C.lime : C.white });
  text(ctx, `${f.mine} – ${f.theirs}`, W - PAD - 44, ry + 136, { size: 112, weight: 800, family: DISPLAY, align: "right" });
  text(ctx, "vs " + teamLabel(m, otherSide(f.side)), W - PAD - 44, ry + 192, { size: 30, weight: 600, fill: C.mist, align: "right", maxW: 420 });

  /* This match */
  const ty = ry + rh + 24, th = 232, gap = 24, tw = (W - 2 * PAD - 2 * gap) / 3;
  tile(ctx, PAD, ty, tw, th, f.goals === 1 ? "GOAL" : "GOALS", String(f.goals), f.goals ? f.goalShare + "% of team goals" : "this match");
  tile(ctx, PAD + tw + gap, ty, tw, th, "RATING", f.rating ? f1(f.rating.avg) : "–", f.rating ? `from ${f.rating.n} ${f.rating.n === 1 ? "vote" : "votes"}` : "ratings pending", f.motm);
  tile(ctx, PAD + 2 * (tw + gap), ty, tw, th, "RANK", f.rank ? "#" + f.rank : "–", f.rank ? `of ${f.rankOf} on the pitch` : "after ratings");

  /* Highlights: centred chips, two rows at most */
  const ch = 64, cgap = 14, chipW = t => measure(ctx, t.label, { size: ch * .6, weight: 800 }) + (t.star ? ch * .57 + ch * .12 : 0) + ch * .56;
  const rows = [[]];
  for (const t of f.tags) {
    const row = rows[rows.length - 1], used = row.reduce((s, x) => s + chipW(x) + cgap, 0);
    if (row.length && used + chipW(t) > W - 2 * PAD) { if (rows.length === 2) break; rows.push([t]); }
    else row.push(t);
  }
  const cy0 = ty + th + 40 + ch / 2 + (rows.length === 1 ? 39 : 0);
  rows.forEach((row, i) => {
    let x = (W - (row.reduce((s, t) => s + chipW(t), 0) + cgap * (row.length - 1))) / 2;
    for (const t of row) {
      const w = chipW(t), first = t === f.tags[0] && (t.star || f.res === "W");
      pill(ctx, t.label, x + w / 2, cy0 + i * (ch + cgap), ch, { bg: first ? C.lime : "rgba(255, 255, 255, .14)", ink: first ? C.limeInk : C.white, star: t.star, round: true });
      x += w + cgap;
    }
  });

  /* All-time numbers */
  const sy = 1500, a = f.all;
  text(ctx, `ALL TIME ON ${upper(APP_NAME)}`, W / 2, sy, { size: 26, weight: 800, fill: C.mist, align: "center", spacing: 3 });
  const cols = [["Matches", String(a.mp)], ["Win rate", Math.round(a.winPct) + "%"], ["Goals", String(a.goals)], ["Avg rating", f1(a.avg)], ["Form", null]];
  const cw = (W - 2 * PAD) / cols.length;
  cols.forEach(([label, value], i) => {
    const cx = PAD + (i + .5) * cw;
    if (value != null) text(ctx, value, cx, sy + 92, { size: 60, weight: 800, family: DISPLAY, align: "center", maxW: cw - 16 });
    else {
      const d = 32, g = 6, n = f.form.length; let x = cx - (n * d + (n - 1) * g) / 2;
      for (const r of f.form) {
        ctx.fillStyle = r === "W" ? C.lime : r === "D" ? "#cfd6d2" : "#56615b";
        ctx.beginPath(); ctx.arc(x + d / 2, sy + 70, d / 2, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.textBaseline = "middle";
        text(ctx, r, x + d / 2, sy + 71, { size: 18, weight: 800, align: "center", fill: r === "L" ? C.white : C.limeInk });
        ctx.restore();
        x += d + g;
      }
    }
    text(ctx, label, cx, sy + 136, { size: 26, weight: 600, fill: C.mist, align: "center" });
  });

  watermark(ctx, logo);
  return c;
}
