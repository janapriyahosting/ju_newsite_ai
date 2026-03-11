import Link from "next/link";

export default function Footer() {
  return (
    <footer style={{ fontFamily: "'Lato', sans-serif", background: "#262262" }} className="text-white">
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <img src="/logo-dark.png" alt="Janapriya Upscale" className="h-10 w-auto mb-4" />
            <p style={{ color: "rgba(255,255,255,0.6)" }} className="text-sm leading-relaxed">
              Ask More of Life. Premium residential projects crafted for those who believe luxury is a way of living.
            </p>
            <div className="flex gap-3 mt-5">
              {[["f","#1877F2"],["in","#0A66C2"],["yt","#FF0000"],["li","#0077B5"]].map(([s,c]) => (
                <a key={s} href="#" aria-label={s}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold transition-transform hover:scale-110"
                  style={{ background: c }}>
                  {s}
                </a>
              ))}
            </div>
          </div>
          {/* Quick Links */}
          <div>
            <h4 style={{ color: "#29A9DF" }} className="text-sm font-bold tracking-widest uppercase mb-5">Navigation</h4>
            <ul className="space-y-3">
              {[["Home","/"],["Store","/store"],["Projects","/projects"],["Technology","/technology"],["About Us","/about"],["Contact","/contact"]].map(([l,h]) => (
                <li key={l}>
                  <Link href={h} style={{ color: "rgba(255,255,255,0.6)" }}
                    className="text-sm hover:text-white transition-colors">{l}</Link>
                </li>
              ))}
            </ul>
          </div>
          {/* Projects */}
          <div>
            <h4 style={{ color: "#29A9DF" }} className="text-sm font-bold tracking-widest uppercase mb-5">Our Projects</h4>
            <ul className="space-y-3">
              {["Janapriya Heights","Janapriya Meadows","Janapriya Elite","Janapriya Gardens","Janapriya Skyline"].map(p => (
                <li key={p}>
                  <Link href="/projects" style={{ color: "rgba(255,255,255,0.6)" }}
                    className="text-sm hover:text-white transition-colors">{p}</Link>
                </li>
              ))}
            </ul>
          </div>
          {/* Contact */}
          <div>
            <h4 style={{ color: "#29A9DF" }} className="text-sm font-bold tracking-widest uppercase mb-5">Contact Us</h4>
            <ul className="space-y-4 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
              <li className="flex gap-3"><span style={{color:"#29A9DF"}}>📍</span><span>Banjara Hills, Hyderabad — 500034</span></li>
              <li className="flex gap-3"><span style={{color:"#29A9DF"}}>📞</span><a href="tel:+914012345678" className="hover:text-white transition-colors">+91 40 1234 5678</a></li>
              <li className="flex gap-3"><span style={{color:"#29A9DF"}}>✉️</span><a href="mailto:info@janapriyaupscale.com" className="hover:text-white transition-colors">info@janapriyaupscale.com</a></li>
              <li className="flex gap-3"><span style={{color:"#29A9DF"}}>🕘</span><span>Mon–Sat: 9AM–7PM</span></li>
            </ul>
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }} className="pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p style={{ color: "rgba(255,255,255,0.4)" }} className="text-xs">© 2026 Janapriya Upscale. All rights reserved.</p>
          <p style={{ color: "rgba(255,255,255,0.4)" }} className="text-xs">RERA Registered · Ask More of Life</p>
        </div>
      </div>
    </footer>
  );
}
