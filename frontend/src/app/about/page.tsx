import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

export const metadata = { title: "About Us — Janapriya Upscale" };

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

        {/* Team */}
        <div className="text-center mb-12">
          <p className="text-amber-600 text-xs font-bold tracking-widest uppercase mb-3">Leadership</p>
          <h2 className="text-4xl font-black text-gray-900" style={{fontFamily:"Georgia,serif"}}>Meet the Team</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
          {[
            {name:"Ramesh Janapriya",role:"Founder & Chairman",color:"from-blue-600 to-blue-800"},
            {name:"Sunita Reddy",role:"Managing Director",color:"from-emerald-600 to-emerald-800"},
            {name:"Arun Kumar",role:"Chief Architect",color:"from-amber-500 to-amber-700"},
            {name:"Priya Mehta",role:"Head of Sales",color:"from-rose-500 to-rose-700"},
          ].map(m=>(
            <div key={m.name} className="text-center group">
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${m.color} mx-auto mb-3 flex items-center justify-center text-3xl text-white font-black group-hover:scale-110 transition-transform`}>
                {m.name[0]}
              </div>
              <h4 className="font-bold text-gray-900 text-sm">{m.name}</h4>
              <p className="text-gray-500 text-xs mt-0.5">{m.role}</p>
            </div>
          ))}
        </div>

        {/* Values */}
        <div className="bg-gray-950 rounded-3xl p-10 md:p-16 text-white">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-black" style={{fontFamily:"Georgia,serif"}}>Our Core Values</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {icon:"🎯",title:"Transparency",desc:"No hidden costs, no surprises. Every rupee is accounted for and every promise is kept."},
              {icon:"🏗️",title:"Quality",desc:"We use only premium materials, certified contractors, and rigorous quality checks at every stage."},
              {icon:"🤝",title:"Customer First",desc:"Your satisfaction isn't just a goal — it's our standard. We're with you before, during and after possession."},
            ].map(v=>(
              <div key={v.title} className="text-center">
                <div className="text-5xl mb-4">{v.icon}</div>
                <h4 className="font-bold text-white text-lg mb-2">{v.title}</h4>
                <p className="text-gray-400 text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
