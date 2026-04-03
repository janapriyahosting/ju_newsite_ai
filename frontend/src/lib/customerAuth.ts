const API = process.env.NEXT_PUBLIC_API_URL || "http://173.168.0.81:8000/api/v1";

export interface CustomerUser {
  id: string; name: string; email: string; phone?: string;
  is_verified: boolean; is_active: boolean;
}

export async function customerApi(path: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("jp_token") : null;
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    // Token expired or invalid — clear session and redirect to login
    clearSession();
    if (typeof window !== "undefined") {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}&reason=session_expired`;
    }
    throw new Error("Session expired. Please login again.");
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}

export function getCustomer(): CustomerUser | null {
  if (typeof window === "undefined") return null;
  const s = localStorage.getItem("jp_customer");
  return s ? JSON.parse(s) : null;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("jp_token");
}

export function saveSession(token: string, customer: CustomerUser) {
  localStorage.setItem("jp_token", token);
  localStorage.setItem("jp_customer", JSON.stringify(customer));
}

export function clearSession() {
  localStorage.removeItem("jp_token");
  localStorage.removeItem("jp_customer");
}

export function isLoggedIn(): boolean {
  return !!getToken();
}
