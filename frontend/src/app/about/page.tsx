import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

export const metadata = { title: "About Us — Janapriya Upscale" };

const TEAM = [
  {
    name: "K. Ravinder Reddy",
    role: "Founder & Chairman",
    bio: "With over 40 years of experience in real estate development, Mr. Ravinder Reddy has built Janapriya into one of Hyderabad's most trusted names in premium residential communities.",
    initials: "KRR",
    color: "#262262",
  },
  {
    name: "K. Kranti Kiran Reddy",
    role: "Managing Director",
    bio: "Leading Janapriya's strategic growth and operations, Mr. Kranti Kiran Reddy brings a vision for innovation in design and customer-centric development across all projects.",
    initials: "KKR",
    color: "#2A3887",
  },
  {
    name: "N. Satish Kumar",
    role: "Chief Financial Officer",
    bio: "As CFO, Mr. Satish Kumar oversees financial strategy, investment planning, and ensures Janapriya maintains the highest standards of fiscal integrity and transparency.",
    initials: "NSK",
    color: "#29A9DF",
  },
];

const VALUES = [
  { icon: "🎯", title: "Transparency", desc: "No hidden costs, no surprises. Every rupee is accounted for and every promise is kept." },
  { icon: "🏗️", title: "Quality", desc: "We use only premium materials, certified contractors, and rigorous quality checks at every stage." },
  { icon: "🤝", title: "Customer First", desc: "Your satisfaction is our standard. We are with you before, during, and after possession." },
];

const STATS = [
  ["40+", "Years of Experience"],
  ["50+", "Projects Completed"],
  ["70K+", "Happy Families"],
  ["20M+", "Sq Ft Delivered"],
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "'Lato',sans-serif" }}>
      <Navbar />

      {/* ── Hero ── */}
      <div className="pt-16" style={{ background: "linear-gradient(135deg,#262262,#2A3887)" }}>
        <div className="max-w-7xl mx-auto px-6 py-16">
          <p style={{ color: "#29A9DF" }} className="text-xs font-bold tracking-widest uppercase mb-3">Our Story</p>
          <h1 className="text-5xl md:text-6xl font-black text-white mb-4">
            Building Hyderabad&apos;s<br />
            <span style={{ color: "#29A9DF" }}>Premium Addresses</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.65)" }} className="max-w-2xl text-base leading-relaxed">
            For over 40 years, Janapriya Upscale has been creating homes that inspire, communities that thrive, and a legacy that endures.
          </p>
        </div>
        {/* Stats bar */}
        <div style={{ background: "rgba(0,0,0,0.2)" }}>
          <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map(([v, l]) => (
              <div key={l} className="text-center">
                <div className="text-3xl font-black" style={{ color: "#29A9DF" }}>{v}</div>
                <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Mission ── */}
      <section className="py-20" style={{ background: "#F8F9FB" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p style={{ color: "#29A9DF" }} className="text-xs font-bold tracking-widest uppercase mb-3">Our Mission</p>
              <h2 className="text-4xl font-black mb-5" style={{ color: "#262262" }}>
                We Don&apos;t Just Build Homes.<br />We Build Lives.
              </h2>
              <p style={{ color: "#555A5C" }} className="leading-relaxed mb-4">
                At Janapriya Upscale, we believe every family deserves a space that reflects their aspirations. Our philosophy is simple: combine premium construction, thoughtful design, and transparent processes to deliver homes that stand the test of time.
              </p>
              <p style={{ color: "#555A5C" }} className="leading-relaxed">
                From the foundation to the finish, every detail is crafted with care — because when you ask more of life, we deliver more in return.
              </p>
              <Link href="/contact" className="inline-block mt-6 px-8 py-3 text-white font-bold rounded-full text-sm"
                style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>
                Get in Touch →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {STATS.map(([v, l]) => (
                <div key={l} className="rounded-2xl p-6 text-center"
                  style={{ background: "white", border: "1.5px solid #E2F1FC", boxShadow: "0 4px 15px rgba(42,56,135,0.07)" }}>
                  <div className="text-4xl font-black mb-1" style={{ color: "#2A3887" }}>{v}</div>
                  <div className="text-sm font-medium" style={{ color: "#555A5C" }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Meet the Team ── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p style={{ color: "#29A9DF" }} className="text-xs font-bold tracking-widest uppercase mb-3">Leadership</p>
            <h2 className="text-4xl md:text-5xl font-black" style={{ color: "#262262" }}>Meet the Team</h2>
            <p className="mt-3 max-w-xl mx-auto text-sm" style={{ color: "#555A5C" }}>
              Four decades of vision, trust, and excellence — led by people who believe in building more than just homes.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {TEAM.map((m, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 text-center transition-all duration-300 hover:-translate-y-1"
                style={{ boxShadow: "0 8px 40px rgba(42,56,135,0.1)", border: "1.5px solid #E2F1FC" }}>
                {/* Avatar */}
                <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-white text-2xl font-black mx-auto mb-5"
                  style={{ background: `linear-gradient(135deg,${m.color},#29A9DF)`, boxShadow: `0 8px 25px ${m.color}40` }}>
                  {m.initials}
                </div>
                <h3 className="font-black text-xl mb-2" style={{ color: "#262262" }}>{m.name}</h3>
                <span className="text-xs font-bold px-3 py-1 rounded-full inline-block mb-4"
                  style={{ background: "#E2F1FC", color: "#2A3887" }}>{m.role}</span>
                <p className="text-sm leading-relaxed" style={{ color: "#555A5C" }}>{m.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Core Values ── */}
      <section className="py-20" style={{ background: "linear-gradient(135deg,#262262,#2A3887)" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <p style={{ color: "#29A9DF" }} className="text-xs font-bold tracking-widest uppercase mb-3">What We Stand For</p>
            <h2 className="text-4xl font-black text-white">Our Core Values</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {VALUES.map(v => (
              <div key={v.title} className="text-center rounded-2xl p-8"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div className="text-5xl mb-4">{v.icon}</div>
                <h4 className="font-black text-white text-lg mb-3">{v.title}</h4>
                <p style={{ color: "rgba(255,255,255,0.6)" }} className="text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-black mb-3" style={{ color: "#262262" }}>Ready to Find Your Dream Home?</h2>
          <p className="text-sm mb-8" style={{ color: "#555A5C" }}>Browse our premium projects or speak with our team today.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/store" className="px-8 py-3 text-white font-bold rounded-full text-sm"
              style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>
              Browse Properties →
            </Link>
            <Link href="/contact" className="px-8 py-3 font-bold rounded-full text-sm"
              style={{ border: "2px solid #2A3887", color: "#2A3887" }}>
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
