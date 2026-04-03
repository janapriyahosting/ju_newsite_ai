"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PhoneOtpVerify from "@/components/PhoneOtpVerify";
import { saveSession, isLoggedIn } from "@/lib/customerAuth";

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    if (isLoggedIn()) router.replace("/dashboard");
  }, [router]);

  function handleVerified(result: any) {
    saveSession(result.access_token, result.customer);
    router.push("/dashboard");
  }

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

            {/* OTP Flow with profile collection */}
            <div className="px-8 py-8">
              <PhoneOtpVerify
                purpose="auth"
                collectProfile={true}
                onVerified={handleVerified}
                buttonLabel="Get OTP"
              />

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
