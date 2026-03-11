"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCompare, clearCompare } from "@/lib/savedProperties";

export default function CompareBar() {
  const [items, setItems] = useState<string[]>([]);
  const router = useRouter();

  const update = useCallback(() => setItems([...getCompare()]), []);

  useEffect(() => {
    update();
    window.addEventListener("jp_compare_update", update);
    window.addEventListener("storage", update);
    const interval = setInterval(update, 500);
    return () => {
      window.removeEventListener("jp_compare_update", update);
      window.removeEventListener("storage", update);
      clearInterval(interval);
    };
  }, [update]);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50"
      style={{ background: "#262262", borderTop: "2px solid #29A9DF", boxShadow: "0 -4px 20px rgba(0,0,0,0.3)" }}>
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-lg">⇄</span>
          <div>
            <span style={{ color: "#29A9DF" }} className="text-sm font-black">Compare Properties</span>
            <span style={{ color: "rgba(255,255,255,0.5)" }} className="text-xs ml-2">{items.length}/3 selected</span>
          </div>
          {/* Indicator dots */}
          <div className="flex gap-1.5">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full transition-all"
                style={{ background: i < items.length ? "#29A9DF" : "rgba(255,255,255,0.2)" }} />
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { clearCompare(); update(); }}
            className="px-4 py-2 text-xs font-bold rounded-full transition-all hover:bg-white/10"
            style={{ border: "1px solid rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.7)" }}>
            Clear All
          </button>
          {items.length >= 2 && (
            <button onClick={() => router.push(`/compare?ids=${items.join(",")}`)}
              className="px-5 py-2 text-xs font-bold text-white rounded-full transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg,#29A9DF,#2A3887)" }}>
              Compare Now →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
