const BASE_KEY = "jp_saved_units";

function getKey(): string {
  try {
    const raw = localStorage.getItem("jp_customer");
    const customer = raw ? JSON.parse(raw) : null;
    if (customer?.id) return `${BASE_KEY}_${customer.id}`;
  } catch {}
  return BASE_KEY; // fallback for guests
}

export function getSaved(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(getKey()) || "[]");
  } catch { return []; }
}

export function isSaved(unitId: string): boolean {
  return getSaved().includes(unitId);
}

export function toggleSaved(unitId: string): boolean {
  const saved = getSaved();
  const idx = saved.indexOf(unitId);
  let next: string[];
  if (idx >= 0) {
    next = saved.filter(id => id !== unitId);
  } else {
    next = [...saved, unitId];
  }
  localStorage.setItem(getKey(), JSON.stringify(next));
  return idx < 0; // true = added
}

export function clearSaved(): void {
  localStorage.removeItem(getKey());
}
