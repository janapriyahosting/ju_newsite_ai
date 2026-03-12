import SessionTracker from "@/components/SessionTracker";
import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";

const lato = Lato({ weight: ["300","400","700","900"], subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Janapriya Upscale — Ask More of Life", template: "%s — Janapriya Upscale" },
  description: "Premium residential projects in Hyderabad. RERA registered. Ask More of Life.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={lato.className}>{children}
        <SessionTracker /></body>
    </html>
  );
}
