"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { customerApi, saveSession, isLoggedIn } from "@/lib/customerAuth";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoggedIn()) router.replace("/dashboard");
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) { setError("Passwords do not match"); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const data = await customerApi("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone, password: form.password }),
      });
      saveSession(data.access_token, data.customer);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally { setLoading(false); }
  }

  const field = (key: keyof typeof form, label: string, type = "text", placeholder = "") => (
    <div>
      <label className="block text-xs font-bold mb-1.5" style={{ color: "#2A3887" }}>{label}</label>
      <input type={type} required={key !== "phone"} value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
        style={{ background: "#F8F9FB", border: "1.5px solid #E2F1FC", color: "#333" }}
        onFocus={e => e.target.style.borderColor = "#29A9DF"}
        onBlur={e => e.target.style.borderColor = "#E2F1FC"} />
    </div>
  );

  return (
    <main style={{ fontFamily: "'Lato',sans-serif" }} className="min-h-screen bg-white">
      <Navbar />
      <div className="min-h-screen flex items-center justify-center pt-20 pb-12 px-4"
        style={{ background: "linear-gradient(135deg, #F8F9FB 0%, #E2F1FC 100%)" }}>
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl overflow-hidden" style={{ boxShadow: "0 20px 60px rgba(42,56,135,0.15)" }}>
            {/* Header */}
            <div className="px-8 pt-8 pb-6" style={{ background: "linear-gradient(135deg, #262262, #2A3887)" }}>
              <Link href="/">
                <img src="/logo-dark.png" alt="Janapriya Upscale" className="h-9 w-auto mb-6" />
              </Link>
              <h1 className="text-2xl font-black text-white">Create Account</h1>
              <p style={{ color: "rgba(255,255,255,0.65)" }} className="text-sm mt-1">Join 70,000+ happy Janapriya families</p>
            </div>

            {/* Form */}
            <div className="px-8 py-8">
              {error && (
                <div className="mb-5 px-4 py-3 rounded-xl text-sm font-medium"
                  style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FCA5A5" }}>
                  ⚠ {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                {field("name", "Full Name", "text", "Your full name")}
                {field("email", "Email Address", "email", "you@example.com")}
                {field("phone", "Phone Number (optional)", "tel", "+91 98765 43210")}
                {field("password", "Password", "password", "Min. 8 characters")}
                {field("confirm", "Confirm Password", "password", "Re-enter your password")}

                <button type="submit" disabled={loading}
                  className="w-full py-3.5 text-white font-bold rounded-xl text-sm transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
                  style={{ background: "linear-gradient(135deg, #2A3887, #29A9DF)" }}>
                  {loading ? <><span className="animate-spin">⟳</span> Creating account...</> : "Create Account →"}
                </button>
              </form>

              <div className="mt-6 pt-6 text-center" style={{ borderTop: "1px solid #E2F1FC" }}>
                <p className="text-sm" style={{ color: "#555A5C" }}>
                  Already have an account?{" "}
                  <Link href="/login" className="font-bold hover:underline" style={{ color: "#2A3887" }}>Sign In</Link>
                </p>
              </div>
              <p className="mt-4 text-xs text-center" style={{ color: "#aaa" }}>
                By registering, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
