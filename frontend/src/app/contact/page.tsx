"use client";
import { useState, useRef, useEffect } from "react";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import Footer from "@/components/Footer";
import { customerApi } from "@/lib/customerAuth";

function useUtmParams() {
  const sp = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  return {
    utm_source: sp.get("utm_source") || undefined,
    utm_medium: sp.get("utm_medium") || undefined,
    utm_campaign: sp.get("utm_campaign") || undefined,
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface OfficeInfo {
  label: string;
  align: "left" | "right";   // which side has the text vs map
  address: string;
  phone: string;
  email: string;
  mapSrc: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const OFFICES: OfficeInfo[] = [
  {
    label: "Corporate Office - Hyderabad",
    align: "right",   // text on right, map on left
    address: "D. No: 8-2-120/86/1, 3rd & 5th Floors Road no: 2, Banjara Hills, Hyderabad, Telangana - 500034",
    phone: "040 23222999",
    email: "connect@janapriya.com",
    mapSrc:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3806.736978829392!2d78.4319459!3d17.424405699999998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb97481def2f87%3A0x8c2602a2a5ef6136!2sJanapriya%20Upscale!5e0!3m2!1sen!2sin!4v1776774774645!5m2!1sen!2sin",
  },
  {
    label: "Corporate Office - Bangalore",
    align: "left",    // text on left, map on right
    address: "Unit No: 1020, Ground Floor, Ardente Office One, Hood, ITPL Main Road, Bengaluru, 560048",
    phone: "080 42419999",
    email: "sales@ardente.in",
    mapSrc:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15551.116156545484!2d77.70752577659702!3d12.98597981105859!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae119687561c5d%3A0xfcc06db075cdb384!2sARDENTE%20OFFICE%20ONE%2C%20Hoodi%2C%20Mahadevapura%2C%20Bengaluru%2C%20Karnataka%20560048!5e0!3m2!1sen!2sin!4v1776774715865!5m2!1sen!2sin",
  },
];

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconLocation() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function IconPhone() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.36 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.26 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16l.92.92z" />
    </svg>
  );
}
function IconMail() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

// ─── Office Block ─────────────────────────────────────────────────────────────

function OfficeBlock({ office }: { office: OfficeInfo }) {
  const isRightText = office.align === "right";

  const mapBlock = (
    <div className="w-full md:w-1/2 flex-shrink-0">
      <iframe
        src={office.mapSrc}
        width="100%"
        height="290"
        style={{ border: 0, display: "block" }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={office.label}
      />
    </div>
  );

  const textBlock = (
    <div className={`w-full md:w-1/2 flex-shrink-0 flex flex-col justify-start pt-4 md:pt-0 ${isRightText ? "md:pl-0" : "md:pr-0"}`}>
      {/* Label bar */}
      <div
        className="px-4 py-2 mb-4 text-sm font-semibold text-white"
        style={{ background: "#1e3a8a" }}
      >
        {office.label}
      </div>

      {/* Divider */}
      <hr className="border-gray-300 mb-4" />

      {/* Details */}
      <div className="space-y-4 px-2">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0">
            <IconLocation />
          </div>
          <p className="text-gray-700 text-sm leading-relaxed">{office.address}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <IconPhone />
          </div>
          <a href={`tel:${office.phone.replace(/\s/g, "")}`} className="text-blue-700 text-sm font-medium hover:underline">
            {office.phone}
          </a>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <IconMail />
          </div>
          <a href={`mailto:${office.email}`} className="text-blue-700 text-sm hover:underline">
            {office.email}
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row md:items-start border border-gray-200 overflow-hidden mb-0">
      {isRightText ? (
        <>
          {mapBlock}
          {textBlock}
        </>
      ) : (
        <>
          {/* Mobile: map on top */}
          <div className="md:hidden">{mapBlock}</div>
          <div className="md:hidden">{textBlock}</div>
          {/* Desktop: text left, map right */}
          <div className="hidden md:flex md:w-full md:flex-row md:items-start">
            {textBlock}
            {mapBlock}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Contact Form ─────────────────────────────────────────────────────────────

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
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
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
      const res = await customerApi("/auth/send-otp", { method: "POST", body: JSON.stringify({ phone: cleanPhone(form.phone), purpose: "lead" }) });
      if (res.dev_otp) setDevOtp(res.dev_otp);
      setOtpStep(true); setCountdown(30);
    } catch (err: any) { setOtpError(err.message || "Failed to send OTP"); }
    finally { setOtpLoading(false); }
  }

  async function resendOtp() {
    setOtpLoading(true); setOtpError(""); setDevOtp(null);
    try {
      const res = await customerApi("/auth/send-otp", { method: "POST", body: JSON.stringify({ phone: cleanPhone(form.phone), purpose: "lead" }) });
      if (res.dev_otp) setDevOtp(res.dev_otp);
      setOtp(["", "", "", "", "", ""]); setCountdown(30);
    } catch (err: any) { setOtpError(err.message || "Failed to resend OTP"); }
    finally { setOtpLoading(false); }
  }

  function handleOtpChange(index: number, value: string) {
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp]; newOtp[index] = value; setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    if (value && index === 5 && newOtp.join("").length === 6) setTimeout(() => handleVerifyAndSubmitAuto(newOtp), 100);
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) { const digits = pasted.split(""); setOtp(digits); otpRefs.current[5]?.focus(); setTimeout(() => handleVerifyAndSubmitAuto(digits), 100); }
  }

  async function handleVerifyAndSubmitAuto(otpDigits: string[]) {
    const code = otpDigits.join("");
    if (code.length !== 6 || otpLoading) return;
    await doVerifyAndSubmit(code);
  }

  async function doVerifyAndSubmit(code: string) {
    setOtpLoading(true); setOtpError("");
    try {
      await customerApi("/auth/verify-phone", { method: "POST", body: JSON.stringify({ phone: cleanPhone(form.phone), otp: code }) });
      setStatus("loading");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/leads`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim() || undefined, phone: cleanPhone(form.phone), message: form.message.trim(), source: utm.utm_source ? "campaign" : "contact_form", project_interest: form.project || undefined, ...utm }),
      });
      if (res.ok) setStatus("success"); else setStatus("error");
    } catch (err: any) { setOtpError(err.message || "Verification failed"); setStatus("idle"); }
    finally { setOtpLoading(false); }
  }

  async function handleVerifyAndSubmit() {
    const code = otp.join("");
    if (code.length !== 6) { setOtpError("Enter the 6-digit OTP"); return; }
    await doVerifyAndSubmit(code);
  }

  const inputCls = "w-full border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-700 placeholder-gray-400";
  const errCls = "text-red-500 text-xs mt-1";

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      {/* ── HERO BANNER ── */}
      <div className="pt-[60px]">
        <div className="w-full h-[220px] sm:h-[320px] md:h-[420px] xl:h-[520px] overflow-hidden">
          <img
            src="/banner.jpg"
            alt="Janapriya Upscale"
            className="w-full h-full object-cover object-center"
          />
        </div>
      </div>

      {/* ── PAGE TITLE ── */}
      <div className="text-center py-10 md:py-14">
        <h1 className="text-3xl md:text-4xl font-light text-gray-800 tracking-wide">
          Janapriya Upscale
        </h1>
      </div>

      {/* ── OFFICE BLOCKS ── */}
     <div className="mx-auto px-4 md:px-8 mb-10 md:mb-16" style={{ maxWidth: "80rem" }}>
        {OFFICES.map((office) => (
          <OfficeBlock key={office.label} office={office} />
        ))}
      </div>

      {/* ── CONTACT FORM ── */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 pb-16 md:pb-24">
        {/* Subtitle */}
        <p className="text-center text-gray-600 text-sm mb-1">We will be glad to assist you!</p>
        <p className="text-center text-gray-500 text-xs mb-6">
          Please send us your queries and one of our team member will reach out to you
        </p>

        {status === "success" ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Thank You!</h3>
            <p className="text-gray-600">Our team will contact you within 24 hours.</p>
            <button
              onClick={() => { setStatus("idle"); setOtpStep(false); setOtp(["","","","","",""]); setDevOtp(null); setErrors({}); setOtpError(""); setForm({ name: "", email: "", phone: "", project: "", message: "", consent: false }); }}
              className="mt-6 px-6 py-2.5 text-white font-bold rounded text-sm"
              style={{ background: "#1e3a8a" }}
            >
              Submit Another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendOtp} className="space-y-3">
            {status === "error" && <p className="text-red-500 text-sm">Something went wrong. Please try again.</p>}
            {otpError && <div className="px-4 py-3 text-sm" style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FCA5A5" }}>{otpError}</div>}
            {devOtp && <div className="px-4 py-2 text-xs" style={{ background: "#FEF9C3", color: "#92400E", border: "1px solid #FDE68A" }}>Dev OTP: <strong>{devOtp}</strong></div>}

            {/* Row 1: Name | Email | Phone */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  value={form.name}
                  onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setErrors((er) => ({ ...er, name: "" })); }}
                  disabled={otpStep}
                  className={`${inputCls} ${errors.name ? "!border-red-400" : ""} disabled:opacity-60 disabled:bg-gray-100`}
                  placeholder="Name"
                />
                {errors.name && <p className={errCls}>{errors.name}</p>}
              </div>
              <div className="flex-1">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => { setForm((f) => ({ ...f, email: e.target.value })); setErrors((er) => ({ ...er, email: "" })); }}
                  disabled={otpStep}
                  className={`${inputCls} ${errors.email ? "!border-red-400" : ""} disabled:opacity-60 disabled:bg-gray-100`}
                  placeholder="Email Id"
                />
                {errors.email && <p className={errCls}>{errors.email}</p>}
              </div>
              <div className="flex-1">
                <input
                  value={form.phone}
                  onChange={(e) => { setForm((f) => ({ ...f, phone: e.target.value })); setErrors((er) => ({ ...er, phone: "" })); }}
                  disabled={otpStep}
                  maxLength={13}
                  className={`${inputCls} ${errors.phone ? "!border-red-400" : ""} disabled:opacity-60 disabled:bg-gray-100`}
                  placeholder="Phone"
                />
                {errors.phone && <p className={errCls}>{errors.phone}</p>}
              </div>
            </div>

            {/* Row 2: Message */}
            <div>
              <textarea
                rows={4}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                disabled={otpStep}
                className={`${inputCls} resize-none disabled:opacity-60 disabled:bg-gray-100`}
                placeholder="Type your message here"
              />
            </div>

            {/* Consent */}
            <div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => { setForm((f) => ({ ...f, consent: e.target.checked })); setErrors((er) => ({ ...er, consent: "" })); }}
                  disabled={otpStep}
                  className="mt-0.5 w-4 h-4 accent-blue-800 flex-shrink-0"
                />
                <span className={`text-xs leading-relaxed ${errors.consent ? "text-red-500" : "text-gray-500"}`}>
                  I consent to Janapriya contacting me via phone calls, SMS, WhatsApp, and email regarding property updates, offers, and enquiry follow-ups.
                </span>
              </label>
              {errors.consent && <p className={`${errCls} ml-7`}>{errors.consent}</p>}
            </div>

            {/* OTP Step */}
            {otpStep ? (
              <div className="border-t border-gray-200 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">
                    OTP sent to <strong>+91 {cleanPhone(form.phone)}</strong>
                  </p>
                  <button type="button" onClick={() => { setOtpStep(false); setOtp(["","","","","",""]); setOtpError(""); setDevOtp(null); }}
                    className="text-xs hover:underline text-blue-700">Change</button>
                </div>
                <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input key={i} ref={(el) => { otpRefs.current[i] = el; }}
                      type="text" inputMode="numeric" maxLength={1} value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-11 h-13 text-center text-xl font-bold focus:outline-none transition-all"
                      style={{ background: "#fff", border: `1.5px solid ${digit ? "#1e3a8a" : "#d1d5db"}`, color: "#333" }} />
                  ))}
                </div>
                <button type="button" onClick={handleVerifyAndSubmit} disabled={otpLoading || otp.join("").length !== 6}
                  className="px-8 py-2.5 text-white font-bold text-sm disabled:opacity-50 hover:opacity-90 float-right"
                  style={{ background: "#2563eb" }}>
                  {otpLoading ? "Verifying..." : "Verify & Submit"}
                </button>
                <div className="clear-both text-center pt-2">
                  {countdown > 0
                    ? <p className="text-xs text-gray-400">Resend OTP in {countdown}s</p>
                    : <button type="button" onClick={resendOtp} disabled={otpLoading} className="text-xs font-bold hover:underline text-blue-700">Resend OTP</button>}
                </div>
              </div>
            ) : (
              /* Submit button — right aligned like screenshot */
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={otpLoading}
                  className="px-10 py-2.5 text-white font-semibold text-sm disabled:opacity-50 hover:opacity-90"
                  style={{ background: "#2563eb" }}
                >
                  {otpLoading ? "Sending OTP..." : "Submit"}
                </button>
              </div>
            )}
          </form>
        )}
      </div>

      <Footer />
    </main>
  );
}