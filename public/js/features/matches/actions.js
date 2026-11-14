/* Everything a player or host can do to a match. */
import { S, UI, P } from "../../core/state.js";
import { render } from "../../core/render.js";
import { go } from "../../core/router.js";
import { delDoc, mutateMatch, setDoc } from "../../core/db.js";
import { APP_NAME, CODE_LENGTH, LATE_HOURS, MAX_STRIKES, TEAM_NAME_MAX } from "../../config/constants.js";
import { esc, firstName, fmtLong, fmtTime, joinCode, todayStr, uid } from "../../lib/utils.js";
import { derive, liveTeams, penOf, squadOf, suspended, ratingOf } from "../../domain/derive.js";
import { codeMatches, hasAccess, injured, isLateNow, matchLink, minuteOf, payOf, rememberCode, rsvpOf, teamLabel } from "../../domain/match.js";
import { balanceTeams, suggestCaps } from "../../domain/balance.js";
import { closeModal, confirmBox, formErr, modal, openModal } from "../../ui/modal.js";
import { toast } from "../../ui/toast.js";
import { matchForm, readMatchForm } from "./forms.js";

async function copyText(text, done, failed) {
  try { await navigator.clipboard.writeText(text); toast(done); }
  catch (e) { toast(failed); }
}

function rsvpWrite(mid, pid, status, extra) {
  const rid = mid + "_" + pid, cur = S.rsvps[rid] || {};
  return setDoc("rsvps/" + rid, Object.assign({}, cur, { matchId: mid, pid, status, at: Date.now(), by: S.me }, extra || {}));
}

