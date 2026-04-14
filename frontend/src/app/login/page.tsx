"use client";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PhoneOtpVerify from "@/components/PhoneOtpVerify";
import { saveSession, isLoggedIn } from "@/lib/customerAuth";

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [notFound, setNotFound] = useState(false);

  const redirect = searchParams.get("redirect") || "/dashboard";

  useEffect(() => {
    if (isLoggedIn()) router.replace(redirect);
  }, [router, redirect]);

  function handleVerified(result: any) {
    saveSession(result.access_token, result.customer);
    router.push(redirect);
  }

  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <div className="min-h-screen flex items-center justify-center pt-20 pb-12 px-4"
        style={{ background: "linear-gradient(135deg, #F8F9FB 0%, #E2F1FC 100%)" }}>
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl overflow-hidden" style={{ boxShadow: "0 20px 60px rgba(42,56,135,0.15)" }}>
            <div className="px-8 pt-8 pb-6" style={{ background: "linear-gradient(135deg, #262262, #2A3887)" }}>
              <Link href="/"><img src="/logo-dark.png" alt="Janapriya Upscale" className="h-9 w-auto mb-6" /></Link>
              <h1 className="text-2xl font-black text-white">Welcome Back</h1>
              <p style={{ color: "rgba(255,255,255,0.65)" }} className="text-sm mt-1">Sign in with your mobile number</p>
            </div>

            <div className="px-8 py-8">
              {notFound ? (
                <div className="text-center space-y-4">
                  <div className="text-5xl">🔍</div>
                  <h3 className="text-lg font-black" style={{ color: "#2A3887" }}>Account Not Found</h3>
                  <p className="text-sm text-gray-500">
                    We couldn't find an account with this number. Please create a new account to continue.
                  </p>
                  <Link href={redirect !== "/dashboard" ? `/register?redirect=${encodeURIComponent(redirect)}` : "/register"}
                    className="block w-full py-3.5 text-white font-bold rounded-xl text-sm text-center transition-all hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #2A3887, #29A9DF)" }}>
                    Create Account
                  </Link>
                  <button onClick={() => setNotFound(false)}
                    className="text-sm hover:underline" style={{ color: "#29A9DF" }}>
                    ← Try a different number
                  </button>
                </div>
              ) : (
                <PhoneOtpVerify
                  purpose="auth"
                  mode="login"
                  collectProfile={false}
                  onVerified={handleVerified}
                  onNotFound={() => setNotFound(true)}
                  buttonLabel="Sign In with OTP"
                />
              )}

              <div className="mt-6 pt-6 text-center" style={{ borderTop: "1px solid #E2F1FC" }}>
                <p className="text-sm" style={{ color: "#555A5C" }}>
                  New to Janapriya?{" "}
                  <Link href={redirect !== "/dashboard" ? `/register?redirect=${encodeURIComponent(redirect)}` : "/register"} className="font-bold hover:underline" style={{ color: "#2A3887" }}>Create Account</Link>
                </p>
              </div>
              <div className="mt-6 flex items-center justify-center gap-6 text-xs" style={{ color: "#999" }}>
                <span>&#x1F512; Secure Login</span><span>&#xB7;</span><span>70K+ Happy Families</span><span>&#xB7;</span><span>RERA Registered</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}

export default function LoginPage() {
  return <Suspense fallback={null}><LoginInner /></Suspense>;
}
