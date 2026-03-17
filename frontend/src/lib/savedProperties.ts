const BASE_SAVED = "jp_saved_units";
const BASE_COMPARE = "jp_compare_units";

function getCustomerId(): string {
  try {
    const raw = localStorage.getItem("jp_customer");
    const c = raw ? JSON.parse(raw) : null;
    return c?.id || "";
  } catch { return ""; }
}

function savedKey(): string {
  const cid = getCustomerId();
  return cid ? `${BASE_SAVED}_${cid}` : BASE_SAVED;
}

function compareKey(): string {
  const cid = getCustomerId();
  return cid ? `${BASE_COMPARE}_${cid}` : BASE_COMPARE;
}

// ── Saved (Favourites) ────────────────────────────────────────────────────────
export function getSaved(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(savedKey()) || "[]"); } catch { return []; }
}

export function isSaved(id: string): boolean {
  return getSaved().includes(id);
}

export function toggleSaved(id: string): boolean {
  const saved = getSaved();
  const idx = saved.indexOf(id);
  const next = idx >= 0 ? saved.filter(x => x !== id) : [...saved, id];
  localStorage.setItem(savedKey(), JSON.stringify(next));
  return idx < 0; // true = added
}

export function clearSaved(): void {
  if (typeof window !== "undefined") localStorage.removeItem(savedKey());
}

// ── Compare ───────────────────────────────────────────────────────────────────
export function getCompare(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(compareKey()) || "[]"); } catch { return []; }
}

export function isInCompare(id: string): boolean {
  return getCompare().includes(id);
}

export function toggleCompare(id: string): { added: boolean; error?: string } {
  const list = getCompare();
  const idx = list.indexOf(id);
  if (idx >= 0) {
    list.splice(idx, 1);
    localStorage.setItem(compareKey(), JSON.stringify(list));
    return { added: false };
  }
  if (list.length >= 3) return { added: false, error: "Max 3 properties can be compared" };
  list.push(id);
  localStorage.setItem(compareKey(), JSON.stringify(list));
  return { added: true };
}

export function clearCompare(): void {
  if (typeof window !== "undefined") localStorage.removeItem(compareKey());
}
