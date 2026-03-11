const KEY = "jp_saved_units";
const COMPARE_KEY = "jp_compare_units";

export function getSaved(): string[] {
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem(KEY) || "[]");
}
export function toggleSaved(id: string): boolean {
  const saved = getSaved();
  const idx = saved.indexOf(id);
  if (idx >= 0) saved.splice(idx, 1);
  else saved.push(id);
  localStorage.setItem(KEY, JSON.stringify(saved));
  return idx < 0;
}
export function isSaved(id: string): boolean {
  return getSaved().includes(id);
}

export function getCompare(): string[] {
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem(COMPARE_KEY) || "[]");
}
export function toggleCompare(id: string): { added: boolean; error?: string } {
  const list = getCompare();
  const idx = list.indexOf(id);
  if (idx >= 0) { list.splice(idx, 1); localStorage.setItem(COMPARE_KEY, JSON.stringify(list)); return { added: false }; }
  if (list.length >= 3) return { added: false, error: "Max 3 properties can be compared" };
  list.push(id);
  localStorage.setItem(COMPARE_KEY, JSON.stringify(list));
  return { added: true };
}
export function isInCompare(id: string): boolean {
  return getCompare().includes(id);
}
export function clearCompare() {
  localStorage.removeItem(COMPARE_KEY);
}
