"use client";
import AddToCartBtn from '@/components/AddToCartBtn';
import { useState, useEffect } from "react";
import Link from "next/link";
import { isSaved, toggleSaved, isInCompare, toggleCompare } from "@/lib/savedProperties";

interface PropertyCardProps {
  unit: any;
  onCompareChange?: () => void;
}

export default function PropertyCard({ unit, onCompareChange }: PropertyCardProps) {
  const [saved, setSaved] = useState(false);
  const [inCompare, setInCompare] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const [compareErr, setCompareErr] = useState("");

  useEffect(() => {
    setSaved(isSaved(unit.id));
    setInCompare(isInCompare(unit.id));
  }, [unit.id]);

  function handleSave(e: React.MouseEvent) {
    e.preventDefault();
    const added = toggleSaved(unit.id);
    setSaved(added);
  }

  function handleCompare(e: React.MouseEvent) {
    e.preventDefault();
    const result = toggleCompare(unit.id);
    if (result.error) { setCompareErr(result.error); setTimeout(() => setCompareErr(""), 3000); return; }
    setInCompare(result.added);
    onCompareChange?.();
  }

  function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    const url = `${window.location.origin}/units/${unit.id}`;
    const text = `Check out this property: ${unit.unit_number || unit.name} - ${formatPrice(unitPrice)} at Janapriya Upscale`;
    if (navigator.share) {
      navigator.share({ title: "Janapriya Upscale Property", text, url }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(`${text}\n${url}`).then(() => setShareMsg("Link copied!")).catch(() => setShareMsg("Could not copy"));
      setTimeout(() => setShareMsg(""), 2500);
    } else {
      const ta = document.createElement('textarea');
      ta.value = `${text}\n${url}`; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      setShareMsg("Link copied!");
      setTimeout(() => setShareMsg(""), 2500);
    }
  }

  const unitPrice = (() => {
    const ta = unit.custom_fields?.total_amount;
    if (ta && parseFloat(ta) > 0) return parseFloat(ta);
    return unit.base_price ? parseFloat(unit.base_price) : null;
  })();

  function formatPrice(p: any) {
    if (!p) return "Price on request";
    const n = parseFloat(p);
    if (n >= 10000000) return `₹${(n/10000000).toFixed(1)} Cr`;
    if (n >= 100000) return `₹${(n/100000).toFixed(0)} L`;
    return `₹${n.toLocaleString()}`;
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
      style={{ boxShadow: "0 4px 20px rgba(42,56,135,0.1)", border: "1px solid #E2F1FC" }}>
      {/* Image/Header */}
      <div className="h-44 relative flex flex-col justify-between p-4"
        style={{ background: "linear-gradient(135deg, #2A3887, #29A9DF)" }}>
        <div className="flex justify-between items-start">
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white"
            style={{ color: unit.status === "available" ? "#22c55e" : unit.status === "booked" ? "#ef4444" : "#f59e0b" }}>
            {unit.status || "Available"}
          </span>
          {/* Action buttons */}
          <div className="flex gap-1.5">
            <button onClick={handleSave} title={saved ? "Remove from saved" : "Save property"}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all text-sm"
              style={{ background: saved ? "#ef4444" : "rgba(255,255,255,0.2)", color: "white" }}>
              {saved ? "♥" : "♡"}
            </button>
            <button onClick={handleCompare} title={inCompare ? "Remove from compare" : "Add to compare"}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all text-sm"
              style={{ background: inCompare ? "#f59e0b" : "rgba(255,255,255,0.2)", color: "white" }}>
              ⇄
            </button>
            <button onClick={handleShare} title="Share property"
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all text-sm"
              style={{ background: "rgba(255,255,255,0.2)", color: "white" }}>
              ↗
            </button>
          </div>
        </div>
        <div>
          <p style={{ color: "rgba(255,255,255,0.7)" }} className="text-xs">{unit.unit_type?.includes("BHK") ? unit.unit_type : `${unit.unit_type || ""}${unit.bedrooms ? (unit.unit_type ? " · " : "") + unit.bedrooms + " BHK" : ""}`}</p>
          <h3 className="text-white font-black text-lg">{unit.unit_number || "Unit"}</h3>
        </div>
        {shareMsg && <div className="absolute bottom-3 right-3 px-3 py-1 bg-white rounded-full text-xs font-bold" style={{ color: "#2A3887" }}>{shareMsg}</div>}
        {compareErr && <div className="absolute bottom-3 left-3 right-3 px-3 py-1 bg-red-500 rounded-full text-xs font-bold text-white text-center">{compareErr}</div>}
      </div>
      {/* Details */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
          {[
            ["🛏", unit.bedrooms || "—", "BHK"],
            ["📐", unit.area_sqft || "—", "sqft"],
            ["🏢", unit.floor_number || "—", "Floor"],
          ].map(([icon, val, lbl]) => (
            <div key={lbl} className="rounded-lg py-2" style={{ background: "#F8F9FB" }}>
              <div className="text-sm">{icon}</div>
              <div className="font-black text-sm" style={{ color: "#2A3887" }}>{val}</div>
              <div className="text-xs" style={{ color: "#999" }}>{lbl}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="font-black text-lg" style={{ color: "#2A3887" }}>{formatPrice(unitPrice)}</span>
          <div className="flex gap-2">
            <Link href={`/units/${unit.id}?enquire=true`}
              className="px-3 py-1.5 text-xs font-bold rounded-lg"
              style={{ border: "1px solid #2A3887", color: "#2A3887" }}>
              Enquire
            </Link>
            <Link href={`/units/${unit.id}`}
              className="px-3 py-1.5 text-xs font-bold text-white rounded-lg"
              style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>
              Details →
          <div className="mt-2 flex justify-end" onClick={e=>e.preventDefault()}>
            <AddToCartBtn unitId={unit.id} size="sm" />
          </div>
            </Link>
            <div className="mt-2 px-4 pb-3 flex justify-end" onClick={e=>{e.preventDefault();e.stopPropagation();}}>
              <AddToCartBtn unitId={unit.id} status={unit.status} size="sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