export const actions = {
  mtab(el) { UI.mtab[el.dataset.m] = el.dataset.t; render(); },
  openTab(el) { UI.mtab[el.dataset.m] = el.dataset.t; go("match-" + el.dataset.m); },

  /* ----- sharing ----- */
  async shareMatch(el) {
    const m = S.matches[el.dataset.m]; if (!m) return;
    const url = matchLink(m);
    const text = `${firstName(P(m.hostId))} is hosting a match on ${fmtLong(m.date)} at ${fmtTime(m.time)}${m.venue ? ", " + m.venue : ""}. Join on ${APP_NAME}${m.private ? " (code " + m.code + ")" : ""}:`;
    const data = { title: APP_NAME + " match", text, url };
    /* Android app: native share sheet (Capacitor Share plugin). Browsers: Web Share where it exists. */
    const native = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share;
    try {
      if (native) return await native.share(Object.assign({ dialogTitle: "Share match" }, data));
      if (navigator.share) return await navigator.share(data);
    } catch (e) {
      if (/abort|cancel/i.test(String(e && e.name) + " " + String(e && e.message))) return;   // user closed the share sheet
    }
    copyText(text + " " + url, "Match link copied. Paste it in your group chat.", "Couldn't copy the link. Share this page's address instead.");
  },
  copyCode(el) {
    const m = S.matches[el.dataset.m];
    if (m && m.code) copyText(m.code, "Join code copied.", "Couldn't copy. The code is " + m.code + ".");
  },

  /* ----- hosting ----- */
  hostMatch() {
    const last = Object.values(S.matches).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0] || {};
    openModal("Host a match", matchForm({ date: todayStr(), time: last.time || "20:00", venue: last.venue || S.config.venue || "", cost: last.cost || "", nameA: "", nameB: "", private: false }) +
      `<p class="muted small">You'll control this match: teams, captains, score and payments. Players see it on their Matches page and tap "I'm in".</p>
       <button class="btn primary wide" type="submit">Create match</button>`, "newMatch");
  },
  editMatch(el) {
    const m = S.matches[el.dataset.m];
    openModal("Match details", matchForm(m) + `<button class="btn primary wide" type="submit">Save</button>`, "matchDetails", { mid: m.id });
  },
  renameTeams(el) {
    const m = S.matches[el.dataset.m];
    const field = (side, n) => `<div class="field"><label for="f-name${side}">Team ${n} name</label><input id="f-name${side}" name="name${side}" maxlength="${TEAM_NAME_MAX}" value="${esc(m["name" + side] || "")}" placeholder="${esc(teamLabel(Object.assign({}, m, { ["name" + side]: "" }), side))}"></div>`;
    openModal("Team names", `<div class="grid2">${field("A", 1)}${field("B", 2)}</div>
      <p class="hint">Leave a name blank to use the captain's name.</p><button class="btn primary wide" type="submit">Save</button>`, "teamNames", { mid: m.id });
  },
  async cancelMatch(el) {
    if (!await confirmBox("Cancel this match?", "The match, its teams and any penalties from it will be deleted.", "Cancel match", true)) return;
    if (await delDoc("matches/" + el.dataset.m)) go("matches");
  },
  async deleteMatch(el) {
    if (!await confirmBox("Delete this match?", "The result, goals, ratings, payments and penalties for this match will be deleted for everyone. This can't be undone.", "Delete match", true)) return;
    const id = el.dataset.m;
    for (const name of ["ratings", "rsvps", "payments"]) {
      for (const k of Object.keys(S[name]).filter(k => S[name][k].matchId === id)) await delDoc(name + "/" + k);
    }
    if (await delDoc("matches/" + id)) go("matches");
  },

  /* ----- who's playing ----- */
  async rsvp(el) {
    const mid = el.dataset.m, s = el.dataset.s, m = S.matches[mid];
    if (!m || m.status !== "setup") return toast("This match has already started.");
    if (!hasAccess(m)) return toast("This match is private. Enter its join code first.");
    if (suspended(S.me)) return toast("You're suspended. Ask the admin to reapprove you.");
    const cur = rsvpOf(mid, S.me);
    if (cur && cur.status === s) return;
    if (s === "out" && cur && cur.status === "in" && isLateNow(m)) {
      if (!await confirmBox("Drop out late?", `Kick-off is less than ${LATE_HOURS} hours away. Dropping out now gives you a penalty. ${MAX_STRIKES} active penalties mean suspension.`, "Drop out anyway", true)) return;
      return rsvpWrite(mid, S.me, "out", { lateAt: Date.now(), waived: false });
    }
    rsvpWrite(mid, S.me, s);
  },
  hostAdd(el) { rsvpWrite(el.dataset.m, el.dataset.p, "in"); },
  async hostRemove(el) {
    const p = P(el.dataset.p);
    if (!await confirmBox("Remove " + p.name + "?", "They'll be taken out of this match with no penalty. Use No-show instead if they didn't turn up.", "Remove")) return;
    rsvpWrite(el.dataset.m, el.dataset.p, "out");
  },
  async noShow(el) {
    const pid = el.dataset.p, p = P(pid), mid = el.dataset.m;
    const after = penOf(pid).active + 1;
    if (!await confirmBox(`Mark ${p.name} as a no-show?`, `They'll be removed from the teams and get a penalty (${after} of ${MAX_STRIKES}).${after >= MAX_STRIKES ? " This suspends them until the admin reapproves." : ""} You can undo this until the match ends.`, "Mark no-show", true)) return;
    mutateMatch(mid, m => {
      m.noShows = m.noShows || {}; m.noShows[pid] = { at: Date.now(), by: S.me };
      m.teamA = m.teamA.filter(x => x !== pid); m.teamB = m.teamB.filter(x => x !== pid);
      for (const k of ["capA", "vcA", "capB", "vcB"]) if (m[k] === pid) m[k] = "";
      if (m.goals[pid]) { delete m.goals[pid]; m.events = (m.events || []).filter(e => e.pid !== pid); }
    });
  },
  undoNoShow(el) { const pid = el.dataset.p; mutateMatch(el.dataset.m, m => { if (m.noShows) delete m.noShows[pid]; }); },

  /* ----- teams ----- */
  makeTeams(el) {
    const ids = squadOf(S.matches[el.dataset.m]);
    mutateMatch(el.dataset.m, m => {
      const posOf = p => m.pos[p] || P(p).position || "MID";
      const prevKey = m.teamA.slice().sort().join(",");
      const res = balanceTeams(ids, posOf, p => ratingOf(p).v, prevKey);
      m.teamA = res.A; m.teamB = res.B;
      ids.forEach(p => { m.pos[p] = posOf(p); });
      const a = suggestCaps(m.teamA), b = suggestCaps(m.teamB);
      m.capA = a.cap; m.vcA = a.vc; m.capB = b.cap; m.vcB = b.vc;
    });
  },
  placeIn(el) {
    const pid = el.dataset.p, side = el.dataset.side;
    mutateMatch(el.dataset.m, m => {
      m.teamA = m.teamA.filter(x => x !== pid); m.teamB = m.teamB.filter(x => x !== pid);
      m["team" + side].push(pid);
      m.pos[pid] = m.pos[pid] || (P(pid) || {}).position || "MID";
    });
  },
  setCap(el) {
    const { m: id, p: pid, role, side } = el.dataset;
    mutateMatch(id, m => {
      const k = role + side, other = (role === "cap" ? "vc" : "cap") + side;
      m[k] = m[k] === pid ? "" : pid;
      if (m[other] === pid) m[other] = "";
    });
  },
  movePlayer(el) {
    const pid = el.dataset.p;
    mutateMatch(el.dataset.m, m => {
      const from = m.teamA.includes(pid) ? "A" : "B", to = from === "A" ? "B" : "A";
      m["team" + from] = m["team" + from].filter(x => x !== pid); m["team" + to].push(pid);
      for (const k of ["cap", "vc"]) if (m[k + from] === pid) m[k + from] = "";
    });
  },

  /* ----- match day ----- */
  startMatch(el) {
    const m0 = S.matches[el.dataset.m], t = liveTeams(m0);
    mutateMatch(el.dataset.m, m => {
      m.teamA = t.A; m.teamB = t.B;
      for (const s of ["A", "B"]) if (!m["team" + s].includes(m["vc" + s])) m["vc" + s] = "";
      m.status = "live"; m.startedAt = Date.now(); UI.mtab[m0.id] = "summary";
    });
  },
  goal(el) {
    const d = +el.dataset.d, pid = el.dataset.p;
    mutateMatch(el.dataset.m, m => {
      const side = m.teamA.includes(pid) ? "A" : "B";
      m.goals[pid] = Math.max(0, (m.goals[pid] || 0) + d); if (!m.goals[pid]) delete m.goals[pid];
      m.events = m.events || [];
      if (d > 0) m.events.push({ pid, side, min: m.status === "live" ? minuteOf(m) : null, at: Date.now() });
      else { const i = m.events.map(e => e.pid).lastIndexOf(pid); if (i >= 0) m.events.splice(i, 1); }
    });
  },
  extra(el) {
    const d = +el.dataset.d, side = el.dataset.side, k = "extra" + side;
    mutateMatch(el.dataset.m, m => {
      m[k] = Math.max(0, (m[k] || 0) + d);
      m.events = m.events || [];
      if (d > 0) m.events.push({ pid: "", side, min: m.status === "live" ? minuteOf(m) : null, at: Date.now() });
      else { let i = -1; m.events.forEach((e, j) => { if (!e.pid && e.side === side) i = j; }); if (i >= 0) m.events.splice(i, 1); }
    });
  },
  async endMatch(el) {
    const id = el.dataset.m, m = S.matches[id], mi = derive().info[id];
    if (!await confirmBox("End this match?", `Final score: ${teamLabel(m, "A")} ${mi.sA}–${mi.sB} ${teamLabel(m, "B")}. Players will be asked to rate each other. You can still fix the score afterwards.`, "End match")) return;
    mutateMatch(id, x => { x.status = "ended"; x.endedAt = Date.now(); });
  },
  editRes(el) { UI.editRes[el.dataset.m] = !UI.editRes[el.dataset.m]; render(); },

  /* ----- ratings ----- */
  rate(el) { const { m, p, v } = el.dataset; (UI.draft[m] || (UI.draft[m] = {}))[p] = +v; render(); },
  reRate(el) { UI.reRate[el.dataset.m] = true; delete UI.draft[el.dataset.m]; render(); },
  async submitRatings(el) {
    const id = el.dataset.m, m = S.matches[id]; if (!m) return;
    const others = [...m.teamA, ...m.teamB].filter(p => p !== S.me);
    const d = UI.draft[id] || {}, scores = {};
    for (const p of others) { if (!(d[p] >= 1 && d[p] <= 10)) return toast("Rate every player before submitting."); scores[p] = d[p]; }
    el.disabled = true;
    const ok = await setDoc("ratings/" + id + "_" + S.me, { matchId: id, raterId: S.me, scores, at: Date.now() });
    if (ok) { UI.reRate[id] = false; delete UI.draft[id]; toast("Ratings submitted. Thanks!"); }
    render();
  },

  /* ----- payments ----- */
  iPaid(el) {
    const mid = el.dataset.m;
    setDoc("payments/" + mid + "_" + S.me, { matchId: mid, pid: S.me, paidAt: Date.now(), verified: false }).then(ok => ok && toast("Marked as paid. The host will verify it."));
  },
  undoPaid(el) { const mid = el.dataset.m, r = payOf(mid, S.me); if (r && r.verified) return; delDoc("payments/" + mid + "_" + S.me); },
  verifyPay(el) {
    const { m: mid, p: pid } = el.dataset, v = el.dataset.v === "1";
    const cur = payOf(mid, pid) || { matchId: mid, pid, paidAt: null };
    setDoc("payments/" + mid + "_" + pid, Object.assign({}, cur, { verified: v, verifiedAt: v ? Date.now() : null, verifiedBy: v ? S.me : null }));
  },
  async copyUpi() {
    const inp = document.getElementById("upi-id"); if (!inp) return;
    try { await navigator.clipboard.writeText(inp.value); toast("UPI ID copied."); }
    catch (e) { inp.focus(); inp.select(); toast("Long-press the UPI ID to copy it."); }
  }
};

