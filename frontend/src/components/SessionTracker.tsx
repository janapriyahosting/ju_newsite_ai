"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "";

function getOrCreateId(key: string): string {
  let id = localStorage.getItem(key);
  if (!id) { id = `${key}_${Date.now()}_${Math.random().toString(36).slice(2)}`; localStorage.setItem(key, id); }
  return id;
}

export default function SessionTracker() {
  const pathname = usePathname();
  const startTime = useRef(Date.now());
  const sessionId = useRef("");
  const visitorId = useRef("");

  useEffect(() => {
    // Skip admin pages
    if (pathname.startsWith("/admin")) return;
    sessionId.current = getOrCreateId("jp_session_id");
    visitorId.current = getOrCreateId("jp_visitor_id");
    startTime.current = Date.now();
  }, [pathname]);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;

    const ping = () => {
      const duration = Math.floor((Date.now() - startTime.current) / 1000);
      const customer = localStorage.getItem("jp_customer");
      let customerId = null;
      try { customerId = customer ? JSON.parse(customer).id : null; } catch {}

      const blob = new Blob([JSON.stringify({
        session_id: sessionId.current,
        visitor_id: visitorId.current,
        page_path: pathname,
        referrer: document.referrer || null,
        duration_seconds: duration,
        customer_id: customerId,
      })], {type:'application/json'});
      navigator.sendBeacon(`${API}/search/session/ping`, blob);
    };

    // Ping every 30 seconds
    const interval = setInterval(ping, 30000);
    // Ping on page unload
    window.addEventListener("beforeunload", ping);
    // Initial ping after 5s
    const timeout = setTimeout(ping, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      window.removeEventListener("beforeunload", ping);
    };
  }, [pathname]);

  return null;
}
