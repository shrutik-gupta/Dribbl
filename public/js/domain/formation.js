/* Where each player stands on the pitch. A team's half is a grid: one row per position
   (GK, DEF, MID, FWD) with three slots across. The row is the player's position (m.pos),
   the slot across is m.slot[pid] (0 left, 1 centre, 2 right). The host drags players between
   slots on the Line-ups tab; players the host hasn't placed are spread out by themselves. */
import { P } from "../core/state.js";
import { POS } from "../config/constants.js";

export const COLS = 3;
export const posOf = (m, pid) => { const p = m.pos[pid] || (P(pid) || {}).position; return POS.includes(p) ? p : "MID"; };

/* Returns { GK: [pid | null, x3], DEF: [...], ... } for one team, or null when the team can't be
   shown on the grid (more than three players in a row, or more players than slots).
   With `force`, players who don't fit their row move to the nearest row with a free slot. */
export function gridOf(m, ids, force) {
  if (ids.length > POS.length * COLS) return null;
  const grid = {}, wait = {}, saved = m.slot || {};
  for (const row of POS) { grid[row] = Array(COLS).fill(null); wait[row] = []; }

  for (const pid of ids) {
    const row = posOf(m, pid), c = saved[pid];
    if (Number.isInteger(c) && c >= 0 && c < COLS && !grid[row][c]) grid[row][c] = pid;
    else wait[row].push(pid);
  }
  const spill = [];
  for (const row of POS) {
    /* One player goes to the centre, two go wide, three fill the row */
    const order = wait[row].length === 1 ? [1, 0, 2] : wait[row].length === 2 ? [0, 2, 1] : [0, 1, 2];
    for (const pid of wait[row]) {
      const c = order.find(x => !grid[row][x]);
      if (c === undefined) spill.push([pid, row]); else grid[row][c] = pid;
    }
  }
  if (spill.length && !force) return null;
  for (const [pid, row] of spill) {
    const i = POS.indexOf(row);
    const near = POS.map((r, j) => j).sort((a, b) => Math.abs(a - i) - Math.abs(b - i) || (a === 0) - (b === 0));
    for (const j of near) { const c = grid[POS[j]].indexOf(null); if (c >= 0) { grid[POS[j]][c] = pid; break; } }
  }
  return grid;
}

/* "2-3-1": outfield players per line, back to front (the keeper isn't counted) */
export const shapeOf = grid => POS.slice(1).map(r => grid[r].filter(Boolean).length).filter(Boolean).join("-");
