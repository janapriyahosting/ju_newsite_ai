"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import AddToCartBtn from "@/components/AddToCartBtn";
import { isSaved, toggleSaved, isInCompare, toggleCompare } from "@/lib/savedProperties";

function fmtPrice(p: any) {
  if (!p) return "Price on request";
  const n = parseFloat(p);
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(0)} L`;
  return `₹${n.toLocaleString()}`;
}

function getPrice(unit: any) {
  const ta = unit?.custom_fields?.total_amount;
  if (ta && parseFloat(ta) > 0) return parseFloat(ta);
  return unit?.base_price ? parseFloat(unit.base_price) : null;
}

interface UnitCardProps {
  unit: any;
  isTrending?: boolean;
  showActions?: boolean;           // save / compare / share buttons (default true)
  showCart?: boolean;              // AddToCart button (default true)
  onCompareChange?: () => void;
}

export default function UnitCard({
  unit,
  isTrending,
  showActions = true,
  showCart = true,
  onCompareChange,
}: UnitCardProps) {
  const [saved, setSaved]       = useState(false);
  const [inCompare, setInCompare] = useState(false);
  const [toast, setToast]       = useState("");

  useEffect(() => {
    setSaved(isSaved(unit.id));
    setInCompare(isInCompare(unit.id));
  }, [unit.id]);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2000); };

  function handleSave(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    setSaved(toggleSaved(unit.id));
    showToast(isSaved(unit.id) ? "Saved ❤️" : "Removed");
    window.dispatchEvent(new Event("jp_saved_update"));
  }
  function handleCompare(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    const r = toggleCompare(unit.id);
    if (r.error) { showToast(r.error); return; }
    setInCompare(r.added);
    showToast(r.added ? "Added to compare ⇄" : "Removed");
    window.dispatchEvent(new Event("jp_compare_update"));
    onCompareChange?.();
  }
  function fallbackCopy(text: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => showToast("Link copied! 📋")).catch(() => showToast("Could not copy"));
      return;
    }
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    showToast("Link copied! 📋");
  }
  function handleShare(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    const url = `${window.location.origin}/units/${unit.id}`;
    const text = `${unit.unit_number} — ${unit.unit_type}, ${fmtPrice(getPrice(unit))} | Janapriya Upscale`;
    if ((navigator as any).share) {
      (navigator as any).share({ title: "Janapriya Upscale", text, url }).catch(() => {});
    } else {
      fallbackCopy(`${text}\n${url}`);
    }
  }

  const statusColor =
    unit.status === "available" ? "#22c55e"
      : unit.status === "booked" ? "#ef4444"
      : unit.status === "sold"   ? "#dc2626"
      : "#f59e0b";

  const imgUrl = unit.thumbnail
    || unit.custom_fields?.series_floor_plan_3d
    || unit.custom_fields?.series_floor_plan_2d
    || (unit.images && unit.images[0])
    || "";

  const projectName = unit.project_name || "";
  const location = [unit.location, unit.city].filter(Boolean).join(", ");

  return (
    <div className="bg-white rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-1"
      style={{ boxShadow: "0 4px 20px rgba(42,56,135,0.08)", border: "1.5px solid #E2F1FC" }}>

      {/* Status + unit number + actions */}
      <div className="px-4 pt-4 pb-2 flex justify-between items-center">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-full text-xs font-black" style={{ color: statusColor }}>
            ● {(unit.status || "available").charAt(0).toUpperCase() + (unit.status || "available").slice(1)}
          </span>
          {unit.unit_number && (
            <span className="px-2.5 py-1 rounded-full text-xs font-black" style={{ background: "#F0F4FF", color: "#2A3887" }}>
              #{unit.unit_number}
            </span>
          )}
        </div>
        {showActions && (
          <div className="flex gap-1.5">
            {[
              { fn: handleSave,    icon: saved ? "♥" : "♡", bg: saved ? "rgba(239,68,68,0.15)" : "#F8F9FB", color: saved ? "#ef4444" : "#999" },
              { fn: handleCompare, icon: "⇄", bg: inCompare ? "rgba(245,158,11,0.15)" : "#F8F9FB", color: inCompare ? "#f59e0b" : "#999" },
              { fn: handleShare,   icon: "↗", bg: "#F8F9FB", color: "#999" },
            ].map((btn, i) => (
              <button key={i} onClick={btn.fn}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all hover:scale-110"
                style={{ background: btn.bg, color: btn.color }}>{btn.icon}</button>
            ))}
          </div>
        )}
      </div>

      {/* Image — object-contain so floor plans / portrait photos aren't cropped.
          Fixed aspect-ratio box keeps every card the same height in the grid. */}
      <Link href={`/units/${unit.id}`} className="block">
        <div className="relative mx-3 rounded-xl overflow-hidden"
          style={{ aspectRatio: "4 / 3", background: "#F4F6FB" }}>
          {imgUrl ? (
            <img src={imgUrl} alt={unit.unit_number}
              className="w-full h-full object-contain p-2" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#2A3887 0%,#29A9DF 100%)" }}>
              <span className="text-white text-4xl opacity-30">🏢</span>
            </div>
          )}
          {isTrending && (
            <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-xs font-bold"
              style={{ background: "rgba(245,158,11,0.9)", color: "white" }}>🔥</span>
          )}
          {toast && (
            <div className="absolute bottom-3 left-3 right-3 px-3 py-1.5 bg-white rounded-full text-xs font-bold text-center"
              style={{ color: "#2A3887" }}>{toast}</div>
          )}
        </div>
      </Link>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Project + location (new) */}
        {(projectName || location) && (
          <div className="mb-3 text-xs font-semibold flex flex-wrap items-center gap-x-2 gap-y-1" style={{ color: "#555A5C" }}>
            {projectName && <span style={{ color: "#2A3887" }}>🏢 {projectName}</span>}
            {projectName && location && <span style={{ color: "#c9c9d8" }}>·</span>}
            {location && <span>📍 {location}</span>}
          </div>
        )}

        {/* BHK / sqft / floor */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { icon: "🛏", val: unit.bedrooms || "—", label: "BHK" },
            { icon: "📐", val: unit.area_sqft ? `${parseFloat(unit.area_sqft).toFixed(0)}` : "—", label: "sqft" },
            { icon: "🏢", val: unit.floor_number ?? "—", label: "Floor" },
          ].map(s => (
            <div key={s.label} className="rounded-xl py-2 text-center" style={{ background: "#F8F9FB" }}>
              <div className="text-base">{s.icon}</div>
              <div className="font-black text-sm" style={{ color: "#2A3887" }}>{s.val}</div>
              <div className="text-xs" style={{ color: "#999" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Bath / facing / balc pills */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {unit.bathrooms && <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "#F0F4FF", color: "#2A3887" }}>🚿 {unit.bathrooms} Bath</span>}
          {unit.facing    && <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "#F0F4FF", color: "#2A3887" }}>🧭 {unit.facing}</span>}
          {unit.balconies > 0 && <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "#F0F4FF", color: "#2A3887" }}>🏡 {unit.balconies} Balc</span>}
          {unit.is_riseup_eligible && <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "rgba(41,169,223,0.15)", color: "#0b6ba6" }}>🚀 RiseUp</span>}
        </div>

        {/* Price + CTAs */}
        <div className="mt-auto flex items-center justify-between pt-3" style={{ borderTop: "1px solid #F0F4FF" }}>
          <div>
            <div className="font-black text-lg" style={{ color: "#2A3887" }}>{fmtPrice(getPrice(unit))}</div>
          </div>
          <div className="flex gap-2">
            {showCart && (
              <div onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
                <AddToCartBtn unitId={unit.id} status={unit.status} size="sm" />
              </div>
            )}
            <Link href={`/units/${unit.id}?enquire=true`}
              className="px-3 py-1.5 text-xs font-bold rounded-xl"
              style={{ border: "1.5px solid #2A3887", color: "#2A3887" }}>Enquire</Link>
            <Link href={`/units/${unit.id}`}
              className="px-3 py-1.5 text-xs font-bold text-white rounded-xl"
              style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>Details →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
