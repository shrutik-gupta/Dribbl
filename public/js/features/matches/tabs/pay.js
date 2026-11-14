/* Payments tab: split the turf cost, show the host's UPI details, track who has paid. */
import { S, P } from "../../../core/state.js";
import { esc, firstName, rupees } from "../../../lib/utils.js";
import { perHead, rosterOf } from "../../../domain/derive.js";
import { payOf } from "../../../domain/match.js";
import { ICON } from "../../../ui/icons.js";
import { avatar, emptyState } from "../../../ui/components.js";

export function tabPay(m, ctl) {
  const mid = esc(m.id);
  const host = P(m.hostId) || { name: "the host", id: "" };
  const info = S.payinfo[m.hostId] || {};
  const roster = rosterOf(m);
  const each = perHead(m);

  if (!(m.cost > 0)) {
    return `<section>${emptyState("rupee", ctl ? `Add the turf cost to split payments.<br><button class="btn primary sm" style="margin-top:12px" data-act="editMatch" data-m="${mid}">Add turf cost</button>`
      : "The host hasn't added the turf cost yet.")}</section>`;
  }

  const payers = roster.filter(p => p !== m.hostId);
  const st = pid => { const r = payOf(m.id, pid); return !r ? "none" : r.verified ? "verified" : "claimed"; };
  const verified = payers.filter(p => st(p) === "verified").length;
  const myState = st(S.me);

  const payee = (info.qr || info.upiId) ? `<div class="payee">${info.qr ? `<img class="qr" src="${esc(info.qr)}" alt="UPI QR code for ${esc(host.name)}">` : ""}
      <div class="stack">${info.upiId ? `<div class="field"><label for="upi-id">UPI ID</label><div class="upi"><input id="upi-id" readonly value="${esc(info.upiId)}"><button class="btn sm" data-act="copyUpi">Copy</button></div></div>` : ""}
        <p class="muted small">If the Pay button doesn't open your UPI app, copy the UPI ID and paste it in GPay, PhonePe or Paytm. ${info.qr ? "On another phone, scan the QR." : ""}</p></div></div>`
    : `<div class="note">${m.hostId === S.me ? `Add your UPI ID and QR so players can pay you. <button class="btn sm" data-act="payDetails" style="margin-left:6px">Add UPI details</button>`
      : `${esc(host.name)} hasn't added UPI details. Ask them for their UPI ID.`}</div>`;

  const myBlock = payers.includes(S.me) ? `<div class="spread" style="margin-top:16px">${
    myState === "none" ? (info.upiId
      ? `<span class="muted small">Pay opens your UPI app with ${rupees(each)} and ${esc(firstName(host))}'s UPI ID filled in. Come back and tap <b>I've paid</b>.</span>
        <span class="row"><button class="btn primary" data-act="payUpi" data-m="${mid}">${ICON.rupee} Pay ${rupees(each)}</button><button class="btn" data-act="iPaid" data-m="${mid}">I've paid</button></span>`
      : `<span class="muted small">After paying, tell ${esc(firstName(host))}.</span><button class="btn primary" data-act="iPaid" data-m="${mid}">I've paid ${rupees(each)}</button>`)
    : myState === "claimed" ? `<span class="pill warn">Waiting for ${esc(firstName(host))} to verify</span><button class="btn sm ghost" data-act="undoPaid" data-m="${mid}">Undo</button>`
    : `<span class="pill good">${ICON.check} Payment verified</span>`}</div>` : "";

  const rows = payers.map(pid => {
    const p = P(pid), s = st(pid);
    const pill = s === "verified" ? '<span class="pill good">Verified</span>' : s === "claimed" ? '<span class="pill warn">Says paid</span>' : '<span class="pill mute">Not paid</span>';
    const act = !ctl ? "" : s === "verified" ? `<button class="toggle" data-act="verifyPay" data-v="0" data-m="${mid}" data-p="${esc(pid)}">Undo</button>`
      : `<button class="toggle on" data-act="verifyPay" data-v="1" data-m="${mid}" data-p="${esc(pid)}">Verify</button>`;
    return `<div class="it">${avatar(p, 32)}<span class="nm">${esc((p || {}).name || "Removed player")}</span>${pill}${act ? `<span class="acts">${act}</span>` : ""}</div>`;
  }).join("");

  return `<section class="card"><div class="spread"><div><span class="eyebrow">Each player pays</span><div class="amount">${rupees(each)}</div>
        <span class="muted small">${rupees(m.cost)} turf ÷ ${roster.length} players · paid to ${esc(host.name)}</span></div>
        ${ctl ? `<button class="btn sm" data-act="editMatch" data-m="${mid}">Change cost</button>` : ""}</div>
      <div style="margin-top:16px">${payee}</div>${myBlock}</section>
    <section><div class="sec-h"><h2>Paid list</h2><span class="muted small num">${verified} of ${payers.length} verified · ${rupees(verified * each)} of ${rupees(payers.length * each)}</span></div>
      <div class="progress"><span style="width:${payers.length ? verified / payers.length * 100 : 0}%"></span></div>
      ${payers.length ? `<div class="card flush plist">${rows}</div>` : emptyState("players", "No players yet.")}
      ${ctl ? `<p class="muted tiny foot">Check your UPI app, then tap Verify. You can verify cash payments too.</p>` : ""}</section>`;
}
