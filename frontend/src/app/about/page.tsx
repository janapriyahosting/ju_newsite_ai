import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

export const metadata = { title: "About Us — Janapriya Upscale" };

const TEAM = [
  {
    name: "K. Ravinder Reddy",
    role: "Founder & Chairman",
    bio: "With over 40 years of experience in real estate development, Mr. Ravinder Reddy has built Janapriya into one of Hyderabad's most trusted names in premium residential communities.",
    image: "/ravinder-sir.png",
    color: "#262262",
  },
  {
    name: "K. Kranti Kiran Reddy",
    role: "Managing Director",
    bio: "Leading Janapriya's strategic growth and operations, Mr. Kranti Kiran Reddy brings a vision for innovation in design and customer-centric development across all projects.",
    image: "/kranti-sir.png",
    color: "#2A3887",
  },
  {
    name: "Nandanandan Reddy",
    role: "Director",
    bio: "Nandan is serving as Director of the Company and shoulders responsibility for business development, investor relations, and legal affairs.",
    image: "/nandan.png",
    color: "#29A9DF",
  },
  {
    name: "N. Satish Kumar",
    role: "Chief Financial Officer",
    bio: "As CFO, Mr. Satish Kumar oversees financial strategy, investment planning, and ensures Janapriya maintains the highest standards of fiscal integrity and transparency.",
    image: "/satish-sir.jpg",
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
      <div className="pt-16" style={{
  backgroundImage: "url('/banner.jpg')",
  backgroundSize: "cover",
  height: "600px",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat"
}}>
        
        
       
      </div>

      {/* ── Mission ── */}
      <section className="py-20" style={{ background: "#F8F9FB" }}>
        <div className="max-w-7xl mx-auto px-12">
          <div className="grid md:grid-cols-1 gap-16 items-center">
            <div>
              <p style={{ color: "#29A9DF" }} className="text-xs font-bold tracking-widest uppercase mb-3">Our Mission</p>
              <h2 className="text-4xl font-black mb-5" style={{ color: "#262262" }}>
                We Don&apos;t Just Build Homes.<br />We Build Lives.
              </h2>
              <p style={{ color: "#555A5C" }} className="leading-relaxed mb-4">
                Janapriya Homes came into existence in the late eighties under Mr. Ravinder Reddy’s (Chairman) guidance amid the real estate boom wave. The prime objective then was to build an ideal solution for home buyers seeking homes within a specified budget. As a result, Janapriya has been building homes of all sizes, types, and styles For the past 40 years. In its pursuit of bringing real estate to many and supporting every step of the way. For the past 39 years. Since 1985, we’ve delivered 26,250 homes to our valued customers, starting with 700 homes in 1985 to 26,250-plus delivered homes as of March 2017 in Bangalore & Hyderabad. Today, we’re one of the most reputable building companies in South India.  </p>
              <p style={{ color: "#555A5C" }} className="leading-relaxed mb-4">
               In the early 90s, our Chairman had a far-sightedness and a vision that everyone must own a home. He made it possible by cutting down on third-party expenses, reducing construction costs and maintaining quality. As a result, we accomplished many feats that lessened the burden on the buyer due to our in-depth expertise. For example, we have an in-house Brick manufacturing facility, crusher, and concrete plant, and we even make door and window frames.</p>
              <p style={{ color: "#555A5C" }} className="leading-relaxed mb-4">To make things easier – when sanctions on home loans were challenging, we introduced a friendly financing option that allowed home buyers to walk in with just Rs. 10,000 as an initial payment and own a home. He created the belief – Anyone could walk into Janapriya’s office and leave with a home.</p>
			  
			  <p style={{ color: "#555A5C" }} className="leading-relaxed ">We will keep pace with the ever-more demands of today’s discerning home buyers through our various land parcels in Bengaluru & Hyderabad. We build homes that reflect your personality. So if you’re looking for an apartment, a villa, or a house of your own, you’ll find something within our portfolio.</p>
			  
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
        You can dream, create, design, and build the most wonderful place in the world. But it requires people to make the dream a reality.
      </p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
      {TEAM.map((m, i) => (
        <div key={i} className="bg-white rounded-3xl p-8 text-center transition-all duration-300 hover:-translate-y-1"
          style={{ boxShadow: "0 8px 40px rgba(42,56,135,0.1)", border: "1.5px solid #E2F1FC" }}>
          {/* Avatar */}
          <div className="mx-auto mb-5 w-24 h-24 rounded-2xl overflow-hidden"
            style={{ boxShadow: `0 8px 25px ${m.color}40`, border: `2px solid ${m.color}` }}>
            <img
              src={m.image}
              alt={m.name}
              className="w-full h-full object-cover"
            />
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
