import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import Footer from "@/components/Footer";

export const metadata = { title: "Technology — Janapriya Upscale" };

export default function TechnologyPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-16"><BackButton /></div>
      <div className="pt-4 bg-gray-950 text-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-amber-500 text-xs font-bold tracking-widest uppercase mb-3">Innovation</p>
          <h1 className="text-5xl font-black">Technology at<br />Janapriya Upscale</h1>
          <p className="text-gray-400 mt-4 max-w-2xl">We build the future, not just homes. Explore the smart technologies and digital tools that power every Janapriya project.</p>
        </div>
      </div>

      {/* Smart Home */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center mb-20">
          <div>
            <p className="text-amber-600 text-xs font-bold tracking-widest uppercase mb-3">Smart Living</p>
            <h2 className="text-4xl font-black text-gray-900 mb-5">AI-Powered Smart Homes</h2>
            <p className="text-gray-600 leading-relaxed mb-6">Every Janapriya home is equipped with a fully integrated smart home system — voice-controlled lighting, automated security, climate control, and energy monitoring from your smartphone.</p>
            <ul className="space-y-3">
              {["Voice-controlled home automation","Smart energy management & solar ready","Video surveillance & biometric entry","Remote access via mobile app"].map(f=>(
                <li key={f} className="flex gap-3 text-gray-700 text-sm"><span className="text-amber-500 mt-0.5">◆</span>{f}</li>
              ))}
            </ul>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl p-10 text-center">
            <div className="text-8xl mb-4">🏠</div>
            <p className="text-2xl font-black text-gray-900">Smart Home Ready</p>
            <p className="text-gray-500 text-sm mt-2">All units pre-wired for automation</p>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-black text-gray-900">Our Technology Stack</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
          {[
            {icon:"🛰️",title:"3D BIM Modeling",desc:"Building Information Modeling for precision construction"},
            {icon:"⚡",title:"EV Charging",desc:"EV charging infrastructure in every parking bay"},
            {icon:"🌱",title:"Green Building",desc:"IGBC certified eco-friendly construction"},
            {icon:"📱",title:"JP Digital App",desc:"Manage your home, payments and services online"},
            {icon:"🔒",title:"Biometric Security",desc:"Fingerprint & face recognition access control"},
            {icon:"💧",title:"Smart Water Mgmt",desc:"Rainwater harvesting & automated irrigation"},
            {icon:"☀️",title:"Solar Ready",desc:"Rooftop solar panels on all premium units"},
            {icon:"📡",title:"Fiber Broadband",desc:"1 Gbps fiber connectivity in every unit"},
          ].map(t=>(
            <div key={t.title} className="bg-gray-50 rounded-2xl p-5 hover:bg-amber-50 hover:border-amber-200 border border-transparent transition-all">
              <div className="text-3xl mb-3">{t.icon}</div>
              <h4 className="font-bold text-gray-900 text-sm mb-1">{t.title}</h4>
              <p className="text-gray-500 text-xs">{t.desc}</p>
            </div>
          ))}
        </div>

        {/* Digital Platform */}
        <div className="bg-gray-950 rounded-3xl p-10 md:p-16 text-center text-white">
          <p className="text-amber-500 text-xs font-bold tracking-widest uppercase mb-3">Coming Soon</p>
          <h2 className="text-4xl font-black mb-4">JP Digital Platform</h2>
          <p className="text-gray-400 max-w-xl mx-auto mb-8">Book site visits, track construction progress, make payments, and manage your home — all from one app.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <div className="px-6 py-3 bg-white/10 rounded-full text-sm font-bold border border-white/20">📱 iOS & Android App</div>
            <div className="px-6 py-3 bg-white/10 rounded-full text-sm font-bold border border-white/20">🖥️ Web Portal</div>
            <div className="px-6 py-3 bg-white/10 rounded-full text-sm font-bold border border-white/20">💬 WhatsApp Integration</div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
