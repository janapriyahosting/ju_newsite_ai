"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { customerApi, saveSession, isLoggedIn } from "@/lib/customerAuth";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoggedIn()) router.replace("/dashboard");
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const data = await customerApi("/auth/login", {
        method: "POST",
        body: JSON.stringify(form),
      });
      saveSession(data.access_token, data.customer);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally { setLoading(false); }
  }

  return (
    <main style={{ fontFamily: "'Lato',sans-serif" }} className="min-h-screen bg-white">
      <Navbar />
      <div className="min-h-screen flex items-center justify-center pt-20 pb-12 px-4"
        style={{ background: "linear-gradient(135deg, #F8F9FB 0%, #E2F1FC 100%)" }}>
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white rounded-3xl overflow-hidden" style={{ boxShadow: "0 20px 60px rgba(42,56,135,0.15)" }}>
            {/* Header */}
            <div className="px-8 pt-8 pb-6" style={{ background: "linear-gradient(135deg, #262262, #2A3887)" }}>
              <Link href="/">
                <img src="/logo-dark.png" alt="Janapriya Upscale" className="h-9 w-auto mb-6" />
              </Link>
              <h1 className="text-2xl font-black text-white">Welcome Back</h1>
              <p style={{ color: "rgba(255,255,255,0.65)" }} className="text-sm mt-1">Sign in to your account to continue</p>
            </div>

            {/* Form */}
            <div className="px-8 py-8">
              {error && (
                <div className="mb-5 px-4 py-3 rounded-xl text-sm font-medium"
                  style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FCA5A5" }}>
                  ⚠ {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: "#2A3887" }}>Email Address</label>
                  <input type="email" required value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
                    style={{ background: "#F8F9FB", border: "1.5px solid #E2F1FC", color: "#333" }}
                    onFocus={e => e.target.style.borderColor = "#29A9DF"}
                    onBlur={e => e.target.style.borderColor = "#E2F1FC"} />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold" style={{ color: "#2A3887" }}>Password</label>
                    <Link href="/forgot-password" className="text-xs hover:underline" style={{ color: "#29A9DF" }}>Forgot password?</Link>
                  </div>
                  <input type="password" required value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
                    style={{ background: "#F8F9FB", border: "1.5px solid #E2F1FC", color: "#333" }}
                    onFocus={e => e.target.style.borderColor = "#29A9DF"}
                    onBlur={e => e.target.style.borderColor = "#E2F1FC"} />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 text-white font-bold rounded-xl text-sm transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #2A3887, #29A9DF)" }}>
                  {loading ? <><span className="animate-spin">⟳</span> Signing in...</> : "Sign In →"}
                </button>
              </form>

              <div className="mt-6 pt-6 text-center" style={{ borderTop: "1px solid #E2F1FC" }}>
                <p className="text-sm" style={{ color: "#555A5C" }}>
                  Don't have an account?{" "}
                  <Link href="/register" className="font-bold hover:underline" style={{ color: "#2A3887" }}>Create Account</Link>
                </p>
              </div>

              {/* Social proof */}
              <div className="mt-6 flex items-center justify-center gap-6 text-xs" style={{ color: "#999" }}>
                <span>🔒 Secure Login</span>
                <span>•</span>
                <span>70K+ Happy Families</span>
                <span>•</span>
                <span>RERA Registered</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
