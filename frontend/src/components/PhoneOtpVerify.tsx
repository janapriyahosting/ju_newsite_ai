"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { customerApi } from "@/lib/customerAuth";

interface PhoneOtpVerifyProps {
  purpose?: string;
  /** "login" rejects if user not found, "register" creates new user */
  mode?: "login" | "register";
  onVerified: (result: any) => void;
  /** Called when login mode fails because user doesn't exist */
  onNotFound?: () => void;
  collectProfile?: boolean;
  defaultPhone?: string;
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
}

export default function PhoneOtpVerify({
  purpose = "auth",
  mode = "register",
  onVerified,
  onNotFound,
  collectProfile = false,
  defaultPhone = "",
  title,
  subtitle,
  buttonLabel,
}: PhoneOtpVerifyProps) {
  const [step, setStep] = useState<"phone" | "otp" | "profile">("phone");
  const [phone, setPhone] = useState(defaultPhone);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const autoSubmitRef = useRef(false);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  useEffect(() => {
    if (step === "otp") otpRefs.current[0]?.focus();
  }, [step]);

  // Auto-submit when all 6 digits are entered
  const doVerify = useCallback(async (otpDigits: string[]) => {
    const code = otpDigits.join("");
    if (code.length !== 6 || loading || autoSubmitRef.current) return;
    autoSubmitRef.current = true;
    setError(""); setLoading(true);
    try {
      if (purpose === "auth") {
        if (collectProfile && step === "otp") {
          setStep("profile");
          setLoading(false);
          autoSubmitRef.current = false;
          return;
        }
        const res = await customerApi("/auth/verify-otp", {
          method: "POST",
          body: JSON.stringify({ phone, otp: code, mode, name, email, consent }),
        });
        onVerified(res);
      } else {
        const res = await customerApi("/auth/verify-phone", {
          method: "POST",
          body: JSON.stringify({ phone, otp: code }),
        });
        onVerified({ ...res, phone });
      }
    } catch (err: any) {
      const msg = err.message || "Invalid OTP";
      if (msg.includes("not found") || msg.includes("register")) {
        if (onNotFound) { onNotFound(); return; }
      }
      setError(msg);
      autoSubmitRef.current = false;
    } finally { setLoading(false); }
  }, [phone, purpose, mode, collectProfile, step, name, email, consent, loading, onVerified, onNotFound]);

  async function sendOtp() {
    const cleaned = phone.replace(/\D/g, "").replace(/^91/, "");
    if (cleaned.length !== 10) { setError("Enter a valid 10-digit mobile number"); return; }
    setError(""); setLoading(true);
    try {
      const res = await customerApi("/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ phone: cleaned, purpose }),
      });
      setPhone(cleaned);
      if (res.dev_otp) setDevOtp(res.dev_otp);
      setStep("otp");
      setCountdown(30);
      autoSubmitRef.current = false;
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    } finally { setLoading(false); }
  }

  function handleOtpChange(index: number, value: string) {
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
    // Auto-submit when 6th digit is entered
    if (value && index === 5 && newOtp.join("").length === 6) {
      setTimeout(() => doVerify(newOtp), 100);
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const digits = pasted.split("");
      setOtp(digits);
      otpRefs.current[5]?.focus();
      setTimeout(() => doVerify(digits), 100);
    }
  }

  async function submitProfile() {
    setError(""); setLoading(true);
    const code = otp.join("");
    try {
      const res = await customerApi("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ phone, otp: code, mode: "register", name, email, consent }),
      });
      onVerified(res);
    } catch (err: any) {
      setError(err.message || "Verification failed");
    } finally { setLoading(false); }
  }

  const inputStyle = { background: "#F8F9FB", border: "1.5px solid #E2F1FC", color: "#333" };

  return (
    <div className="space-y-5">
      {error && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium"
          style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FCA5A5" }}>
          {error}
        </div>
      )}
      {devOtp && (
        <div className="px-4 py-2 rounded-xl text-xs"
          style={{ background: "#FEF9C3", color: "#92400E", border: "1px solid #FDE68A" }}>
          Dev OTP: <strong>{devOtp}</strong> (SMS delivery failed — using fallback)
        </div>
      )}

      {/* Step 1: Phone Input */}
      {step === "phone" && (
        <>
          {title && <h2 className="text-lg font-bold" style={{ color: "#2A3887" }}>{title}</h2>}
          {subtitle && <p className="text-sm" style={{ color: "#555A5C" }}>{subtitle}</p>}
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "#2A3887" }}>Mobile Number</label>
            <div className="flex gap-2">
              <span className="flex items-center px-3 rounded-xl text-sm font-medium"
                style={{ ...inputStyle, color: "#666" }}>+91</span>
              <input type="tel" value={phone} maxLength={10}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="98765 43210"
                className="flex-1 px-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
                style={inputStyle}
                onKeyDown={e => { if (e.key === "Enter") sendOtp(); }}
                onFocus={e => e.target.style.borderColor = "#29A9DF"}
                onBlur={e => e.target.style.borderColor = "#E2F1FC"} />
            </div>
          </div>
          <button onClick={sendOtp} disabled={loading}
            className="w-full py-3.5 text-white font-bold rounded-xl text-sm transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #2A3887, #29A9DF)" }}>
            {loading ? <><span className="animate-spin">&#x27F3;</span> Sending OTP...</> : (buttonLabel || "Send OTP")}
          </button>
        </>
      )}

      {/* Step 2: OTP Input */}
      {step === "otp" && (
        <>
          <div>
            <p className="text-sm font-medium" style={{ color: "#2A3887" }}>
              Enter OTP sent to <strong>+91 {phone}</strong>
            </p>
            <button onClick={() => { setStep("phone"); setOtp(["","","","","",""]); setError(""); setDevOtp(null); autoSubmitRef.current = false; }}
              className="text-xs mt-1 hover:underline" style={{ color: "#29A9DF" }}>Change number</button>
          </div>
          <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
            {otp.map((digit, i) => (
              <input key={i} ref={el => { otpRefs.current[i] = el; }}
                type="text" inputMode="numeric" maxLength={1}
                value={digit}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(i, e)}
                className="w-12 h-14 text-center text-xl font-bold rounded-xl focus:outline-none transition-all"
                style={{ ...inputStyle, borderColor: digit ? "#29A9DF" : "#E2F1FC" }} />
            ))}
          </div>
          {loading && (
            <p className="text-center text-sm text-gray-400 animate-pulse">Verifying...</p>
          )}
          <div className="text-center">
            {countdown > 0
              ? <p className="text-xs" style={{ color: "#999" }}>Resend OTP in {countdown}s</p>
              : <button onClick={sendOtp} disabled={loading} className="text-xs font-bold hover:underline" style={{ color: "#29A9DF" }}>Resend OTP</button>}
          </div>
        </>
      )}

      {/* Step 3: Profile (for register flow) */}
      {step === "profile" && (
        <>
          <p className="text-sm font-medium" style={{ color: "#2A3887" }}>Almost there! Tell us about yourself.</p>
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "#2A3887" }}>Full Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all" style={inputStyle}
              onFocus={e => e.target.style.borderColor = "#29A9DF"} onBlur={e => e.target.style.borderColor = "#E2F1FC"} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "#2A3887" }}>Email (optional)</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all" style={inputStyle}
              onFocus={e => e.target.style.borderColor = "#29A9DF"} onBlur={e => e.target.style.borderColor = "#E2F1FC"} />
          </div>
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 accent-amber-500" />
            <span className="text-xs" style={{ color: "#666" }}>I agree to receive updates via SMS, WhatsApp, email, and calls about Janapriya properties.</span>
          </label>
          <button onClick={submitProfile} disabled={loading}
            className="w-full py-3.5 text-white font-bold rounded-xl text-sm transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #2A3887, #29A9DF)" }}>
            {loading ? <><span className="animate-spin">&#x27F3;</span> Creating account...</> : "Continue"}
          </button>
        </>
      )}
    </div>
  );
}
