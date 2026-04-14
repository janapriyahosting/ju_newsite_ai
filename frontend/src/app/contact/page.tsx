"use client";
import { useState, useRef, useEffect } from "react";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import Footer from "@/components/Footer";
import { customerApi } from "@/lib/customerAuth";

function useUtmParams(){
  const sp=typeof window!=='undefined'?new URLSearchParams(window.location.search):new URLSearchParams();
  return{utm_source:sp.get('utm_source')||undefined,utm_medium:sp.get('utm_medium')||undefined,utm_campaign:sp.get('utm_campaign')||undefined};
}

export default function ContactPage() {
  const utm = useUtmParams();
  const [form, setForm] = useState({ name: "", email: "", phone: "", project: "", message: "", consent: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  useEffect(() => {
    if (otpStep) otpRefs.current[0]?.focus();
  }, [otpStep]);

  function cleanPhone(p: string) {
    return p.replace(/\D/g, "").replace(/^91/, "");
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    else if (form.name.trim().length < 2) e.name = "Name must be at least 2 characters";

    const ph = cleanPhone(form.phone);
    if (!ph) e.phone = "Phone number is required";
    else if (ph.length !== 10) e.phone = "Enter a valid 10-digit mobile number";
    else if (!/^[6-9]\d{9}$/.test(ph)) e.phone = "Enter a valid Indian mobile number";

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email address";

    if (!form.consent) e.consent = "Please provide your consent to continue";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setOtpLoading(true); setOtpError("");
    try {
      const res = await customerApi("/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ phone: cleanPhone(form.phone), purpose: "lead" }),
      });
      if (res.dev_otp) setDevOtp(res.dev_otp);
      setOtpStep(true);
      setCountdown(30);
    } catch (err: any) {
      setOtpError(err.message || "Failed to send OTP");
    } finally { setOtpLoading(false); }
  }

  async function resendOtp() {
    setOtpLoading(true); setOtpError(""); setDevOtp(null);
    try {
      const res = await customerApi("/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ phone: cleanPhone(form.phone), purpose: "lead" }),
      });
      if (res.dev_otp) setDevOtp(res.dev_otp);
      setOtp(["", "", "", "", "", ""]);
      setCountdown(30);
    } catch (err: any) {
      setOtpError(err.message || "Failed to resend OTP");
    } finally { setOtpLoading(false); }
  }

  function handleOtpChange(index: number, value: string) {
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    // Auto-submit on 6th digit
    if (value && index === 5 && newOtp.join("").length === 6) {
      setTimeout(() => handleVerifyAndSubmitAuto(newOtp), 100);
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const digits = pasted.split("");
      setOtp(digits); otpRefs.current[5]?.focus();
      setTimeout(() => handleVerifyAndSubmitAuto(digits), 100);
    }
  }

  async function handleVerifyAndSubmitAuto(otpDigits: string[]) {
    const code = otpDigits.join("");
    if (code.length !== 6 || otpLoading) return;
    await doVerifyAndSubmit(code);
  }

  async function doVerifyAndSubmit(code: string) {
    setOtpLoading(true); setOtpError("");
    try {
      await customerApi("/auth/verify-phone", {
        method: "POST",
        body: JSON.stringify({ phone: cleanPhone(form.phone), otp: code }),
      });
      setStatus("loading");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(), email: form.email.trim() || undefined,
          phone: cleanPhone(form.phone), message: form.message.trim(),
          source: utm.utm_source ? "campaign" : "contact_form",
          project_interest: form.project || undefined,
          ...utm,
        }),
      });
      if (res.ok) setStatus("success");
      else setStatus("error");
    } catch (err: any) {
      setOtpError(err.message || "Verification failed");
      setStatus("idle");
    } finally { setOtpLoading(false); }
  }

  async function handleVerifyAndSubmit() {
    const code = otp.join("");
    if (code.length !== 6) { setOtpError("Enter the 6-digit OTP"); return; }
    await doVerifyAndSubmit(code);
  }

  const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#29A9DF] bg-white";
  const labelCls = "block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide";
  const errCls = "text-red-500 text-xs mt-1";

  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-16"><BackButton /></div>
      <div className="pt-4 text-white py-20" style={{ background: "linear-gradient(135deg, #262262, #2A3887)" }}>
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "#29A9DF" }}>Get in Touch</p>
          <h1 className="text-5xl font-black">Let's Find Your<br />Dream Home</h1>
          <p className="text-gray-300 mt-4">Our team is ready to help you — call, email, or fill the form.</p>
        </div>
      </div>

      <section className="py-20 max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16">
          {/* Contact Info */}
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-8">Contact Information</h2>
            <div className="space-y-6 mb-10">
              {[
                { icon: "📍", label: "Office", val: "Banjara Hills, Hyderabad — 500034" },
                { icon: "📞", label: "Sales", val: "+91 40 1234 5678" },
                { icon: "💬", label: "WhatsApp", val: "+91 98765 43210" },
                { icon: "✉️", label: "Email", val: "info@janapriyaupscale.com" },
                { icon: "🕘", label: "Hours", val: "Mon–Sat: 9AM–7PM · Sun: 10AM–5PM" },
              ].map(c => (
                <div key={c.label} className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: "#E2F1FC" }}>{c.icon}</div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{c.label}</p>
                    <p className="text-gray-800 font-medium">{c.val}</p>
                  </div>
                </div>
              ))}
            </div>
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
                <button onClick={() => { setStatus("idle"); setOtpStep(false); setOtp(["","","","","",""]); setDevOtp(null); setErrors({}); setOtpError(""); setForm({ name: "", email: "", phone: "", project: "", message: "", consent: false }); }}
                  className="mt-6 px-6 py-2.5 text-white font-bold rounded-full text-sm" style={{ background: "#2A3887" }}>Submit Another</button>
              </div>
            ) : (
              <form onSubmit={handleSendOtp} className="space-y-5">
                <h3 className="text-xl font-black text-gray-900 mb-6">Enquiry Form</h3>

                {status === "error" && <p className="text-red-500 text-sm">Something went wrong. Please try again.</p>}
                {otpError && <div className="px-4 py-3 rounded-xl text-sm" style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FCA5A5" }}>{otpError}</div>}
                {devOtp && <div className="px-4 py-2 rounded-xl text-xs" style={{ background: "#FEF9C3", color: "#92400E", border: "1px solid #FDE68A" }}>Dev OTP: <strong>{devOtp}</strong></div>}

                {/* Name + Phone */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Name *</label>
                    <input value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(er => ({ ...er, name: "" })); }}
                      disabled={otpStep} className={`${inputCls} ${errors.name ? "!border-red-400 !ring-red-200" : ""} disabled:opacity-60 disabled:bg-gray-100`} placeholder="Your name" />
                    {errors.name && <p className={errCls}>{errors.name}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>Phone *</label>
                    <input value={form.phone} onChange={e => { setForm(f => ({ ...f, phone: e.target.value })); setErrors(er => ({ ...er, phone: "" })); }}
                      disabled={otpStep} maxLength={13} className={`${inputCls} ${errors.phone ? "!border-red-400 !ring-red-200" : ""} disabled:opacity-60 disabled:bg-gray-100`} placeholder="98765 43210" />
                    {errors.phone && <p className={errCls}>{errors.phone}</p>}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" value={form.email} onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setErrors(er => ({ ...er, email: "" })); }}
                    disabled={otpStep} className={`${inputCls} ${errors.email ? "!border-red-400 !ring-red-200" : ""} disabled:opacity-60 disabled:bg-gray-100`} placeholder="your@email.com" />
                  {errors.email && <p className={errCls}>{errors.email}</p>}
                </div>

                {/* Project Interest */}
                <div>
                  <label className={labelCls}>Interested In</label>
                  <select value={form.project} onChange={e => setForm(f => ({ ...f, project: e.target.value }))}
                    disabled={otpStep} className={`${inputCls} disabled:opacity-60 disabled:bg-gray-100`}>
                    <option value="">Select a project...</option>
                    {["Janapriya Heights", "Janapriya Meadows", "Janapriya Elite", "Janapriya Gardens", "Janapriya Skyline", "Janapriya Prime"].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label className={labelCls}>Message</label>
                  <textarea rows={4} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    disabled={otpStep} className={`${inputCls} resize-none disabled:opacity-60 disabled:bg-gray-100`} placeholder="Tell us about your requirements..." />
                </div>

                {/* Consent Checkbox */}
                <div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.consent}
                      onChange={e => { setForm(f => ({ ...f, consent: e.target.checked })); setErrors(er => ({ ...er, consent: "" })); }}
                      disabled={otpStep}
                      className="mt-0.5 w-4 h-4 accent-[#2A3887] flex-shrink-0" />
                    <span className={`text-xs leading-relaxed ${errors.consent ? "text-red-500" : "text-gray-500"}`}>
                      I consent to Janapriya contacting me via phone calls, SMS, WhatsApp, and email regarding property updates, offers, and enquiry follow-ups. I understand I can opt out at any time.
                    </span>
                  </label>
                  {errors.consent && <p className={`${errCls} ml-7`}>{errors.consent}</p>}
                </div>

                {/* OTP Section — inline */}
                {otpStep ? (
                  <div className="border-t border-gray-200 pt-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-700">
                        OTP sent to <strong>+91 {cleanPhone(form.phone)}</strong>
                      </p>
                      <button type="button" onClick={() => { setOtpStep(false); setOtp(["","","","","",""]); setOtpError(""); setDevOtp(null); }}
                        className="text-xs hover:underline" style={{ color: "#29A9DF" }}>Change</button>
                    </div>

                    <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                      {otp.map((digit, i) => (
                        <input key={i} ref={el => { otpRefs.current[i] = el; }}
                          type="text" inputMode="numeric" maxLength={1}
                          value={digit}
                          onChange={e => handleOtpChange(i, e.target.value)}
                          onKeyDown={e => handleOtpKeyDown(i, e)}
                          className="w-12 h-14 text-center text-xl font-bold rounded-xl focus:outline-none transition-all"
                          style={{ background: "#fff", border: `1.5px solid ${digit ? "#2A3887" : "#E2F1FC"}`, color: "#333" }} />
                      ))}
                    </div>

                    <button type="button" onClick={handleVerifyAndSubmit} disabled={otpLoading || otp.join("").length !== 6}
                      className="w-full py-4 text-white font-black rounded-xl transition-colors disabled:opacity-50 text-sm tracking-wide hover:opacity-90"
                      style={{ background: "#2A3887" }}>
                      {otpLoading ? "Verifying..." : "Verify & Submit Enquiry"}
                    </button>

                    <div className="text-center">
                      {countdown > 0
                        ? <p className="text-xs text-gray-400">Resend OTP in {countdown}s</p>
                        : <button type="button" onClick={resendOtp} disabled={otpLoading} className="text-xs font-bold hover:underline" style={{ color: "#29A9DF" }}>Resend OTP</button>}
                    </div>
                  </div>
                ) : (
                  <button type="submit" disabled={otpLoading}
                    className="w-full py-4 text-white font-black rounded-xl transition-colors disabled:opacity-50 text-sm tracking-wide hover:opacity-90"
                    style={{ background: "#2A3887" }}>
                    {otpLoading ? "Sending OTP..." : "Submit Enquiry"}
                  </button>
                )}
              </form>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
