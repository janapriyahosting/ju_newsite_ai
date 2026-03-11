"use client";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ContactPage() {
  const [form, setForm] = useState({name:"",email:"",phone:"",project:"",message:""});
  const [status, setStatus] = useState<"idle"|"loading"|"success"|"error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("http://173.168.0.81:8000/api/v1/leads", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
          name: form.name, email: form.email, phone: form.phone,
          message: form.message, source: "contact_form",
          project_interest: form.project || undefined,
        }),
      });
      if (res.ok) setStatus("success");
      else setStatus("error");
    } catch { setStatus("error"); }
  }

  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-20 bg-gray-950 text-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-amber-500 text-xs font-bold tracking-widest uppercase mb-3">Get in Touch</p>
          <h1 className="text-5xl font-black" style={{fontFamily:"Georgia,serif"}}>Let's Find Your<br />Dream Home</h1>
          <p className="text-gray-400 mt-4">Our team is ready to help you — call, email, or fill the form.</p>
        </div>
      </div>

      <section className="py-20 max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16">
          {/* Contact Info */}
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-8">Contact Information</h2>
            <div className="space-y-6 mb-10">
              {[
                {icon:"📍",label:"Office",val:"Banjara Hills, Hyderabad — 500034"},
                {icon:"📞",label:"Sales",val:"+91 40 1234 5678"},
                {icon:"💬",label:"WhatsApp",val:"+91 98765 43210"},
                {icon:"✉️",label:"Email",val:"info@janapriyaupscale.com"},
                {icon:"🕘",label:"Hours",val:"Mon–Sat: 9AM–7PM · Sun: 10AM–5PM"},
              ].map(c=>(
                <div key={c.label} className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-xl flex-shrink-0">{c.icon}</div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{c.label}</p>
                    <p className="text-gray-800 font-medium">{c.val}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Map placeholder */}
            <div className="bg-gray-100 rounded-2xl h-48 flex items-center justify-center text-gray-400 border border-gray-200">
              <div className="text-center">
                <div className="text-4xl mb-2">🗺️</div>
                <p className="text-sm">Banjara Hills, Hyderabad</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
            {status === "success" ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Thank You!</h3>
                <p className="text-gray-600">Our team will contact you within 24 hours.</p>
                <button onClick={() => { setStatus("idle"); setForm({name:"",email:"",phone:"",project:"",message:""}); }}
                  className="mt-6 px-6 py-2.5 bg-amber-500 text-white font-bold rounded-full text-sm">Submit Another</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h3 className="text-xl font-black text-gray-900 mb-6">Enquiry Form</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Name *</label>
                    <input required value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white" placeholder="Your name" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Phone *</label>
                    <input required value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white" placeholder="+91 XXXXX XXXXX" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Email</label>
                  <input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white" placeholder="your@email.com" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Interested In</label>
                  <select value={form.project} onChange={e=>setForm(f=>({...f,project:e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
                    <option value="">Select a project...</option>
                    {["Janapriya Heights","Janapriya Meadows","Janapriya Elite","Janapriya Gardens","Janapriya Skyline","Janapriya Prime"].map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Message</label>
                  <textarea rows={4} value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white resize-none" placeholder="Tell us about your requirements..." />
                </div>
                {status === "error" && <p className="text-red-500 text-sm">Something went wrong. Please try again.</p>}
                <button type="submit" disabled={status==="loading"}
                  className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl transition-colors disabled:opacity-50 text-sm tracking-wide">
                  {status === "loading" ? "Sending…" : "Submit Enquiry →"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
