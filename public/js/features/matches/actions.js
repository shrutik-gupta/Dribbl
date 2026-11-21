/* Everything a player or host can do to a match. */
import { S, UI, P, activePlayers } from "../../core/state.js";
import { render } from "../../core/render.js";
import { go } from "../../core/router.js";
import { delDoc, mutateMatch, setDoc } from "../../core/db.js";
import { APP_NAME, CODE_LENGTH, LATE_HOURS, MAX_STRIKES, TEAM_NAME_MAX } from "../../config/constants.js";
import { esc, firstName, fmtLong, fmtTime, joinCode, parseD, rupees, todayStr, uid, upiLink } from "../../lib/utils.js";
import { derive, liveTeams, penOf, perHead, squadOf, suspended, ratingOf } from "../../domain/derive.js";
import { canControl, codeMatches, hasAccess, inMatch, injured, isLateNow, isOverdue, matchLink, minuteOf, otherSide, payOf, rememberCode, rsvpOf, sideOf, tallyOf, teamLabel, teamOfEvent } from "../../domain/match.js";
import { balanceTeams, suggestCaps } from "../../domain/balance.js";
import { gridOf } from "../../domain/formation.js";
import { POS } from "../../config/constants.js";
import { closeModal, confirmBox, formErr, modal, openModal } from "../../ui/modal.js";
import { toast } from "../../ui/toast.js";
import { matchForm, readMatchForm } from "./forms.js";
import { avatar, posBadges } from "../../ui/components.js";

async function copyText(text, done, failed) {
  try { await navigator.clipboard.writeText(text); toast(done); }
  catch (e) { toast(failed); }
}

function rsvpWrite(mid, pid, status, extra) {
  const rid = mid + "_" + pid, cur = S.rsvps[rid] || {};
  return setDoc("rsvps/" + rid, Object.assign({}, cur, { matchId: mid, pid, status, at: Date.now(), by: S.me }, extra || {}));
}

/* Formation editor: put a player in a slot of their team's half. A player already in that
   slot swaps places with them. The whole team's layout is saved, so it stays as the host saw it. */
export function placeInSlot(mid, side, pid, row, col) {
  const m0 = S.matches[mid]; if (!m0 || !POS.includes(row)) return;
  const ids = liveTeams(m0)[side];
  if (!ids.includes(pid)) return;
  return mutateMatch(mid, m => {
    const grid = gridOf(m, ids, true); if (!grid) return false;
    const from = POS.find(r => grid[r].includes(pid)); if (!from) return false;
    const c0 = grid[from].indexOf(pid), other = grid[row][col];
    grid[from][c0] = other; grid[row][col] = pid;
    m.slot = m.slot || {};
    for (const r of POS) grid[r].forEach((p, c) => { if (p) { m.pos[p] = r; m.slot[p] = c; } });
  });
}

/* Inside a mutateMatch: make sure the per-team goal tallies are stored (older matches only
   have player totals), then keep a player's totals in step with them. */
function prepTally(m) { const t = tallyOf(m); m.gBy = t.g; m.ogBy = t.og; m.og = m.og || {}; }
function syncTotals(m, pid) {
  for (const [tot, by] of [[m.goals, m.gBy], [m.og, m.ogBy]]) {
    for (const s of ["A", "B"]) if (!by[s][pid]) delete by[s][pid];
    const n = (by.A[pid] || 0) + (by.B[pid] || 0);
    if (n) tot[pid] = n; else delete tot[pid];
  }
}

/* Matches still waiting to start ABANDON_HOURS after kick-off are saved as abandoned.
   Runs on every device that has the app open; the first one to notice saves it. */
const swept = new Set();
export function sweepAbandoned() {
  for (const m of Object.values(S.matches)) {
    if (!isOverdue(m) || swept.has(m.id)) continue;
    swept.add(m.id);
    mutateMatch(m.id, x => {
      if (!isOverdue(x)) return false;
      x.status = "abandoned"; x.abandon = { auto: true, at: Date.now() };
    });
  }
}

/* Inside a mutateMatch, once the match has started: take pid off their team and log it.
   Their goals stay with the team (tallies are stored first), and a team named after a
   departing captain keeps that name. */
