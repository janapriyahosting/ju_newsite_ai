"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const ALL_PROJECTS = [
  {name:"Janapriya Heights",loc:"Gachibowli",type:"2 & 3 BHK",price:"₹45L – ₹85L",units:120,status:"Ready to Move",statusColor:"#22c55e",desc:"Spacious apartments with premium amenities in the IT hub of Hyderabad."},
  {name:"Janapriya Meadows",loc:"Kompally",type:"Villas & Row Houses",price:"₹85L – ₹1.5Cr",units:60,status:"Under Construction",statusColor:"#f59e0b",desc:"Independent villas with private gardens in a gated community."},
  {name:"Janapriya Elite",loc:"Banjara Hills",type:"Luxury Apts",price:"₹1.2Cr – ₹2.5Cr",units:48,status:"New Launch",statusColor:"#29A9DF",desc:"Ultra-luxury apartments in the most premium address in Hyderabad."},
  {name:"Janapriya Gardens",loc:"Miyapur",type:"2 BHK",price:"₹38L – ₹55L",units:200,status:"Ready to Move",statusColor:"#22c55e",desc:"Affordable luxury with lush green surroundings and excellent connectivity."},
  {name:"Janapriya Skyline",loc:"Kukatpally",type:"3 & 4 BHK",price:"₹75L – ₹1.2Cr",units:80,status:"Under Construction",statusColor:"#f59e0b",desc:"Sky-high living with panoramic city views and world-class facilities."},
  {name:"Janapriya Prime",loc:"Madhapur",type:"Studio & 1 BHK",price:"₹28L – ₹45L",units:150,status:"New Launch",statusColor:"#29A9DF",desc:"Smart compact homes ideal for professionals and young families."},
];

const FILTERS = ["All","Ready to Move","Under Construction","New Launch"];

export default function ProjectsPage() {
  const [filter, setFilter] = useState("All");
  const filtered = ALL_PROJECTS.filter(p => filter==="All" || p.status===filter);

  return (
    <main style={{ fontFamily:"'Lato',sans-serif" }} className="min-h-screen bg-white">
      <Navbar />

      {/* Header */}
      <div className="pt-20 py-16" style={{ background:"linear-gradient(135deg,#262262,#2A3887)" }}>
        <div className="max-w-7xl mx-auto px-6">
          <p style={{ color:"#29A9DF" }} className="text-xs font-bold tracking-widest uppercase mb-3">Our Portfolio</p>
          <h1 className="text-5xl font-black text-white">Our Projects</h1>
          <p style={{ color:"rgba(255,255,255,0.7)" }} className="mt-3 max-w-xl">Explore premium residential communities built for every aspiration — from affordable homes to ultra-luxury living.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="sticky top-16 z-30 bg-white border-b py-4 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap gap-3 items-center">
          <span style={{ color:"#555" }} className="text-sm font-semibold mr-2">Filter:</span>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-4 py-1.5 rounded-full text-xs font-bold border transition-all"
              style={filter===f
                ? { background:"#2A3887", color:"white", borderColor:"#2A3887" }
                : { background:"white", color:"#555", borderColor:"#ddd" }}>
              {f}
            </button>
          ))}
          <span style={{ color:"#29A9DF" }} className="ml-auto text-sm font-bold">{filtered.length} Projects</span>
        </div>
      </div>

      <section className="py-16 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map(p => (
            <div key={p.name} className="bg-white rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
              style={{ boxShadow:"0 4px 20px rgba(42,56,135,0.1)", border:"1px solid #E2F1FC" }}>
              <div className="h-52 relative flex flex-col justify-between p-5"
                style={{ background:"linear-gradient(135deg,#2A3887,#29A9DF)" }}>
                <div className="flex justify-between items-start">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-white" style={{ color:p.statusColor }}>{p.status}</span>
                  <span className="text-xs font-bold text-white/70 bg-white/10 px-3 py-1 rounded-full">{p.units} units</span>
                </div>
                <div>
                  <p style={{ color:"rgba(255,255,255,0.7)" }} className="text-xs mb-1">{p.type}</p>
                  <h3 className="text-white font-black text-xl">{p.name}</h3>
                </div>
              </div>
              <div className="p-6">
                <p style={{ color:"#555A5C" }} className="text-sm mb-2">📍 {p.loc}, Hyderabad</p>
                <p style={{ color:"#555A5C" }} className="text-xs mb-4 leading-relaxed">{p.desc}</p>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-black text-lg" style={{ color:"#2A3887" }}>{p.price}</span>
                </div>
                <div className="flex gap-2">
                  <Link href="/contact" className="flex-1 text-center py-2.5 text-white text-sm font-bold rounded-xl transition-colors"
                    style={{ background:"linear-gradient(135deg,#2A3887,#29A9DF)" }}>Enquire</Link>
                  <Link href="/contact" className="flex-1 text-center py-2.5 text-sm font-bold rounded-xl transition-colors"
                    style={{ border:"1px solid #2A3887", color:"#2A3887" }}>Site Visit</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16" style={{ background:"#F8F9FB" }}>
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-black mb-3" style={{ color:"#262262" }}>Can't Find What You're Looking For?</h2>
          <p style={{ color:"#555A5C" }} className="mb-8">Talk to our project advisors — we'll match you with the perfect home.</p>
          <Link href="/contact" className="inline-block px-8 py-4 text-white font-bold rounded-full transition-all hover:scale-105"
            style={{ background:"linear-gradient(135deg,#2A3887,#29A9DF)" }}>Talk to an Advisor</Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
