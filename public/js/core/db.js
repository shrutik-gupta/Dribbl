/* Firestore: connection, live subscriptions and queued writes.
   Firebase is loaded as the compat SDK from a <script> tag in index.html (window.firebase). */
import { firebaseConfig } from "../config/firebase.config.js";
import { S, COLLECTIONS, allReady, bump } from "./state.js";
import { render } from "./render.js";
import { toast } from "../ui/toast.js";
import { clone, sleep, todayStr } from "../lib/utils.js";

export async function initDb() {
  const fb = window.firebase;
  const ok = fb && firebaseConfig && firebaseConfig.projectId && !String(firebaseConfig.projectId).startsWith("YOUR_");
  if (!ok) return false;
  try {
    if (!fb.apps.length) fb.initializeApp(firebaseConfig);
    const db = fb.firestore();
    try { await db.enablePersistence({ synchronizeTabs: true }); } catch (e) {}
    S.db = db;
    return true;
  } catch (e) { return false; }
}

/* ---------- reads: live subscriptions ---------- */
const normalise = {
  players: (id, d) => Object.assign({ injury: { status: "fit" }, position2: "", position3: "" }, clone(d), { id }),
  matches: (id, d) => Object.assign({
    teamA: [], teamB: [], nameA: "", nameB: "", pos: {}, goals: {}, events: [], extraA: 0, extraB: 0,
    capA: "", vcA: "", capB: "", vcB: "", venue: "", status: "setup",
    date: todayStr(), time: "20:00", cost: 0, noShows: {}, waived: {}, private: false, code: ""
  }, clone(d), { id })
};

export function subscribe() {
  const slowTimer = setTimeout(() => { if (!allReady()) { S.slow = true; render(); } }, 10000);
  const done = () => { if (allReady()) { clearTimeout(slowTimer); S.slow = false; } bump(); render(); };
  const onErr = name => e => { S.ready[name] = true; S.loadErr = e; clearTimeout(slowTimer); bump(); render(); };

  for (const name of COLLECTIONS) {
    const map = normalise[name] || ((id, d) => clone(d));
    S.db.collection(name).onSnapshot(snap => {
      const o = {};
      snap.docs.forEach(d => { o[d.id] = map(d.id, d.data()); });
      S[name] = o; S.ready[name] = true; done();
    }, onErr(name));
  }
  S.db.doc("config/club").onSnapshot(snap => {
    S.config = snap.exists ? clone(snap.data()) : {};
    S.ready.config = true; done();
  }, onErr("config"));
}

/* ---------- reads: one-off server checks used by sign-up ---------- */
export async function usernameExists(username) {
  try {
    const snap = await S.db.collection("players").where("username", "==", username).get();
    return !snap.empty;
  } catch (e) { return false; }
}
export async function clubHasPlayers() {
  try {
    const snap = await S.db.collection("players").limit(1).get();
    return !snap.empty;
  } catch (e) { return Object.keys(S.players).length > 0; }
}

/* ---------- writes: one queue per document so saves land in order ---------- */
const queues = {};

function errMsg(e) {
  const c = e && e.code;
  if (c === "invalid_argument" || c === "permission-denied") return "Couldn't save. The database refused the change. Ask the admin to check the Firestore rules.";
  if (c === "quota_exceeded") return "Storage is full. Ask the admin to delete old matches.";
  if (c === "resource_exhausted") return "Too many saves at once. Wait a moment and try again.";
  if (c === "revoked") return "Your access to this page changed. Reload the page.";
  return "Couldn't save. Check your connection and try again.";
}

async function runWrite(fn) {
  try { await fn(); return true; }
  catch (e) {
    if (e && e.code === "unavailable") {
      await sleep(400 + Math.random() * 600);
      try { await fn(); return true; } catch (e2) { toast(errMsg(e2)); return false; }
    }
    toast(errMsg(e)); return false;
  }
}

function enqueue(path, fn) {
  const prev = queues[path] || Promise.resolve(true);
  const next = prev.then(() => runWrite(fn));
  queues[path] = next;
  return next;
}

/* All resolve to true when saved, false when the save failed (a toast is already shown). */
export function setDoc(path, data) { const d = clone(data); return enqueue(path, () => S.db.doc(path).set(d)); }
export function delDoc(path) { return enqueue(path, () => S.db.doc(path).delete()); }

export function savePlayer(pid, data) {
  const d = clone(data); delete d.id;
  return enqueue("players/" + pid, () => S.db.doc("players/" + pid).set(d));
}

/* Read-modify-write on the latest copy of a match. Return false from fn to skip the save. */
export function mutateMatch(id, fn) {
  return enqueue("matches/" + id, () => {
    const cur = S.matches[id]; if (!cur) return;
    const m = clone(cur); delete m.id;
    if (fn(m) === false) return;
    return S.db.doc("matches/" + id).set(m);
  });
}
