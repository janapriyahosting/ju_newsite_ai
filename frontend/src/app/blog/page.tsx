"use client";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

const POSTS = [
  {
    tag: "Podcast",
    title: "Podcast With JANAPRIYA UPSCALE Managing Director Kranti Kiran Reddy",
    date: "Dec 12, 2024",
    videoId: "WsEVKn7uQFU",
    desc: "An in-depth conversation with Managing Director Kranti Kiran Reddy on Janapriya Upscale's vision, upcoming projects, and what makes their homes stand out in Hyderabad's real estate market.",
  },
  {
    tag: "Sakshi Property Plus",
    title: "Sakshi Property Plus: Janapriya Upscale MD – Mr. Kranti Kiran Reddy Exclusive Interview | Real Estate",
    date: "Nov 28, 2024",
    videoId: "hmR4J7nbEII",
    desc: "Sakshi Property Plus sits down with Mr. Kranti Kiran Reddy for an exclusive interview covering real estate trends, affordable housing, and Janapriya's expansion plans across Hyderabad.",
  },
  {
    tag: "TDR GO Explained",
    title: "TDR GO Explained: Controls on Redemption & Pricing | HMTV Panel Discussion",
    date: "Apr 01, 2026",
    videoId: "mhdoj1VQGzs",
    desc: "HMTV hosts a detailed panel discussion on TDR GO — how it controls redemption and pricing in Hyderabad real estate, and what it means for developers and homebuyers alike.",
  },
];

const CATEGORIES = ["All", "Podcast", "Sakshi Property Plus", "TDR GO Explained"];

const TAG_COLORS: Record<string, { bg: string; color: string }> = {
  "Podcast":              { bg: "#EEF1FB", color: "#273b84" },
  "Sakshi Property Plus": { bg: "#EEF8F2", color: "#1D7A52" },
  "TDR GO Explained":     { bg: "#FEF3C7", color: "#92400E" },
};

export default function BlogPage() {
  const [playing, setPlaying] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = activeCategory === "All"
    ? POSTS
    : POSTS.filter(p => p.tag === activeCategory);

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "'Lato', sans-serif" }}>
      <Navbar />

      {/* ── Hero Banner (same style as About page) ── */}
      <div
        className="pt-16"
        style={{
          backgroundImage: "url('/banner.jpg')",
          backgroundSize: "cover",
          height: "600px",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* ── Intro Section (mirrors About page Mission section) ── */}
      <section className="py-20" style={{ background: "#F8F9FB" }}>
        <div className="max-w-7xl mx-auto px-12">
          <p style={{ color: "#29A9DF" }} className="text-xs font-bold tracking-widest uppercase mb-3">
            Media & Insights
          </p>
          <h2 className="text-4xl font-black mb-5" style={{ color: "#262262" }}>
            Blog, News &amp;<br />Exclusive Interviews
          </h2>
          <p style={{ color: "#555A5C" }} className="leading-relaxed mb-4 max-w-3xl">
            Stay updated with the latest news, expert interviews, and market insights from Janapriya Upscale's leadership team. Watch our exclusive media appearances and panel discussions on Hyderabad real estate.
          </p>
        </div>
      </section>

      {/* ── Category Filter ── */}
      <section className="bg-white" style={{ borderBottom: "1px solid #EAECF0" }}>
        <div className="max-w-7xl mx-auto px-12">
          <div style={{ display: "flex", gap: 4, overflowX: "auto", padding: "14px 0" }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: "8px 20px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  fontFamily: "inherit",
                  transition: "all 0.18s",
                  background: activeCategory === cat ? "#2A3887" : "transparent",
                  color: activeCategory === cat ? "white" : "#6B7280",
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Posts Grid (mirrors Meet the Team grid) ── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p style={{ color: "#29A9DF" }} className="text-xs font-bold tracking-widest uppercase mb-3">
              Latest
            </p>
            <h2 className="text-4xl md:text-5xl font-black" style={{ color: "#262262" }}>
              Articles &amp; Videos
            </h2>
            <p className="mt-3 max-w-xl mx-auto text-sm" style={{ color: "#555A5C" }}>
              {filtered.length} article{filtered.length !== 1 ? "s" : ""} — watch our exclusive media coverage and expert discussions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {filtered.map(post => {
              const tagStyle = TAG_COLORS[post.tag] || { bg: "#EEF1FB", color: "#273b84" };
              const isPlaying = playing === post.tag;

              return (
                <div
                  key={post.tag}
                  className="bg-white rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
                  style={{ boxShadow: "0 8px 40px rgba(42,56,135,0.1)", border: "1.5px solid #E2F1FC" }}
                >
                  {/* Video thumbnail area */}
                  <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", background: "#000" }}>
                    {isPlaying ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${post.videoId}?autoplay=1&rel=0`}
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                      />
                    ) : (
                      <>
                        <img
                          src={`https://img.youtube.com/vi/${post.videoId}/hqdefault.jpg`}
                          alt={post.title}
                          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
                        />
                        <div
                          onClick={() => setPlaying(post.tag)}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.38)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "rgba(0,0,0,0.2)")}
                          style={{
                            position: "absolute", inset: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: "rgba(0,0,0,0.2)", cursor: "pointer", transition: "background 0.2s",
                          }}
                        >
                          <div style={{
                            width: 52, height: 52,
                            background: "rgba(255,255,255,0.92)",
                            borderRadius: "50%",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
                          }}>
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                              <polygon points="5,2 16,9 5,16" fill="#2A3887" />
                            </svg>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="p-6">
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <span style={{
                        ...tagStyle,
                        fontSize: 10, fontWeight: 800,
                        letterSpacing: "0.07em", textTransform: "uppercase",
                        borderRadius: 6, padding: "3px 10px",
                      }}>
                        {post.tag}
                      </span>
                      <span style={{ color: "#9CA3AF", fontSize: 11 }}>{post.date}</span>
                    </div>

                    <h3 className="font-black text-base leading-snug mb-3" style={{ color: "#262262" }}>
                      {post.title}
                    </h3>

                    <p className="text-sm leading-relaxed mb-4" style={{ color: "#555A5C" }}>
                      {post.desc}
                    </p>

                    <button
                      onClick={() => setPlaying(post.tag)}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        color: "#2A3887", fontSize: 13, fontWeight: 800,
                        background: "none", border: "none", cursor: "pointer",
                        padding: 0, fontFamily: "inherit",
                      }}
                    >
                      Watch now →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA (same as About page CTA) ── */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-black mb-3" style={{ color: "#262262" }}>
            Ready to Find Your Dream Home?
          </h2>
          <p className="text-sm mb-8" style={{ color: "#555A5C" }}>
            Browse our premium projects or speak with our team today.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/store"
              className="px-8 py-3 text-white font-bold rounded-full text-sm"
              style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}
            >
              Browse Properties →
            </Link>
            <Link
              href="/contact"
              className="px-8 py-3 font-bold rounded-full text-sm"
              style={{ border: "2px solid #2A3887", color: "#2A3887" }}
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}