function leaveTeam(m, pid, from, to) {
  prepTally(m);
  if (m["cap" + from] === pid && !String(m["name" + from] || "").trim()) m["name" + from] = teamLabel(m, from);
  m["team" + from] = m["team" + from].filter(x => x !== pid);
  for (const k of ["cap", "vc"]) if (m[k + from] === pid) m[k + from] = "";
  if (m.slot) delete m.slot[pid];
  logChange(m, pid, from, to);
}
/* Line-up changes after kick-off, shown in the goal timeline. from "" = joined, to "" = left. */
function logChange(m, pid, from, to) {
  m.swaps = m.swaps || [];
  m.swaps.push({ pid, from, to, min: m.status === "live" ? minuteOf(m) : null, at: Date.now() });
}
const started = m => m.status === "live" || m.status === "ended";

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
  /* Abandoning keeps the match on record (marked Abandoned) instead of deleting it.
     It doesn't count in stats, and no penalties come from it. */
  abandonMatch(el) {
    const m = S.matches[el.dataset.m]; if (!m || !canControl(m)) return;
    openModal("Abandon this match?", `<p>${m.status === "live" ? "The score so far is kept on record, but the match won't count in anyone's stats."
        : "The match stays on record as abandoned. Players can't join it any more."} No penalties are given for an abandoned match. This can't be undone.</p>
      <div class="field"><label for="f-why">Reason (optional)</label><input id="f-why" name="reason" maxlength="80" placeholder="Rain, not enough players, turf unavailable…"></div>
      <div class="row end"><button class="btn" type="button" data-act="closeModal">Go back</button><button class="btn danger" type="submit">Abandon match</button></div>`, "abandon", { mid: m.id });
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
    if (!m || m.status !== "setup") return toast(m && m.status === "abandoned" ? "This match was abandoned." : "This match has already started.");
    if (isOverdue(m)) return toast("This match was abandoned.");
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
      if (m.goals[pid] || (m.og && m.og[pid])) {
        delete m.goals[pid]; if (m.og) delete m.og[pid];
        for (const by of [m.gBy, m.ogBy]) if (by) { delete (by.A || {})[pid]; delete (by.B || {})[pid]; }
        m.events = (m.events || []).filter(e => e.pid !== pid);
      }
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
      m.teamA = res.A; m.teamB = res.B; m.slot = {};
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
  /* Switch a player to the other team: before kick-off, mid-game or after full time.
     Once the match has started, goals they already scored stay with the team they scored for,
     and the switch shows in the goal timeline. A finished match counts for the team they end in. */
  async movePlayer(el) {
    const pid = el.dataset.p, m0 = S.matches[el.dataset.m];
    if (!m0 || !canControl(m0)) return;
    const from = sideOf(m0, pid); if (!from) return;
    const to = otherSide(from), isStarted = started(m0);
    if (isStarted) {
      const p = P(pid) || { name: "this player" }, g = tallyOf(m0).g[from][pid] || 0;
      if (!await confirmBox(`Move ${p.name} to ${teamLabel(m0, to)}?`, `${g ? `Their ${g} goal${g > 1 ? "s" : ""} for ${teamLabel(m0, from)} stay with ${teamLabel(m0, from)}. ` : ""}${m0.status === "ended"
        ? `Their result will count for ${teamLabel(m0, to)}.` : `Goals they score from now on count for ${teamLabel(m0, to)}.`}`, "Move player")) return;
    }
    mutateMatch(el.dataset.m, m => {
      if (sideOf(m, pid) !== from) return false;
      if (isStarted) { leaveTeam(m, pid, from, to); m["team" + to].push(pid); return; }
      m["team" + from] = m["team" + from].filter(x => x !== pid); m["team" + to].push(pid);
      for (const k of ["cap", "vc"]) if (m[k + from] === pid) m[k + from] = "";
      if (m.slot) delete m.slot[pid];
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
  /* ----- line-up changes after kick-off (before kick-off the Squad tab handles this) ----- */
  addPlayerPicker(el) {
    const m = S.matches[el.dataset.m], side = el.dataset.side;
    if (!m || !canControl(m) || !started(m)) return;
    const list = activePlayers().filter(p => !inMatch(m, p.id));
    openModal("Add to " + teamLabel(m, side), list.length ? `<p class="muted small">${m.status === "live"
        ? "They join from now. Goals they score count for this team."
        : "They'll count as having played: the result, ratings and a share of the payment."}</p>
      <div class="card flush plist">${list.map(p => {
        const blocked = suspended(p.id);
        return `<div class="it">${avatar(p, 34)}<span class="nm">${esc(p.name)} ${posBadges(p)}${blocked ? ' <span class="pill bad">Suspended</span>' : ""}</span>
          <span class="acts"><button class="toggle" data-act="addToTeam" data-m="${esc(m.id)}" data-side="${side}" data-p="${esc(p.id)}" ${blocked ? "disabled" : ""}>Add</button></span></div>`;
      }).join("")}</div>` : `<p class="muted">Everyone in the club is already in this match.</p>`);
  },
  addToTeam(el) {
    const { m: mid, side, p: pid } = el.dataset;
    closeModal();
    mutateMatch(mid, m => {
      if (!started(m) || inMatch(m, pid) || (side !== "A" && side !== "B")) return false;
      prepTally(m);
      m["team" + side].push(pid);
      m.pos[pid] = m.pos[pid] || (P(pid) || {}).position || "MID";
      logChange(m, pid, "", side);
    });
    toast(`${(P(pid) || {}).name || "Player"} added to ${teamLabel(S.matches[mid], side)}.`);
  },
  async removeFromTeam(el) {
    const pid = el.dataset.p, m0 = S.matches[el.dataset.m];
    if (!m0 || !canControl(m0) || !started(m0)) return;
    const from = sideOf(m0, pid); if (!from) return;
    const p = P(pid) || { name: "this player" }, g = tallyOf(m0).g[from][pid] || 0;
    if (!await confirmBox(`Remove ${p.name} from the match?`, `No penalty. ${g ? `Their ${g} goal${g > 1 ? "s" : ""} stay with ${teamLabel(m0, from)}, so the score doesn't change. ` : ""}This match won't count in their stats, and ratings they gave or got here are left out. You can add them back later.`, "Remove")) return;
    mutateMatch(el.dataset.m, m => { if (sideOf(m, pid) !== from) return false; leaveTeam(m, pid, from, ""); });
  },

  /* + / − next to a player: a goal for the team they're playing for now */
  goal(el) {
    const d = +el.dataset.d, pid = el.dataset.p;
    mutateMatch(el.dataset.m, m => {
      const side = sideOf(m, pid); if (!side) return false;
      prepTally(m);
      m.events = m.events || [];
      if (d > 0) {
        m.gBy[side][pid] = (m.gBy[side][pid] || 0) + 1;
        m.events.push({ pid, side, team: side, min: m.status === "live" ? minuteOf(m) : null, at: Date.now() });
      } else {
        if (!m.gBy[side][pid]) return false;
        m.gBy[side][pid]--;
        let i = -1; m.events.forEach((e, j) => { if (e.pid === pid && e.kind !== "og" && teamOfEvent(e) === side) i = j; });
        if (i >= 0) m.events.splice(i, 1);
      }
      syncTotals(m, pid);
    });
  },
  /* Marks a goal as a penalty or an own goal (tap again to undo). An own goal is taken off the
     player's tally and counts for the other team. Goals are found by the time they were added. */
  goalKind(el) {
    const at = +el.dataset.at, k = el.dataset.k;
    mutateMatch(el.dataset.m, m => {
      const e = (m.events || []).find(x => x.at === at && x.pid);
      if (!e) return false;
      const pid = e.pid, team = teamOfEvent(e), next = e.kind === k ? "" : k;
      prepTally(m);
      if (e.kind === "og" && next !== "og") {
        if (!m.ogBy[team][pid]) return false;
        m.ogBy[team][pid]--; m.gBy[team][pid] = (m.gBy[team][pid] || 0) + 1; e.side = team;
      } else if (e.kind !== "og" && next === "og") {
        if (!m.gBy[team][pid]) return false;
        m.gBy[team][pid]--; m.ogBy[team][pid] = (m.ogBy[team][pid] || 0) + 1; e.side = otherSide(team);
      }
      e.team = team;
      if (next) e.kind = next; else delete e.kind;
      syncTotals(m, pid);
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
  editForm(el) { UI.editForm[el.dataset.m] = !UI.editForm[el.dataset.m]; render(); },

  /* ----- ratings ----- */
  rate(el) { const { m, p, v } = el.dataset; (UI.draft[m] || (UI.draft[m] = {}))[p] = +v; render(); },
  /* Ratings are final: one submission per player per match, never changed or withdrawn.
     firestore.rules enforces this too (ratings can be created but not updated). */
  async submitRatings(el) {
    const id = el.dataset.m, m = S.matches[id]; if (!m) return;
    if (S.ratings[id + "_" + S.me]) return toast("You've already rated this match.");
    const others = [...m.teamA, ...m.teamB].filter(p => p !== S.me);
    const d = UI.draft[id] || {}, scores = {};
    for (const p of others) { if (!(d[p] >= 1 && d[p] <= 10)) return toast("Rate every player before submitting."); scores[p] = d[p]; }
    if (!await confirmBox("Submit your ratings?", "Ratings are final. Once submitted, you can't change or remove them.", "Submit ratings")) return;
    if (S.ratings[id + "_" + S.me]) return toast("You've already rated this match.");
    el.disabled = true;
    const ok = await setDoc("ratings/" + id + "_" + S.me, { matchId: id, raterId: S.me, scores, at: Date.now() });
    if (ok) { delete UI.draft[id]; toast("Ratings submitted. Thanks!"); }
    render();
  },

  /* ----- payments ----- */
  /* Opens the player's UPI app with the host's UPI ID and this player's share filled in.
     No money moves through Dribbl: the player pays in their own app, then taps "I've paid". */
  payUpi(el) {
    const m = S.matches[el.dataset.m]; if (!m) return;
    const host = P(m.hostId) || {}, upiId = (S.payinfo[m.hostId] || {}).upiId, amount = perHead(m);
    if (!upiId || !amount) return;
    const day = parseD(m.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    const link = upiLink(upiId, host.name || "Host", amount, `${APP_NAME} match ${day}`);

    /* When a UPI app (or the app picker) opens, this page goes to the background.
       If it never does, nothing on this device could open the link. */
    let left = false;
    const watch = () => {
      if (document.hidden) { left = true; return; }
      if (!left) return;
      document.removeEventListener("visibilitychange", watch);
      if (!payOf(m.id, S.me)) toast(`Paid? Tap "I've paid" so ${firstName(host)} can verify it.`);
    };
    document.addEventListener("visibilitychange", watch);
    setTimeout(() => {
      if (left || document.hidden) return;
      document.removeEventListener("visibilitychange", watch);
      toast(`No UPI app opened. Copy the UPI ID and pay ${rupees(amount)} from your UPI app.`);
    }, 2500);
    window.location.href = link;
  },
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
  setPos(el) { const pid = el.dataset.p, v = el.value; mutateMatch(el.dataset.m, m => { m.pos[pid] = v; if (m.slot) delete m.slot[pid]; }); }
};

export const forms = {
  async newMatch(fd) {
    const id = uid("m");
    const details = readMatchForm(fd);
    const doc = Object.assign(details, {
      code: details.private ? joinCode(CODE_LENGTH) : "",
      hostId: S.me, status: "setup", teamA: [], teamB: [], pos: {}, capA: "", vcA: "", capB: "", vcB: "",
      goals: {}, og: {}, events: [], extraA: 0, extraB: 0, noShows: {}, waived: {}, createdAt: Date.now()
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
  async abandon(fd) {
    const mid = modal.state.mid, reason = String(fd.get("reason") || "").trim().slice(0, 80);
    await mutateMatch(mid, m => {
      if (m.status !== "setup" && m.status !== "live") return false;
      m.abandon = { auto: false, by: S.me, at: Date.now(), reason, wasLive: m.status === "live" };
      m.status = "abandoned";
    });
    closeModal();
    toast("Match abandoned.");
  },
  async teamNames(fd) {
    const name = k => String(fd.get(k) || "").trim().slice(0, TEAM_NAME_MAX);
    await mutateMatch(modal.state.mid, m => { m.nameA = name("nameA"); m.nameB = name("nameB"); });
    closeModal();
  }
};
