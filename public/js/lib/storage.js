/* localStorage that never throws (private windows, blocked storage). */
export function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
export function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
export function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
