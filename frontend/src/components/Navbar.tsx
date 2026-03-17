"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { isLoggedIn, getCustomer, clearSession } from "@/lib/customerAuth";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/store", label: "Store" },
  { href: "/projects", label: "Projects" },
  { href: "/technology", label: "Technology" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [customer, setCustomer] = useState<any>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
    setCustomer(getCustomer());
  }, [pathname]);

  const transparent = isHome && !scrolled;

  function handleLogout() {
    clearSession();
    setLoggedIn(false);
    setCustomer(null);
    setUserMenuOpen(false);
    router.push("/");
  }

  return (
    <nav style={{ fontFamily: "'Lato', sans-serif" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        transparent ? "bg-transparent py-5" : "bg-white py-3 shadow-lg"
      }`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <img src={transparent ? "/logo-dark.png" : "/logo-light.png"}
            alt="Janapriya Upscale" className="h-10 w-auto transition-all duration-300" />
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map(link => (
            <Link key={link.href} href={link.href}
              style={{ color: pathname === link.href ? '#29A9DF' : transparent ? 'rgba(255,255,255,0.9)' : '#333333' }}
              className="text-sm font-semibold tracking-wide transition-colors hover:text-[#29A9DF] relative">
              {link.label}
              {pathname === link.href && (
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-[#29A9DF] rounded-full" />
              )}
            </Link>
          ))}
        </div>

        {/* CTA / User */}
        <div className="hidden md:flex items-center gap-3">
          {/* Cart icon - always visible */}
          <Link href="/cart" className="relative flex items-center justify-center w-9 h-9 rounded-full transition-all hover:bg-blue-50" title="My Cart"
            style={{ color: transparent ? "white" : "#2A3887" }}>
            🛒
          </Link>
          {loggedIn && customer ? (
            <div className="relative">
              <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-full transition-all"
                style={{ background: transparent ? "rgba(255,255,255,0.15)" : "#F0F4FF", color: transparent ? "white" : "#2A3887" }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white"
                  style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>
                  {customer.name?.[0]?.toUpperCase()}
                </div>
                <span className="text-sm font-bold">{customer.name.split(" ")[0]}</span>
                <span className="text-xs">▾</span>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border py-2 z-50"
                  style={{ border: "1px solid #E2F1FC" }}>
                  <Link href="/dashboard" onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors"
                    style={{ color: "#2A3887" }}>
                    🏠 My Dashboard
                  </Link>
                  <Link href="/dashboard" onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors"
                    style={{ color: "#2A3887" }}>
                    📋 My Bookings
                  </Link>
                  <div style={{ borderTop: "1px solid #E2F1FC" }} className="my-1" />
                  <button onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm w-full text-left hover:bg-red-50 transition-colors"
                    style={{ color: "#DC2626" }}>
                    🚪 Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login"
                className="px-4 py-2 text-sm font-bold rounded-full transition-all"
                style={{ color: transparent ? "white" : "#2A3887" }}>
                Sign In
              </Link>
              <Link href="/contact"
                className="px-5 py-2.5 text-white text-sm font-bold rounded-full transition-all hover:scale-105 hover:shadow-lg"
                style={{ background: "linear-gradient(135deg, #2A3887, #29A9DF)" }}>
                Enquire Now
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden flex flex-col gap-1.5 p-2">
          {[0,1,2].map(i => (
            <span key={i} className={`block h-0.5 transition-all ${transparent ? "bg-white" : "bg-gray-800"} ${i===2?"w-4":"w-6"}`} />
          ))}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t shadow-xl px-6 py-4 space-y-2">
          {NAV_LINKS.map(link => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}
              className={`block text-sm font-semibold py-2.5 border-b transition-colors ${pathname === link.href ? "text-[#29A9DF]" : "text-gray-700"}`}
              style={{ borderColor: "#f0f0f0" }}>
              {link.label}
            </Link>
          ))}
          {loggedIn ? (
            <>
              <Link href="/dashboard" onClick={() => setMenuOpen(false)}
                className="block text-sm font-semibold py-2.5 text-[#2A3887]">
                My Dashboard
              </Link>
              <button onClick={handleLogout}
                className="block w-full text-left text-sm font-semibold py-2.5 text-red-500">
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMenuOpen(false)}
                className="block text-sm font-semibold py-2.5 text-[#2A3887]">Sign In</Link>
              <Link href="/register" onClick={() => setMenuOpen(false)}
                className="block w-full text-center px-5 py-3 text-white text-sm font-bold rounded-full mt-2"
                style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>
                Create Account
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
