"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { clearCompare } from "@/lib/savedProperties";

function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const ids = (searchParams.get("ids") || "").split(",").filter(Boolean);

  useEffect(() => {
    if (ids.length === 0) { setLoading(false); return; }
    Promise.all(
      ids.map(id => fetch(`http://173.168.0.81:8000/api/v1/units/${id}`).then(r => r.json() as Promise<any>).catch(() => null))
    ).then(results => { setUnits(results.filter(Boolean)); setLoading(false); });
  }, []);

  function formatPrice(p: any) {
    if (!p) return "On Request";
    const n = parseFloat(p);
    if (n >= 10000000) return `₹${(n/10000000).toFixed(1)} Cr`;
    if (n >= 100000) return `₹${(n/100000).toFixed(0)} L`;
    return `₹${n.toLocaleString()}`;
  }

  const ROWS = [
    { label: "Unit Number", key: "unit_number" },
    { label: "Type", key: "unit_type" },
    { label: "Bedrooms", key: "bedrooms" },
    { label: "Bathrooms", key: "bathrooms" },
    { label: "Area (sqft)", key: "area_sqft" },
    { label: "Floor", key: "floor_number" },
    { label: "Price", key: "base_price", format: formatPrice },
    { label: "Status", key: "status" },
    { label: "Facing", key: "facing" },
  ];

  return (
    <main style={{ fontFamily: "'Lato',sans-serif" }} className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-20 pb-6 px-6" style={{ background: "linear-gradient(135deg,#262262,#2A3887)" }}>
        <div className="max-w-7xl mx-auto">
          <p style={{ color: "#29A9DF" }} className="text-xs font-bold tracking-widest uppercase mb-2">Side by Side</p>
          <h1 className="text-4xl font-black text-white">Compare Properties</h1>
          <p style={{ color: "rgba(255,255,255,0.6)" }} className="text-sm mt-1">Compare up to 3 properties side by side</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading properties...</div>
        ) : units.length < 2 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">⇄</div>
            <p className="font-bold text-lg mb-2" style={{ color: "#2A3887" }}>Not enough properties to compare</p>
            <p style={{ color: "#555" }} className="mb-6 text-sm">Select at least 2 properties from our listings to compare</p>
            <Link href="/store" className="inline-block px-8 py-3 text-white font-bold rounded-full"
              style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>Browse Units</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr>
                  <th className="text-left py-3 pr-6 text-sm font-black" style={{ color: "#2A3887", width: "180px" }}>Feature</th>
                  {units.map((u, i) => (
                    <th key={i} className="py-3 px-4 text-center">
                      <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>
                        <p className="text-white font-black">{u.unit_number || `Unit ${i+1}`}</p>
                        <p style={{ color: "rgba(255,255,255,0.7)" }} className="text-xs mt-1">{u.unit_type}</p>
                        <p className="text-white font-bold text-lg mt-1">{formatPrice(u.base_price)}</p>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, ri) => (
                  <tr key={row.key} style={{ background: ri % 2 === 0 ? "#F8F9FB" : "white" }}>
                    <td className="py-3 pr-6 text-sm font-bold" style={{ color: "#555A5C" }}>{row.label}</td>
                    {units.map((u, i) => (
                      <td key={i} className="py-3 px-4 text-center text-sm font-semibold" style={{ color: "#2A3887" }}>
                        {row.format ? row.format(u[row.key]) : (u[row.key] || "—")}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="py-4 pr-6"></td>
                  {units.map((u, i) => (
                    <td key={i} className="py-4 px-4 text-center">
                      <Link href={`/units/${u.id}?enquire=true`}
                        className="inline-block px-5 py-2.5 text-white text-sm font-bold rounded-xl"
                        style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>
                        Enquire Now
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-8 text-center">
          <button onClick={() => { clearCompare(); router.push("/store"); }}
            className="px-6 py-2.5 text-sm font-bold rounded-full transition-all"
            style={{ border: "1.5px solid #2A3887", color: "#2A3887" }}>
            ← Back to Listings
          </button>
        </div>
      </div>
      <Footer />
    </main>
  );
}

export default function ComparePage() {
  return <Suspense fallback={<div>Loading...</div>}><CompareContent /></Suspense>;
}
