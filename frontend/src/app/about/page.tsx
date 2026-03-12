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

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-20 bg-gray-950 text-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-amber-500 text-xs font-bold tracking-widest uppercase mb-3">Our Story</p>
          <h1 className="text-5xl font-black" style={{fontFamily:"Georgia,serif"}}>Building Hyderabad's<br />Premium Addresses</h1>
          <p className="text-gray-400 mt-4 max-w-2xl">For over 20 years, Janapriya Upscale has been creating homes that inspire, communities that thrive, and a legacy that endures.</p>
        </div>
      </div>

      {/* Mission */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center mb-20">
          <div>
            <p className="text-amber-600 text-xs font-bold tracking-widest uppercase mb-3">Our Mission</p>
            <h2 className="text-4xl font-black text-gray-900 mb-5" style={{fontFamily:"Georgia,serif"}}>We Don't Just Build Homes. We Build Lives.</h2>
            <p className="text-gray-600 leading-relaxed mb-4">At Janapriya Upscale, we believe every family deserves a space that reflects their aspirations. Our philosophy is simple: combine premium construction, thoughtful design, and transparent processes to deliver homes that stand the test of time.</p>
            <p className="text-gray-600 leading-relaxed">From the foundation to the finish, every detail is crafted with care — because when you ask more of life, we deliver more in return.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[["20+","Years Experience"],["50+","Projects Completed"],["5000+","Families Housed"],["3","Cities Present"]].map(([v,l])=>(
              <div key={l} className="bg-amber-50 rounded-2xl p-6 text-center">
                <div className="text-4xl font-black text-amber-600 mb-1">{v}</div>
                <div className="text-gray-600 text-sm font-medium">{l}</div>
              </div>
            ))}
          </div>
        </div>

              {/* ── Meet the Team ──────────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p style={{ color: "#29A9DF" }} className="text-xs font-bold tracking-widest uppercase mb-3">Leadership</p>
            <h2 className="text-4xl md:text-5xl font-black" style={{ color: "#262262" }}>Meet the Team</h2>
            <p style={{ color: "#555A5C" }} className="mt-3 max-w-xl mx-auto text-sm">
              Four decades of vision, trust, and excellence — led by people who believe in building more than just homes.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {TEAM.map((m, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 text-center transition-all duration-300 hover:-translate-y-1"
                style={{ boxShadow: "0 8px 40px rgba(42,56,135,0.1)", border: "1.5px solid #E2F1FC" }}>
                {/* Avatar */}
                <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-white text-2xl font-black mx-auto mb-5"
                  style={{ background: `linear-gradient(135deg, ${m.color}, #29A9DF)`, boxShadow: `0 8px 25px ${m.color}40` }}>
                  {m.initials}
                </div>
                {/* Name + Role */}
                <h3 className="font-black text-xl mb-1" style={{ color: "#262262" }}>{m.name}</h3>
                <p className="text-sm font-bold mb-4 px-3 py-1 rounded-full inline-block"
                  style={{ background: "#E2F1FC", color: "#2A3887" }}>{m.role}</p>
                {/* Bio */}
                <p className="text-sm leading-relaxed" style={{ color: "#555A5C" }}>{m.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
