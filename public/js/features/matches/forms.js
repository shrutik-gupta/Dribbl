/* The "Host a match" / "Match details" form. */
import { TEAM_NAME_MAX } from "../../config/constants.js";
import { esc } from "../../lib/utils.js";
import { sel } from "../../ui/components.js";

export function matchForm(m) {
  const teamField = (side, n) => `<div class="field"><label for="f-name${side}">Team ${n} name <span class="opt">optional</span></label>
      <input id="f-name${side}" name="name${side}" maxlength="${TEAM_NAME_MAX}" value="${esc(m["name" + side] || "")}" placeholder="${n === 1 ? "e.g. Green Machine" : "e.g. Net Busters"}"></div>`;
  return `<div class="grid2"><div class="field"><label for="f-date">Date</label><input id="f-date" name="date" type="date" required value="${esc(m.date)}"></div>
      <div class="field"><label for="f-time">Kick-off time</label><input id="f-time" name="time" type="time" required value="${esc(m.time || "20:00")}"></div></div>
    <div class="field"><label for="f-venue">Turf / venue</label><input id="f-venue" name="venue" maxlength="60" value="${esc(m.venue || "")}" placeholder="e.g. Dugout Turf, Andheri"></div>
    <div class="field"><label for="f-cost">Total turf cost (₹)</label><input id="f-cost" name="cost" type="number" min="0" step="1" inputmode="numeric" value="${esc(m.cost || "")}" placeholder="e.g. 1800">
      <span class="hint">Split equally between everyone who plays, you included. Leave empty if there's nothing to pay.</span></div>
    <div class="field"><label for="f-vis">Who can join</label>${sel("vis", [["public", "Public: anyone in the club"], ["private", "Private: only people with the code"]], m.private ? "private" : "public")}
      <span class="hint">A private match gets a join code. Share the match link and the code goes with it.</span></div>
    <div class="grid2">${teamField("A", 1)}${teamField("B", 2)}</div>
    <p class="hint" style="margin-top:-6px">Leave a team name blank and it's named after its captain, like <b>Shrutik's</b>.</p>`;
}

export function readMatchForm(fd) {
  const cost = Math.max(0, Math.round(Number(fd.get("cost")) || 0));
  const name = k => String(fd.get(k) || "").trim().slice(0, TEAM_NAME_MAX);
  return { date: fd.get("date"), time: fd.get("time") || "20:00", venue: String(fd.get("venue") || "").trim(), cost, nameA: name("nameA"), nameB: name("nameB"), private: fd.get("vis") === "private" };
}
