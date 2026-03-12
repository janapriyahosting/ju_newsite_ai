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
<Footer />
    </main>
  );
}
