import SessionTracker from "@/components/SessionTracker";
import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";

const lato = Lato({ weight: ["300","400","700","900"], subsets: ["latin"], display: "swap" });

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

async function getSiteSettings(): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${API}/cms/public/settings`, { next: { revalidate: 60 } });
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  const title = s.site_title || "Janapriya Upscale — Ask More of Life";
  const tagline = s.site_tagline || "Janapriya Upscale";
  const description = s.site_description || "Premium residential projects in Hyderabad. RERA registered. Ask More of Life.";
  const favicon = s.favicon_url || "/favicon.ico";
  const appleIcon = s.apple_icon_url || "/apple-icon.png";

  return {
    title: { default: title, template: `%s — ${tagline}` },
    description,
    icons: {
      icon: favicon,
      apple: appleIcon,
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={lato.className}>{children}
        <SessionTracker />
        {/* ChatBot widget is injected by <Footer /> — single instance, production HTTPS endpoint. */}
      </body>
    </html>
  );
}