export const changes = {
  setPos(el) { const pid = el.dataset.p, v = el.value; mutateMatch(el.dataset.m, m => { m.pos[pid] = v; }); }
};

export const forms = {
  async newMatch(fd) {
    const id = uid("m");
    const details = readMatchForm(fd);
    const doc = Object.assign(details, {
      code: details.private ? joinCode(CODE_LENGTH) : "",
      hostId: S.me, status: "setup", teamA: [], teamB: [], pos: {}, capA: "", vcA: "", capB: "", vcB: "",
      goals: {}, events: [], extraA: 0, extraB: 0, noShows: {}, waived: {}, createdAt: Date.now()
    });
    if (!await setDoc("matches/" + id, doc)) return;
    closeModal();
    if (!suspended(S.me) && !injured(S.me)) await rsvpWrite(id, S.me, "in");
    go("match-" + id);
  },
  async matchDetails(fd) {
    const v = readMatchForm(fd);
    /* A match keeps its code once it has one, so links shared earlier keep working */
    await mutateMatch(modal.state.mid, m => { Object.assign(m, v); if (m.private && !m.code) m.code = joinCode(CODE_LENGTH); });
    closeModal();
  },
  /* The lock screen of a private match */
  joinCode(fd) {
    const mid = String(fd.get("mid")), m = S.matches[mid];
    if (!m) return formErr("This match no longer exists.");
    if (!codeMatches(m, fd.get("code"))) return formErr("That code doesn't match. Check it with the host.");
    rememberCode(mid, fd.get("code"));
    render();
  },
  async teamNames(fd) {
    const name = k => String(fd.get(k) || "").trim().slice(0, TEAM_NAME_MAX);
    await mutateMatch(modal.state.mid, m => { m.nameA = name("nameA"); m.nameB = name("nameB"); });
    closeModal();
  }
};
