"use client";
import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  // The home page uses the in-app ProactiveAssistant instead of the external
  // chatbot widget. On every other page we still load the chatbot.
  const showChatbotWidget = pathname !== "/";
  return (
    <>
     
      <footer style={{ background: "#262262" }} className="text-white">
        <div className="max-w-7xl mx-auto px-6 pt-16 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">

            {/* Brand */}
            <div className="md:col-span-1">
              <img src="/logo-dark.png" alt="Janapriya Upscale" className="h-10 w-auto mb-4" />
              <p style={{ color: "rgba(255,255,255,0.6)" }} className="text-sm leading-relaxed">
                Ask More of Life. Premium residential projects crafted for those who believe luxury is a way of living.
              </p>
              {/* Social Links */}
              <div className="flex gap-3 mt-5">
                {[
                  ["f",  "#1877F2", "https://www.facebook.com/janapriyaupscaleofficial"],
                  ["in", "#0A66C2", "https://www.instagram.com/janapriya_upscale/"],
                  ["yt", "#FF0000", "https://www.youtube.com/@Janapriya_Upscale"],
                  ["li", "#0077B5", "https://www.linkedin.com/company/janapriyaupscale/"],
                  ["x",  "#000000", "https://x.com/JP_Upscale"],
                ].map(([s, c, link]) => (
                  <a
                    key={s}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold transition-transform hover:scale-110"
                    style={{ background: c }}
                  >
                    {s}
                  </a>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div>
              <h4 style={{ color: "#29A9DF" }} className="text-sm font-bold uppercase mb-5">Navigation</h4>
              <ul className="space-y-3">
                {[
                  ["Home",       "/"],
                  ["Store",      "/store"],
                  ["Projects",   "/projects"],
                  ["Technology", "/technology"],
                  ["About Us",   "/about"],
                  ["Contact",    "/contact"],
                ].map(([l, h]) => (
                  <li key={l}>
                    <Link href={h} className="text-sm text-white/60 hover:text-white">
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Projects */}
            <div>
              <h4 style={{ color: "#29A9DF" }} className="text-sm font-bold uppercase mb-5">Our Projects</h4>
              <ul className="space-y-3">
                {[
                  { name: "Elysium",    url: "/projects/elysium" },
                  { name: "First Light",url: "/projects/first-light" },
                  { name: "Altair",     url: "/projects/altair" },
                  { name: "Bahiti",     url: "/projects/bahiti" },
                  { name: "Nilevalley", url: "/projects/nilevalley" },
                  { name: "Sitara",     url: "/projects/sitara" },
                ].map((p) => (
                  <li key={p.name}>
                    <Link href={p.url} className="text-sm text-white/60 hover:text-white transition-colors">
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 style={{ color: "#29A9DF" }} className="text-sm font-bold uppercase mb-5">Contact Us</h4>
              <ul className="space-y-4 text-sm text-white/60">
                <li className="flex gap-3">📍 Banjara Hills, Hyderabad — 500034</li>
                <li className="flex gap-3">📞 +91 40 1234 5678</li>
                <li className="flex gap-3">✉️ info@janapriyaupscale.com</li>
                <li className="flex gap-3">🕘 Mon–Sat: 9AM–7PM</li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between text-xs text-white/40">
            <p>© 2026 Janapriya Upscale. All rights reserved.</p>
            <p>RERA Registered · Ask More of Life</p>
          </div>
        </div>
      </footer>
    </>
  );
}