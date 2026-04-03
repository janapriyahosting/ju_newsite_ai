"use client";
import AddToCartBtn from '@/components/AddToCartBtn';
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

/* ─────────────────────────────────────────────────────────────────────────────
   SEARCH FILTER DATA
   ✅ Image paths corrected to match actual filenames in /public
───────────────────────────────────────────────────────────────────────────── */
const PAYMENTS = [
  {
    id: "easy-budget",
    label: "AN EASY BUDGET",
    headline: "Allows you to buy a home for the loved",
    image: "/AnEasyBudget.webp",                  // ✅ exists
    buttons: [
      { text: "₹ 1.3Cr+", sub: "is my budget", href: "/property-listing/?widget_id=2&kind=0&sf_unit_field_3076=167&sf_unit_field_3077=167&sf_unit_field_3078=167&sf_select_field_3093=-1&sf_select_field_3094=-1&sf_min_field_3076=13000000&sf_min_field_3077=-1&sf_min_field_3078=-1&sf_unit_living_area=1&sf_min_living_area=-1&sf_tmin_bedrooms=-1&sf_tmin_bathrooms=-1&wplpage=1&wplview=property_listing&wplpagination=normal" },
      { text: "₹ 90L+",   sub: "is my budget", href: "/property-listing/?widget_id=2&kind=0&sf_unit_field_3076=167&sf_unit_field_3077=167&sf_unit_field_3078=167&sf_select_field_3093=-1&sf_select_field_3094=-1&sf_min_field_3076=9000000&sf_min_field_3077=-1&sf_min_field_3078=-1&sf_unit_living_area=1&sf_min_living_area=-1&sf_tmin_bedrooms=-1&sf_tmin_bathrooms=-1&wplpage=1&wplview=property_listing&wplpagination=normal" },
      { text: "₹ 70L+",   sub: "is my budget", href: "/property-listing/?widget_id=2&kind=0&sf_unit_field_3076=167&sf_unit_field_3077=167&sf_unit_field_3078=167&sf_select_field_3093=-1&sf_select_field_3094=-1&sf_min_field_3076=7000000&sf_min_field_3077=-1&sf_min_field_3078=-1&sf_unit_living_area=1&sf_min_living_area=-1&sf_tmin_bedrooms=-1&sf_tmin_bathrooms=-1&wplpage=1&wplview=property_listing&wplpagination=normal" },
      { text: "₹ 50L+",   sub: "is my budget", href: "/property-listing/?widget_id=2&kind=0&sf_unit_field_3076=167&sf_unit_field_3077=167&sf_unit_field_3078=167&sf_select_field_3093=-1&sf_select_field_3094=-1&sf_min_field_3076=5000000&sf_min_field_3077=-1&sf_min_field_3078=-1&sf_unit_living_area=1&sf_min_living_area=-1&sf_tmin_bedrooms=-1&sf_tmin_bathrooms=-1&wplpage=1&wplview=property_listing&wplpagination=normal" },
    ],
  },
  {
    id: "lighter-emi",
    label: "A LIGHTER EMI",
    headline: "Lets your family enjoy a good lifestyle",
    image: "/ALighterEMI.webp",                   // ✅ exists
    buttons: [
      { text: "₹ 85K+", sub: "EMI", href: "/property-listing/?widget_id=2&kind=0&sf_unit_field_3076=167&sf_unit_field_3077=167&sf_unit_field_3078=167&sf_select_field_3093=-1&sf_select_field_3094=-1&sf_min_field_3076=-1&sf_min_field_3077=85000&sf_min_field_3078=-1&sf_unit_living_area=1&sf_min_living_area=-1&sf_tmin_bedrooms=-1&sf_tmin_bathrooms=-1&wplpage=1&wplview=property_listing&wplpagination=normal" },
      { text: "₹ 75K+", sub: "EMI", href: "/property-listing/?widget_id=2&kind=0&sf_unit_field_3076=167&sf_unit_field_3077=167&sf_unit_field_3078=167&sf_select_field_3093=-1&sf_select_field_3094=-1&sf_min_field_3076=-1&sf_min_field_3077=75000&sf_min_field_3078=-1&sf_unit_living_area=1&sf_min_living_area=-1&sf_tmin_bedrooms=-1&sf_tmin_bathrooms=-1&wplpage=1&wplview=property_listing&wplpagination=normal" },
      { text: "₹ 55K+", sub: "EMI", href: "/property-listing/?widget_id=2&kind=0&sf_unit_field_3076=167&sf_unit_field_3077=167&sf_unit_field_3078=167&sf_select_field_3093=-1&sf_select_field_3094=-1&sf_min_field_3076=-1&sf_min_field_3077=55000&sf_min_field_3078=-1&sf_unit_living_area=1&sf_min_living_area=-1&sf_tmin_bedrooms=-1&sf_tmin_bathrooms=-1&wplpage=1&wplview=property_listing&wplpagination=normal" },
      { text: "₹ 35K+", sub: "EMI", href: "/property-listing/?widget_id=2&kind=0&sf_unit_field_3076=167&sf_unit_field_3077=167&sf_unit_field_3078=167&sf_select_field_3093=-1&sf_select_field_3094=-1&sf_min_field_3076=-1&sf_min_field_3077=35000&sf_min_field_3078=-1&sf_unit_living_area=1&sf_min_living_area=-1&sf_tmin_bedrooms=-1&sf_tmin_bathrooms=-1&wplpage=1&wplview=property_listing&wplpagination=normal" },
    ],
  },
  {
    id: "downpayment",
    label: "A SUITABLE DOWNPAYMENT",
    headline: "For your dreamhome to ease stress",
    image: "/ASuitableDownpayment1.webp",          // ✅ exists
    buttons: [
      { text: "₹ 18L+", sub: "Downpayment", href: "/property-listing/?widget_id=2&kind=0&sf_unit_field_3076=167&sf_unit_field_3077=167&sf_unit_field_3078=167&sf_select_field_3093=-1&sf_select_field_3094=-1&sf_min_field_3076=-1&sf_min_field_3077=-1&sf_min_field_3078=1800000&sf_unit_living_area=1&sf_min_living_area=-1&sf_tmin_bedrooms=-1&sf_tmin_bathrooms=-1&wplpage=1&wplview=property_listing&wplpagination=normal" },
      { text: "₹ 16L+", sub: "Downpayment", href: "/property-listing/?widget_id=2&kind=0&sf_unit_field_3076=167&sf_unit_field_3077=167&sf_unit_field_3078=167&sf_select_field_3093=-1&sf_select_field_3094=-1&sf_min_field_3076=-1&sf_min_field_3077=-1&sf_min_field_3078=1600000&sf_unit_living_area=1&sf_min_living_area=-1&sf_tmin_bedrooms=-1&sf_tmin_bathrooms=-1&wplpage=1&wplview=property_listing&wplpagination=normal" },
      { text: "₹ 12L+", sub: "Downpayment", href: "/property-listing/?widget_id=2&kind=0&sf_unit_field_3076=167&sf_unit_field_3077=167&sf_unit_field_3078=167&sf_select_field_3093=-1&sf_select_field_3094=-1&sf_min_field_3076=-1&sf_min_field_3077=-1&sf_min_field_3078=1200000&sf_unit_living_area=1&sf_min_living_area=-1&sf_tmin_bedrooms=-1&sf_tmin_bathrooms=-1&wplpage=1&wplview=property_listing&wplpagination=normal" },
      { text: "₹ 8L+",  sub: "Downpayment", href: "/property-listing/?widget_id=2&kind=0&sf_unit_field_3076=167&sf_unit_field_3077=167&sf_unit_field_3078=167&sf_select_field_3093=-1&sf_select_field_3094=-1&sf_min_field_3076=-1&sf_min_field_3077=-1&sf_min_field_3078=800000&sf_unit_living_area=1&sf_min_living_area=-1&sf_tmin_bedrooms=-1&sf_tmin_bathrooms=-1&wplpage=1&wplview=property_listing&wplpagination=normal" },
    ],
  },
];

const SIZES = [
  {
    id: "cozy",
    label: "ANY SIZE OF A COZY HOME",
    headline: "A Treasure Chest of love & happiness",
    image: "/any-size-of-a-cozy.webp",             // ✅ exists
    buttons: [
      { text: "500+", sub: "sft", href: "/property-listing/?widget_id=2&kind=0&sf_unit_field_3076=167&sf_unit_field_3077=167&sf_unit_field_3078=167&sf_select_field_3093=-1&sf_select_field_3094=-1&sf_min_field_3076=-1&sf_min_field_3077=-1&sf_min_field_3078=-1&sf_unit_living_area=1&sf_min_living_area=500&sf_tmin_bedrooms=-1&sf_tmin_bathrooms=-1&wplpage=1&wplview=property_listing&wplpagination=normal" },
    ],
  },
  {
    id: "however-big",
    label: "HOWEVER BIG THE HOME IS",
    headline: "There is no place like home",
    image: "/full-shot-woman-sitting-floor.webp",   // ✅ exists
    buttons: [
      { text: "1500+", sub: "sft", href: "/property-listing/?widget_id=2&kind=0&sf_unit_field_3076=167&sf_unit_field_3077=167&sf_unit_field_3078=167&sf_select_field_3093=-1&sf_select_field_3094=-1&sf_min_field_3076=-1&sf_min_field_3077=-1&sf_min_field_3078=-1&sf_unit_living_area=1&sf_min_living_area=1500&sf_tmin_bedrooms=-1&sf_tmin_bathrooms=-1&wplpage=1&wplview=property_listing&wplpagination=normal" },
      { text: "1000+", sub: "sft", href: "/property-listing/?widget_id=2&kind=0&sf_unit_field_3076=167&sf_unit_field_3077=167&sf_unit_field_3078=167&sf_select_field_3093=-1&sf_select_field_3094=-1&sf_min_field_3076=-1&sf_min_field_3077=-1&sf_min_field_3078=-1&sf_unit_living_area=1&sf_min_living_area=1000&sf_tmin_bedrooms=-1&sf_tmin_bathrooms=-1&wplpage=1&wplview=property_listing&wplpagination=normal" },
    ],
  },
  {
    id: "lot-starts",
    label: "HOME IS WHERE A LOT STARTS",
    headline: "Work, Passion or just unwind",
    image: "/home-is-where-a-lot-starts.webp",      // ✅ exists
    buttons: [
      { text: "1500+", sub: "sft", disabled: true, href: "/property-listing/?widget_id=2&kind=0&sf_unit_field_3076=167&sf_unit_field_3077=167&sf_unit_field_3078=167&sf_select_field_3093=-1&sf_select_field_3094=-1&sf_min_field_3076=-1&sf_min_field_3077=-1&sf_min_field_3078=-1&sf_unit_living_area=1&sf_min_living_area=1500&sf_tmin_bedrooms=-1&sf_tmin_bathrooms=-1&wplpage=1&wplview=property_listing&wplpagination=normal" },
      { text: "2000+", sub: "sft", href: "/property-listing/?widget_id=2&kind=0&sf_unit_field_3076=167&sf_unit_field_3077=167&sf_unit_field_3078=167&sf_select_field_3093=-1&sf_select_field_3094=-1&sf_min_field_3076=-1&sf_min_field_3077=-1&sf_min_field_3078=-1&sf_unit_living_area=1&sf_min_living_area=2000&sf_tmin_bedrooms=-1&sf_tmin_bathrooms=-1&wplpage=1&wplview=property_listing&wplpagination=normal" },
    ],
  },
];

const BEDROOMS = [
  {
    id: "3bhk",
    label: "3 BEDROOMS ARE SUCH BLISS",
    image: "/3bedroom.webp",                       // ✅ exists
    cta: "Explore 3BHK Options",
    href: "/property-listing/?widget_id=2&kind=0&sf_unit_field_3076=167&sf_unit_field_3077=167&sf_unit_field_3078=167&sf_select_field_3093=-1&sf_select_field_3094=-1&sf_min_field_3076=-1&sf_min_field_3077=-1&sf_min_field_3078=-1&sf_unit_living_area=1&sf_min_living_area=-1&sf_tmin_bedrooms=3&sf_tmin_bathrooms=-1&wplpage=1&wplview=property_listing&wplpagination=normal",
  },
  {
    id: "2bhk",
    label: "2 BEDROOM ARE SPECIAL",
    image: "/2-bedroom-are-special.webp",          // ✅ FIXED: was "/2Bedroom.webp"
    cta: "Explore 2BHK Options",
    href: "/property-listing/?widget_id=2&kind=0&sf_unit_field_3076=167&sf_unit_field_3077=167&sf_unit_field_3078=167&sf_select_field_3093=-1&sf_select_field_3094=-1&sf_min_field_3076=-1&sf_min_field_3077=-1&sf_min_field_3078=-1&sf_unit_living_area=1&sf_min_living_area=-1&sf_tmin_bedrooms=2&sf_tmin_bathrooms=-1&wplpage=1&wplview=property_listing&wplpagination=normal",
  },
  {
    id: "1bhk",
    label: "INVEST IN A 1 BEDROOM",
    image: "/invest-in-a-1-Bedroom.webp",          // ✅ exists
    cta: "Explore 1BHK Options",
    href: "/property-listing/?widget_id=2&kind=0&sf_unit_field_3076=167&sf_unit_field_3077=167&sf_unit_field_3078=167&sf_select_field_3093=-1&sf_select_field_3094=-1&sf_min_field_3076=-1&sf_min_field_3077=-1&sf_min_field_3078=-1&sf_unit_living_area=1&sf_min_living_area=-1&sf_tmin_bedrooms=1&sf_tmin_bathrooms=-1&wplpage=1&wplview=property_listing&wplpagination=normal",
  },
];

const LOCATIONS = [
  {
    id: "houston",
    label: "TAKE ME TO HOUSTON",
    // ⚠️ "take-me-to-houston.webp" was NOT visible in your /public screenshot.
    // Using cash-in-hand.webp as a fallback — replace with the correct file if you have it.
    image: "/cash-in-hand.webp",
    cta: "Know More",
    href: "https://janapriya.us/#1",
  },
  {
    id: "bengaluru",
    label: "BENGALURU",
    image: "/bengaluru.webp",                      // ✅ exists
    cta: "Know More",
    href: "/property-listing/?widget_id=2&kind=0&sf_unit_field_3076=167&sf_unit_field_3077=167&sf_unit_field_3078=167&sf_select_field_3093=-1&sf_multiple_field_3229=4%2C5&sf_select_field_3094=-1&sf_min_field_3076=-1&sf_min_field_3077=-1&sf_min_field_3078=-1&sf_unit_living_area=1&sf_min_living_area=-1&sf_tmin_bedrooms=-1&sf_tmin_bathrooms=-1&wplpage=1&wplview=property_listing&wplpagination=normal",
  },
  {
    id: "hyderabad",
    label: "HYDERABAD",
    image: "/hyderabad.webp",                      // ✅ exists
    cta: "Know More",
    href: "/property-listing/?widget_id=2&kind=0&sf_unit_field_3076=167&sf_unit_field_3077=167&sf_unit_field_3078=167&sf_select_field_3093=-1&sf_multiple_field_3229=1%2C2%2C4&sf_select_field_3094=-1&sf_min_field_3076=-1&sf_min_field_3077=-1&sf_min_field_3078=-1&sf_unit_living_area=1&sf_min_living_area=-1&sf_tmin_bedrooms=-1&sf_tmin_bathrooms=-1&wplpage=1&wplview=property_listing&wplpagination=normal",
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   HOOK – fires when element enters viewport
───────────────────────────────────────────────────────────────────────────── */
function useInView(ref: React.RefObject<HTMLElement>, threshold = 0.2) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => setInView(e.isIntersecting),
      { threshold }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return inView;
}

/* ─────────────────────────────────────────────────────────────────────────────
   SECTION HEADER BAR
───────────────────────────────────────────────────────────────────────────── */
function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{
      background: "white",
      textAlign: "center",
      padding: "22px 24px",
      borderBottom: "1px solid #E5E7EB",
    }}>
      <h3 style={{
        margin: 0,
        fontSize: "clamp(15px, 2vw, 21px)",
        fontWeight: 900,
        color: "#0D1B2A",
        letterSpacing: 2.5,
        textTransform: "uppercase",
      }}>
        {title}
      </h3>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ACCORDION PANEL (desktop)
   dir="right" → tabs on right side | dir="left" → tabs on left side
───────────────────────────────────────────────────────────────────────────── */
interface AccordionItem {
  id: string;
  label: string;
  headline?: string;
  image: string;
  buttons?: { text: string; sub?: string; href: string; disabled?: boolean }[];
  cta?: string;
  href?: string;
}

function AccordionPanel({
  items,
  defaultIndex = 0,
  dir = "right",
  noButtons = false,
}: {
  items: AccordionItem[];
  defaultIndex?: number;
  dir?: "right" | "left";
  noButtons?: boolean;
}) {
  const [active, setActive] = useState(defaultIndex);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<HTMLElement>);

  return (
    <div
      ref={ref}
      style={{
        display: "flex",
        flexDirection: dir === "right" ? "row" : "row-reverse",
        width: "100%",
        height: "calc(100vh - 105px)",
        minHeight: 440,
        maxHeight: 700,
        overflow: "hidden",
      }}
    >
      {/* ── CONTENT / IMAGE AREA ── */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {items.map((it, i) => (
          <div
            key={it.id}
            style={{
              position: "absolute",
              inset: 0,
              opacity: active === i ? 1 : 0,
              transition: "opacity 0.5s ease",
              pointerEvents: active === i ? "auto" : "none",
            }}
          >
            {/* Background image */}
            <img
              src={it.image}
              alt={it.label}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            {/* Gradient overlay */}
            <div style={{
              position: "absolute",
              inset: 0,
              background: noButtons
                ? "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.18) 100%)"
                : "linear-gradient(to bottom, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.12) 50%, rgba(0,0,0,0.05) 100%)",
            }} />

            {/* ── Budget / Size buttons ── */}
            {!noButtons && it.buttons && (
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                padding: "32px 48px 0",
              }}>
                <p style={{
                  color: "white",
                  fontWeight: 900,
                  fontSize: "clamp(15px, 1.8vw, 22px)",
                  textTransform: "uppercase",
                  letterSpacing: 1.2,
                  marginBottom: 22,
                  textShadow: "0 2px 12px rgba(0,0,0,0.6)",
                }}>
                  {it.headline}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  {it.buttons.map((btn) =>
                    btn.disabled ? (
                      <span key={btn.text} style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 7,
                        background: "#273b84",
                        color: "rgba(255,255,255,0.45)",
                        padding: "11px 22px",
                        borderRadius: 9,
                        fontWeight: 800,
                        fontSize: 14,
                        cursor: "not-allowed",
                        whiteSpace: "nowrap",
                        fontFamily: "inherit",
                      }}>
                        {btn.text}
                        {btn.sub && <span style={{ fontWeight: 600, fontSize: 12 }}>{btn.sub}</span>}
                      </span>
                    ) : (
                      <Link key={btn.text} href={btn.href} style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 7,
                        background: "rgba(255,255,255,0.13)",
                        backdropFilter: "blur(10px)",
                        border: "1.5px solid rgba(255,255,255,0.38)",
                        color: "white",
                        padding: "11px 22px",
                        borderRadius: 9,
                        fontWeight: 800,
                        fontSize: 14,
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                        transition: "all 0.22s",
                        fontFamily: "inherit",
                      }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = "#273b84";
                          (e.currentTarget as HTMLElement).style.borderColor = "#273b84";
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.13)";
                          (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.38)";
                        }}
                      >
                        {btn.text}
                        {btn.sub && <span style={{ fontWeight: 600, fontSize: 12, opacity: 0.8 }}>{btn.sub}</span>}
                      </Link>
                    )
                  )}
                </div>
              </div>
            )}

            {/* ── CTA bar for bedroom / location ── */}
            {noButtons && it.cta && it.href && (
              <Link href={it.href} style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                background: "#273b84",
                color: "white",
                textAlign: "center",
                padding: "15px",
                fontWeight: 800,
                fontSize: 15,
                textDecoration: "none",
                letterSpacing: 0.5,
                transition: "background 0.2s",
                display: "block",
                fontFamily: "inherit",
              }}
                onMouseEnter={e => (e.currentTarget.style.background = "#1a2a6c")}
                onMouseLeave={e => (e.currentTarget.style.background = "#273b84")}
              >
                {it.cta}
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* ── VERTICAL TABS ── */}
      <div style={{ display: "flex", flexDirection: "row" }}>
        {items.map((it, i) => {
          const isActive = active === i;
          return (
            <button
              key={it.id}
              onClick={() => setActive(i)}
              style={{
                width: isActive ? 68 : 58,
                background: isActive ? "#a9c6f8" : "#0D1B2A",
                border: "1px solid rgba(255,255,255,0.07)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.45s cubic-bezier(0.05,0.61,0.41,0.95)",
                outline: "none",
                animation: inView
                  ? `${dir === "right" ? "tabSlideRight" : "tabSlideLeft"} 0.55s cubic-bezier(0.05,0.61,0.41,0.95) ${i * 0.08}s both`
                  : "none",
              }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = "#1a2a6c";
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = "#0D1B2A";
              }}
            >
              <span style={{
                writingMode: "vertical-rl",
                transform: "scale(-1,-1)",
                color: isActive ? "#0D1B2A" : "white",
                fontWeight: 800,
                fontSize: "clamp(8px, 0.9vw, 12px)",
                letterSpacing: 1.5,
                textTransform: "uppercase",
                lineHeight: 1.3,
                transition: "color 0.3s",
                padding: "14px 0",
                userSelect: "none",
                fontFamily: "inherit",
              }}>
                {it.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MOBILE STACKED CARD
───────────────────────────────────────────────────────────────────────────── */
function MobileCard({ item, noButtons = false }: { item: AccordionItem; noButtons?: boolean }) {
  return (
    <div style={{
      position: "relative",
      minHeight: 270,
      borderRadius: 18,
      overflow: "hidden",
      marginBottom: 16,
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-end",
    }}>
      <img src={item.image} alt={item.label} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.48)", zIndex: 1 }} />
      <div style={{ position: "relative", zIndex: 2, background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)", padding: "22px 18px 18px" }}>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 6 }}>
          {item.label}
        </p>
        {item.headline && (
          <p style={{ color: "white", fontWeight: 900, fontSize: 15, marginBottom: 14, textTransform: "uppercase", lineHeight: 1.4 }}>
            {item.headline}
          </p>
        )}

        {!noButtons && item.buttons && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {item.buttons.map((btn) =>
              btn.disabled ? (
                <span key={btn.text} style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  background: "#273b84", color: "rgba(255,255,255,0.4)",
                  padding: "8px 14px", borderRadius: 7, fontWeight: 800, fontSize: 13,
                  cursor: "not-allowed", fontFamily: "inherit",
                }}>
                  {btn.text} {btn.sub && <span style={{ fontWeight: 600, fontSize: 11 }}>{btn.sub}</span>}
                </span>
              ) : (
                <Link key={btn.text} href={btn.href} style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  background: "rgba(255,255,255,0.14)",
                  border: "1.5px solid rgba(255,255,255,0.32)",
                  color: "white", padding: "8px 14px", borderRadius: 7,
                  fontWeight: 800, fontSize: 13, textDecoration: "none", fontFamily: "inherit",
                }}>
                  {btn.text} {btn.sub && <span style={{ fontWeight: 600, fontSize: 11, opacity: 0.75 }}>{btn.sub}</span>}
                </Link>
              )
            )}
          </div>
        )}

        {noButtons && item.cta && item.href && (
          <Link href={item.href} style={{
            display: "inline-block",
            background: "#273b84",
            color: "white",
            padding: "11px 24px",
            borderRadius: 9,
            fontWeight: 800,
            fontSize: 14,
            textDecoration: "none",
            fontFamily: "inherit",
          }}>
            {item.cta}
          </Link>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────────────────────── */
export default function HomePage() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("Buy");
  const [activeSlide, setActiveSlide] = useState(0);

  const HERO_SLIDES = [
    { src: "/jp_final.mp4" },
    { src: "/RiseUpExplainer.mp4" },
  ];

  useEffect(() => {
    const timer = setInterval(() => setActiveSlide(s => (s + 1) % HERO_SLIDES.length), 7000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setMounted(true);
    fetch("http://173.168.0.81:8000/api/v1/units/trending?limit=6")
      .then(r => r.json() as Promise<any>)
      .then(d => setTrending(Array.isArray(d) ? d : (d.items || [])))
      .catch(() => {});
    fetch("http://173.168.0.81:8000/api/v1/projects")
      .then(r => r.json())
      .then(d => setProjects(Array.isArray(d) ? d.slice(0, 4) : (d.items || []).slice(0, 4)))
      .catch(() => {});
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true); setSearched(false);
    try {
      const res = await fetch(`http://173.168.0.81:8000/api/v1/search/nlp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const d = await res.json();
      setResults(d.items || d.results || []);
    } catch { setResults([]); }
    finally { setSearching(false); setSearched(true); }
  }

  function formatPrice(p: any) {
    if (!p) return "Price on request";
    const n = parseFloat(p);
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)} Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(0)} L`;
    return `₹${n.toLocaleString()}`;
  }

  const APARTMENT_TYPES = [
    { icon: "🏠", label: "Villa" },
    { icon: "🏢", label: "Apartment" },
    { icon: "🏡", label: "Duplex" },
    { icon: "🏗️", label: "Plot" },
    { icon: "🌆", label: "Penthouse" },
    { icon: "🏰", label: "Bungalow" },
  ];

  const SERVICES = [
    { icon: "🔑", title: "Property Management", desc: "End-to-end management of your real estate assets with expert care." },
    { icon: "💰", title: "Mortgage Service", desc: "Hassle-free home loan guidance and quick approvals from top banks." },
    { icon: "🏛️", title: "Property Billing", desc: "Transparent billing and documentation for a smooth transaction." },
  ];

  const TESTIMONIALS = [
    { name: "Rajesh Kumar", role: "Software Engineer", city: "Hyderabad", text: "Excellent construction quality and transparent process. Janapriya delivered exactly what they promised. Highly recommended!", rating: 5, initial: "R" },
    { name: "Priya Sharma", role: "Doctor", city: "Secunderabad", text: "Bought a 3BHK in Janapriya Heights. The team was professional at every step. Best decision of my life!", rating: 5, initial: "P" },
    { name: "Venkat Reddy", role: "Business Owner", city: "Hyderabad", text: "Invested in Janapriya Meadows villa. Superb quality, premium location. Great ROI and an even better living experience.", rating: 5, initial: "V" },
  ];

  const AGENTS = [
    { name: "Arjun Rao", role: "Senior Advisor", exp: "12 yrs", deals: "340+" },
    { name: "Meena Pillai", role: "Property Consultant", exp: "8 yrs", deals: "210+" },
    { name: "Karthik Boya", role: "Investment Expert", exp: "10 yrs", deals: "280+" },
    { name: "Neha Gupta", role: "Sales Manager", exp: "6 yrs", deals: "160+" },
  ];

  const NEWS = [
    { tag: "Market", title: "Hyderabad Real Estate Sees Record Growth in 2024", date: "Dec 12, 2024" },
    { tag: "Tips", title: "Top 5 Localities to Invest in Hyderabad Right Now", date: "Nov 28, 2024" },
    { tag: "Legal", title: "Understanding RERA: A Complete Guide for Home Buyers", date: "Nov 15, 2024" },
  ];

  return (
    <main style={{ fontFamily: "'Nunito', 'Segoe UI', sans-serif" }} className="min-h-screen bg-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        .jp-brand { color: #273b84; }
        .jp-brand-bg { background: #273b84; }
        .jp-dark { color: #0D1B2A; }
        .jp-gray { color: #6B7280; }
        .card-hover { transition: all 0.28s cubic-bezier(.4,0,.2,1); }
        .card-hover:hover { transform: translateY(-6px); box-shadow: 0 20px 50px rgba(39,59,132,0.13); }
        .fade-in { animation: fadeUp 0.6s ease both; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        .ticker { display: flex; gap: 40px; animation: tick 18s linear infinite; white-space: nowrap; }
        @keyframes tick { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .pill-tab { border-radius: 8px; padding: 10px 28px; font-weight: 700; font-size: 14px; cursor: pointer; transition: all 0.2s; border: none; }
        .pill-tab.active { background: #273b84; color: white; }
        .pill-tab:not(.active) { background: white; color: #374151; }
        .input-search { border: none; outline: none; background: transparent; flex: 1; font-size: 14px; color: #374151; font-family: inherit; }
        .input-search::placeholder { color: #9CA3AF; }
        .section-label { font-size: 12px; font-weight: 800; letter-spacing: 2.5px; text-transform: uppercase; color: #273b84; margin-bottom: 8px; }
        .section-title { font-size: clamp(28px, 4vw, 42px); font-weight: 900; color: #0D1B2A; line-height: 1.2; }
        .divider-brand { width: 48px; height: 3px; background: #273b84; border-radius: 2px; margin: 16px 0; }
        .star { color: #F59E0B; font-size: 14px; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; }
        .badge-brand { background: #e8ebf8; color: #273b84; }
        .badge-amber { background: #FEF3C7; color: #92400E; }
        .badge-blue { background: #DBEAFE; color: #1E40AF; }
        .news-img { width: 100%; height: 170px; object-fit: cover; border-radius: 12px 12px 0 0; background: linear-gradient(135deg, #0D1B2A, #273b84); }
        .agent-avatar { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 900; color: white; background: linear-gradient(135deg, #0D1B2A, #273b84); margin: 0 auto 12px; }
        .scroll-indicator { width: 22px; height: 36px; border: 2px solid rgba(255,255,255,0.4); border-radius: 20px; display: flex; align-items: flex-start; justify-content: center; padding-top: 5px; }
        .scroll-dot { width: 4px; height: 8px; background: white; border-radius: 2px; animation: scrollDown 1.5s ease-in-out infinite; }
        @keyframes scrollDown { 0%,100% { transform: translateY(0); opacity:1; } 50% { transform: translateY(8px); opacity:0.3; } }
        @keyframes heroProgress { from { width: 0%; } to { width: 100%; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes tabSlideRight { 0% { transform: translateX(40px); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
        @keyframes tabSlideLeft  { 0% { transform: translateX(-40px); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
        .hero-arrow:hover { background: rgba(39,59,132,0.25) !important; border-color: #273b84 !important; }
        .search-card { transition: all 0.25s cubic-bezier(.4,0,.2,1); }
        .search-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(39,59,132,0.12); }

        /* ── Search Filter responsive ── */
        .sf-desktop { display: flex !important; width: 100%; }
        .sf-mobile  { display: none !important; }
        @media (max-width: 767px) {
          .sf-desktop { display: none !important; }
          .sf-mobile  { display: block !important; }
        }
      `}</style>

      <Navbar />

      {/* ── HERO VIDEO SLIDER ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {HERO_SLIDES.map((slide, i) => (
          <div key={i} className="absolute inset-0" style={{ zIndex: 1, opacity: activeSlide === i ? 1 : 0, transition: "opacity 1.2s ease-in-out" }}>
            <div className="absolute inset-0" />
            {mounted && (
              <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.55, zIndex: 1 }}>
                <source src={slide.src} type="video/mp4" />
              </video>
            )}
          </div>
        ))}

        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(13,27,42,0.25) 0%, rgba(13,27,42,0.1) 50%, rgba(13,27,42,0.45) 100%)", zIndex: 2 }} />
        <div className="absolute top-1/4 right-0 w-96 h-96 rounded-full" style={{ background: "radial-gradient(circle, rgba(39,59,132,0.18), transparent 70%)", zIndex: 2 }} />
        <div className="absolute bottom-1/3 left-0 w-72 h-72 rounded-full" style={{ background: "radial-gradient(circle, rgba(39,59,132,0.12), transparent 70%)", zIndex: 2 }} />

        <div className="relative max-w-4xl mx-auto px-6 text-center" style={{ zIndex: 4, paddingTop: 140, paddingBottom: 120 }}>
          <div className="fade-in" style={{ maxWidth: 740, margin: "0 auto", animationDelay: "0.12s" }}>
            <form onSubmit={handleSearch}>
              <div style={{
                borderRadius: 24,
                padding: "6px 6px 6px 22px",
                display: "flex",
                alignItems: "center",
                gap: 0,
                boxShadow: "0 24px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.12), inset 0 1px 0 rgba(255,255,255,0.8)",
                background: "white",
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #e8ebf8, #b8c0e8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, marginRight: 10 }}>✦</div>
                <input
                  className="input-search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  style={{ flex: 1, fontSize: 15, color: "#0D1B2A", padding: "12px 0", fontWeight: 600 }}
                  placeholder={`Search ${activeTab === "Buy" ? "properties to buy" : activeTab === "Rent" ? "rental properties" : "investment opportunities"}…`}
                />
                <div style={{ width: 1, height: 28, background: "#E5E7EB", flexShrink: 0, margin: "0 14px" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#6B7280", fontSize: 13, fontWeight: 700, flexShrink: 0, marginRight: 10, whiteSpace: "nowrap" }}>
                  <span style={{ fontSize: 15 }}>📍</span> Hyderabad
                </div>
                <button type="submit" disabled={searching} style={{
                  background: searching ? "#9CA3AF" : "linear-gradient(135deg, #273b84 0%, #1a2a6c 100%)",
                  color: "white", border: "none", borderRadius: 18,
                  padding: "13px 28px", fontWeight: 900, fontSize: 14,
                  cursor: searching ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap", fontFamily: "inherit", transition: "all 0.22s",
                  display: "flex", alignItems: "center", gap: 8,
                  boxShadow: searching ? "none" : "0 4px 20px rgba(39,59,132,0.5)",
                  flexShrink: 0,
                }}>
                  {searching ? (
                    <><span style={{ display: "inline-block", width: 13, height: 13, border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> Searching…</>
                  ) : (
                    <><span>🔍</span> AI Search</>
                  )}
                </button>
              </div>
            </form>
          </div>

          {searched && (
            <div style={{ maxWidth: 740, margin: "14px auto 0" }}>
              {(Array.isArray(results) ? results : []).length === 0 ? (
                <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 16, padding: 18, color: "rgba(255,255,255,0.65)", fontSize: 14, backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  No results found. <Link href="/store" style={{ color: "#7b8fd4", fontWeight: 800 }}>Browse all listings →</Link>
                </div>
              ) : (Array.isArray(results) ? results : []).map((r: any, i: number) => (
                <Link key={i} href={`/units/${r.id}`} style={{ background: "rgba(255,255,255,0.96)", borderRadius: 14, padding: "13px 18px", textDecoration: "none", display: "flex", alignItems: "center", gap: 14, marginTop: 8, boxShadow: "0 8px 30px rgba(0,0,0,0.2)" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg, #e8ebf8, #b8c0e8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🏠</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 800, fontSize: 14, color: "#0D1B2A", margin: 0 }}>{r.unit_number || r.name}</p>
                    <p style={{ color: "#6B7280", fontSize: 12, margin: 0 }}>{r.unit_type} · {r.bedrooms} BHK · {r.area_sqft} sqft</p>
                  </div>
                  <div style={{ fontWeight: 900, color: "#273b84", fontSize: 15, flexShrink: 0 }}>{formatPrice(r.base_price)}</div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Slider dots + scroll */}
        <div className="absolute" style={{ bottom: 36, left: "50%", transform: "translateX(-50%)", zIndex: 5, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", gap: 10 }}>
            {HERO_SLIDES.map((_, i) => (
              <button key={i} onClick={() => setActiveSlide(i)} style={{ width: activeSlide === i ? 28 : 8, height: 8, borderRadius: 4, background: activeSlide === i ? "#273b84" : "rgba(255,255,255,0.3)", border: "none", cursor: "pointer", transition: "all 0.4s ease", padding: 0 }} />
            ))}
          </div>
          <div className="scroll-indicator"><div className="scroll-dot" /></div>
          <span style={{ color: "rgba(255,255,255,0.28)", fontSize: 9, letterSpacing: 2.5 }}>SCROLL</span>
        </div>

        {/* Arrows */}
        <button onClick={() => setActiveSlide(s => (s - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)} className="absolute hero-arrow" style={{ left: 24, top: "50%", transform: "translateY(-50%)", zIndex: 5, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(8px)", color: "white", width: 44, height: 44, borderRadius: "50%", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>‹</button>
        <button onClick={() => setActiveSlide(s => (s + 1) % HERO_SLIDES.length)} className="absolute hero-arrow" style={{ right: 24, top: "50%", transform: "translateY(-50%)", zIndex: 5, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(8px)", color: "white", width: 44, height: 44, borderRadius: "50%", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>›</button>

        {/* Progress bar */}
        <div className="absolute" style={{ bottom: 0, left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.1)", zIndex: 5 }}>
          <div key={activeSlide} style={{ height: "100%", background: "#273b84", animation: "heroProgress 7s linear forwards", transformOrigin: "left" }} />
        </div>
      </section>

      {/* ── STATS ROW ─────────────────────────────────────────────────── */}
      <section style={{ background: "#F8FAFB", padding: "0" }}>
        <div className="max-w-5xl mx-auto px-6" style={{ paddingBottom: 40 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, textAlign: "center", alignItems: "center" }}>
            {[
              { icon: "🏅", value: "40",   label: "Years of Experience" },
              { icon: "🏢", value: "40K+", label: "Dream Homes" },
              { icon: "👨‍👩‍👧‍👦", value: "70K+", label: "Happy Families" },
              { icon: "🏗️", value: "20+",  label: "Million Square Feet" },
            ].map((item, i) => (
              <div key={i} style={{ padding: "20px 10px", borderRight: i !== 3 ? "1px solid #E5E7EB" : "none" }}>
                <div style={{ fontSize: 34, color: "#273b84", marginBottom: 10 }}>{item.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#273b84", marginBottom: 4 }}>{item.value}</div>
                <div style={{ fontSize: 13, color: "#6B7280" }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

     
      {/* ── WHERE A HOUSE FEELS LIKE HOME ─────────────────────────────── */}
      <section style={{ padding: "60px 0", background: "#F8FAFB" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="section-label">About Janapriya</p>
              <h2 className="section-title">Where Find A House<br />Feels Like Home</h2>
              <div className="divider-brand" />
              <p style={{ color: "#6B7280", fontSize: 15, lineHeight: 1.8, marginBottom: 24 }}>
                For over four decades, Janapriya Engineers Syndicate has been crafting premium homes across Hyderabad. We combine quality construction, transparent pricing, and timely delivery — making your dream home a reality.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { icon: "✅", text: "RERA Registered" },
                  { icon: "🌿", text: "IGBC Green Certified" },
                  { icon: "📱", text: "Smart Home Ready" },
                  { icon: "💎", text: "Premium Finishes" },
                ].map(f => (
                  <div key={f.text} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "#374151" }}>
                    <span>{f.icon}</span> {f.text}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                <div style={{ background: "#273b84", borderRadius: 12, padding: "14px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "white" }}>560+</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>CURRENT UNITS</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6 }}>Handpicked properties in the best<br />localities across Hyderabad.</div>
                </div>
              </div>
              <Link href="/projects" style={{ display: "inline-block", background: "#273b84", color: "white", borderRadius: 10, padding: "12px 28px", fontWeight: 800, fontSize: 14, textDecoration: "none" }}>
                Explore Projects →
              </Link>
            </div>
            <div style={{ position: "relative" }}>
              <div style={{ background: "linear-gradient(135deg, #0D1B2A, #273b84)", borderRadius: 20, height: 360, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
                {mounted && (
                  <video autoPlay muted loop playsInline style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }}>
                    <source src="/jp_final.mp4" type="video/mp4" />
                  </video>
                )}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(13,27,42,0.6) 0%, transparent 60%)" }} />
                <div style={{ position: "absolute", bottom: 20, left: 20, right: 20 }}>
                  <p style={{ color: "white", fontWeight: 900, fontSize: 18 }}>40 Years of Trust</p>
                  <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>Building premium homes since 1984</p>
                </div>
              </div>
              <div style={{ position: "absolute", top: -16, right: -16, background: "#273b84", borderRadius: 14, padding: "14px 18px", boxShadow: "0 8px 24px rgba(39,59,132,0.35)" }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: "white" }}>4.9★</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: 700 }}>RATING</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── APARTMENT TYPES TICKER ─────────────────────────────────────── */}
      <section style={{ padding: "40px 0", background: "#0D1B2A", overflow: "hidden" }}>
        <p style={{ textAlign: "center", fontSize: 12, fontWeight: 800, letterSpacing: 3, color: "#7b8fd4", marginBottom: 20, textTransform: "uppercase" }}>Universe Of Property Types</p>
        <div style={{ display: "flex", overflow: "hidden" }}>
          <div className="ticker">
            {[...APARTMENT_TYPES, ...APARTMENT_TYPES, ...APARTMENT_TYPES, ...APARTMENT_TYPES].map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, color: "white", fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
                <span style={{ fontSize: 20 }}>{t.icon}</span> {t.label}
                <span style={{ color: "#7b8fd4", margin: "0 8px" }}>●</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap", marginTop: 24, padding: "0 24px" }}>
          {APARTMENT_TYPES.map(t => (
            <div key={t.label} style={{ background: "rgba(39,59,132,0.2)", border: "1px solid rgba(39,59,132,0.35)", borderRadius: 10, padding: "10px 20px", display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {t.icon} {t.label}
            </div>
          ))}
        </div>
      </section>

      {/* ── WHAT WE OFFER ──────────────────────────────────────────────── */}
      <section style={{ padding: "80px 0", background: "white" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 48, flexWrap: "wrap", gap: 16 }}>
            <div>
              <p className="section-label">Our Services</p>
              <h2 className="section-title">What We Offer</h2>
            </div>
            <Link href="/contact" style={{ background: "#273b84", color: "white", borderRadius: 10, padding: "10px 24px", fontWeight: 800, fontSize: 13, textDecoration: "none" }}>
              Get Started →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SERVICES.map(s => (
              <div key={s.title} className="card-hover" style={{ background: "#F8FAFB", borderRadius: 18, padding: 28, border: "1px solid #F0F0F0" }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #e8ebf8, #b8c0e8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 18 }}>{s.icon}</div>
                <h3 style={{ fontWeight: 800, fontSize: 16, color: "#0D1B2A", marginBottom: 8 }}>{s.title}</h3>
                <p style={{ color: "#6B7280", fontSize: 13, lineHeight: 1.7 }}>{s.desc}</p>
                <div style={{ marginTop: 16, color: "#273b84", fontWeight: 800, fontSize: 13 }}>Learn more →</div>
              </div>
            ))}
          </div>
        </div>
      </section>
 {/* ── SEARCH FILTER SECTIONS ────────────────────────────────────── */}

      {/* SEARCH BY FLEXIBLE PAYMENTS */}
      <section style={{ background: "white" }} id="search-by-payment">
        <SectionHeader title="Search by Flexible Payments" />
        <div className="sf-desktop">
          <AccordionPanel items={PAYMENTS} defaultIndex={0} dir="right" />
        </div>
        <div className="sf-mobile" style={{ padding: "16px" }}>
          {PAYMENTS.map(item => <MobileCard key={item.id} item={item} />)}
        </div>
      </section>

      {/* SEARCH BY SIZE */}
      <section style={{ background: "#F8FAFB" }} id="search-by-size">
        <SectionHeader title="Search by Size" />
        <div className="sf-desktop">
          <AccordionPanel items={SIZES} defaultIndex={2} dir="left" />
        </div>
        <div className="sf-mobile" style={{ padding: "16px" }}>
          {SIZES.map(item => <MobileCard key={item.id} item={item} />)}
        </div>
      </section>

      {/* SEARCH BY BEDROOM */}
      <section style={{ background: "white" }} id="search-by-bedroom">
        <SectionHeader title="Search by Bedroom" />
        <div className="sf-desktop">
          <AccordionPanel items={BEDROOMS} defaultIndex={0} dir="right" noButtons />
        </div>
        <div className="sf-mobile" style={{ padding: "16px" }}>
          {BEDROOMS.map(item => <MobileCard key={item.id} item={item} noButtons />)}
        </div>
      </section>

      {/* SEARCH BY LOCATION */}
      <section style={{ background: "#F8FAFB" }} id="search-by-location">
        <SectionHeader title="Search by Location" />
        <div className="sf-desktop">
          <AccordionPanel items={LOCATIONS} defaultIndex={2} dir="left" noButtons />
        </div>
        <div className="sf-mobile" style={{ padding: "16px" }}>
          {LOCATIONS.map(item => <MobileCard key={item.id} item={item} noButtons />)}
        </div>
      </section>

      {/* ── NEWSLETTER BANNER ──────────────────────────────────────────── */}
      <section style={{ background: "linear-gradient(135deg, #0D1B2A, #1a2a6c)", padding: "56px 24px", textAlign: "center" }}>
        <div className="max-w-xl mx-auto">
          <p className="section-label" style={{ color: "#7b8fd4" }}>Stay Updated</p>
          <h2 style={{ color: "white", fontWeight: 900, fontSize: 28, marginBottom: 8 }}>Subscribe To Our Newsletter</h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 24 }}>Get new property alerts, market insights, and exclusive offers in your inbox.</p>
          <div style={{ display: "flex", gap: 8, background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "6px 8px", border: "1px solid rgba(255,255,255,0.12)" }}>
            <input placeholder="Enter your email address" style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "white", fontSize: 14, padding: "8px 12px", fontFamily: "inherit" }} />
            <button style={{ background: "#273b84", color: "white", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Subscribe</button>
          </div>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 12 }}>No spam. Unsubscribe anytime.</p>
        </div>
      </section>

      {/* ── TRENDING PROPERTIES ────────────────────────────────────────── */}
      {trending.length > 0 && (
        <section style={{ padding: "80px 0", background: "#F8FAFB" }}>
          <div className="max-w-7xl mx-auto px-6">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40, flexWrap: "wrap", gap: 16 }}>
              <div>
                <p className="section-label">Hot Properties</p>
                <h2 className="section-title">Property For Sale &amp; Rent</h2>
              </div>
              <Link href="/store" style={{ color: "#273b84", fontWeight: 800, fontSize: 13, textDecoration: "none", border: "2px solid #273b84", borderRadius: 10, padding: "10px 20px" }}>
                View All Units →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trending.map((u: any) => (
                <Link key={u.id} href={`/units/${u.id}`} style={{ textDecoration: "none" }}>
                  <div className="card-hover" style={{ background: "white", borderRadius: 18, overflow: "hidden", border: "1px solid #F0F0F0", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
                    <div style={{ height: 200, background: "linear-gradient(135deg, #0D1B2A 0%, #273b84 100%)", position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <span className="badge badge-brand">● Available</span>
                        <span style={{ background: "rgba(255,255,255,0.15)", color: "white", borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 700 }}>🔥 Trending</span>
                      </div>
                      <div>
                        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginBottom: 2 }}>{u.unit_type}{u.bedrooms ? ` · ${u.bedrooms} BHK` : ""}</p>
                        <p style={{ color: "white", fontWeight: 900, fontSize: 16 }}>{u.unit_number}</p>
                        {u.area_sqft && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>📐 {parseFloat(u.area_sqft).toFixed(0)} sqft · Fl {u.floor_number ?? "–"}</p>}
                      </div>
                    </div>
                    <div style={{ padding: "16px 18px" }}>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                        {u.bedrooms && <span style={{ background: "#F3F4F6", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: "#374151" }}>🛏 {u.bedrooms} BHK</span>}
                        {u.area_sqft && <span style={{ background: "#F3F4F6", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: "#374151" }}>📐 {parseFloat(u.area_sqft).toFixed(0)} sqft</span>}
                        {u.floor_number != null && <span style={{ background: "#F3F4F6", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: "#374151" }}>🏢 Floor {u.floor_number}</span>}
                      </div>
                      <div style={{ height: 1, background: "#F3F4F6", marginBottom: 12 }} />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: 17, color: "#0D1B2A" }}>{formatPrice(u.base_price)}</div>
                          {u.area_sqft && u.base_price && (
                            <div style={{ color: "#9CA3AF", fontSize: 11 }}>₹{Math.round(parseFloat(u.base_price) / parseFloat(u.area_sqft)).toLocaleString()}/sqft</div>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }} onClick={e => e.preventDefault()}>
                          <AddToCartBtn unitId={u.id} status={u.status} size="sm" />
                          <span style={{ background: "#273b84", color: "white", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 800 }}>View →</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── JOIN JANAPRIYA STATS ───────────────────────────────────────── */}
      <section style={{ background: "linear-gradient(135deg, #0D1B2A, #1a2a6c)", padding: "72px 24px" }}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="section-label" style={{ color: "#7b8fd4" }}>Why Join Us</p>
            <h2 style={{ color: "white", fontWeight: 900, fontSize: 36, lineHeight: 1.2, marginBottom: 16 }}>Join Janapriya And Experience Today</h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: 28 }}>Four decades of excellence, thousands of satisfied families, and a legacy built on trust.</p>
            <Link href="/contact" style={{ display: "inline-block", background: "#273b84", color: "white", borderRadius: 12, padding: "14px 32px", fontWeight: 800, fontSize: 14, textDecoration: "none" }}>
              Get in Touch →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-5">
            {[
              { v: "560+",  l: "Current Listings" },
              { v: "196K+", l: "Total Apartments" },
              { v: "₹16M+", l: "Total Land Value" },
              { v: "40+",   l: "Years of Trust" },
            ].map(s => (
              <div key={s.l} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "24px 20px" }}>
                <div style={{ fontSize: 30, fontWeight: 900, color: "#7b8fd4", marginBottom: 4 }}>{s.v}</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED PROJECTS ──────────────────────────────────────────── */}
      <section style={{ padding: "80px 0", background: "white", position: "relative", overflow: "hidden" }}>
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full" style={{ background: "radial-gradient(circle, rgba(39,59,132,0.05), transparent)", transform: "translate(30%,-30%)" }} />
        <div className="max-w-7xl mx-auto px-6 relative">
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 8 }}>
              <div style={{ width: 32, height: 2, background: "#273b84", borderRadius: 2 }} />
              <p className="section-label" style={{ marginBottom: 0 }}>Our Portfolio</p>
              <div style={{ width: 32, height: 2, background: "#273b84", borderRadius: 2 }} />
            </div>
            <h2 className="section-title">Featured Projects</h2>
            <p style={{ color: "#6B7280", fontSize: 14, marginTop: 8, maxWidth: 500, margin: "8px auto 0" }}>
              Premium residential communities across Hyderabad — crafted to the highest standards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {projects.length > 0 ? projects.slice(0, 3).map((p: any) => (
              <Link key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: "none" }}>
                <div className="card-hover" style={{ background: "white", borderRadius: 20, overflow: "hidden", border: "1.5px solid #e8ebf8", boxShadow: "0 4px 20px rgba(39,59,132,0.08)" }}>
                  <div style={{ height: 224, background: "linear-gradient(135deg, #273b84 0%, #1a2a6c 100%)", position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 20, overflow: "hidden" }}>
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%)" }} />
                    <span style={{
                      alignSelf: "flex-start", display: "inline-block", padding: "5px 14px", borderRadius: 20, fontSize: 11, fontWeight: 800, zIndex: 1,
                      background: p.status === "ready" ? "#e8ebf8" : p.status === "upcoming" ? "#FEF3C7" : "#DBEAFE",
                      color: p.status === "ready" ? "#273b84" : p.status === "upcoming" ? "#92400E" : "#1E40AF",
                    }}>
                      {p.status === "ready" ? "✓ Ready to Move" : p.status === "upcoming" ? "⏳ Upcoming" : "🏗 Under Construction"}
                    </span>
                    <div style={{ zIndex: 1 }}>
                      <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginBottom: 4 }}>{p.project_type || "Residential"}</p>
                      <h3 style={{ color: "white", fontWeight: 900, fontSize: 20, marginBottom: 4 }}>{p.name}</h3>
                      {p.address && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>📍 {p.address}</p>}
                    </div>
                  </div>
                  <div style={{ padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <p style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 2 }}>Starting from</p>
                      <span style={{ fontWeight: 900, fontSize: 18, color: "#0D1B2A" }}>
                        {p.min_price ? formatPrice(p.min_price) : "Price on request"}
                      </span>
                    </div>
                    <span style={{ background: "linear-gradient(135deg,#0D1B2A,#273b84)", color: "white", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 800 }}>View →</span>
                  </div>
                </div>
              </Link>
            )) : [1, 2, 3].map(i => (
              <div key={i} style={{ height: 290, borderRadius: 20, background: "#F3F4F6", animation: "pulse 1.5s ease-in-out infinite" }} />
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: 48 }}>
            <Link href="/projects" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "14px 36px", fontWeight: 800, fontSize: 14, borderRadius: 50, border: "2px solid #273b84", color: "#273b84", textDecoration: "none", transition: "all 0.2s" }}>
              View All Projects →
            </Link>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────────────────────────── */}
      <section style={{ background: "#F8FAFB", padding: "80px 0" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p className="section-label">Happy Families</p>
            <h2 className="section-title">What People Saying About<br />Our Real Estate</h2>
            <p style={{ color: "#6B7280", fontSize: 14, marginTop: 8 }}>70,000+ customers trust us</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="card-hover" style={{ background: "white", borderRadius: 18, padding: 28, border: "1px solid #F0F0F0", boxShadow: "0 4px 16px rgba(0,0,0,0.04)", position: "relative" }}>
                <div style={{ position: "absolute", top: 20, right: 24, fontSize: 40, color: "#e8ebf8", fontWeight: 900, lineHeight: 1 }}>"</div>
                <div style={{ display: "flex", gap: 2, marginBottom: 14 }}>
                  {Array(t.rating).fill(0).map((_, i) => <span key={i} className="star">★</span>)}
                </div>
                <p style={{ color: "#374151", fontSize: 13, lineHeight: 1.75, marginBottom: 20 }}>{t.text}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12, borderTop: "1px solid #F3F4F6", paddingTop: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #0D1B2A, #273b84)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: 16, flexShrink: 0 }}>{t.initial}</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: "#0D1B2A" }}>{t.name}</div>
                    <div style={{ color: "#9CA3AF", fontSize: 11 }}>{t.role}, {t.city}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 24, justifyContent: "center", marginTop: 48, flexWrap: "wrap" }}>
            {["RERA", "IGBC", "ISO 9001", "CRISIL AA", "CREDAI"].map(logo => (
              <div key={logo} style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 10, padding: "10px 20px", fontWeight: 800, fontSize: 12, color: "#6B7280", letterSpacing: 1 }}>{logo}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MEET AGENTS ────────────────────────────────────────────────── */}
      <section style={{ background: "white", padding: "80px 0" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <p className="section-label">Our Team</p>
            <h2 className="section-title">Meet With Agents</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {AGENTS.map(a => (
              <div key={a.name} className="card-hover" style={{ background: "#F8FAFB", borderRadius: 18, padding: "24px 16px", textAlign: "center", border: "1px solid #F0F0F0" }}>
                <div className="agent-avatar">{a.name[0]}</div>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#0D1B2A" }}>{a.name}</div>
                <div style={{ color: "#273b84", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{a.role}</div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                  <span style={{ background: "#e8ebf8", color: "#273b84", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700 }}>{a.exp}</span>
                  <span style={{ background: "#DBEAFE", color: "#1E40AF", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700 }}>{a.deals} deals</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MILESTONES VIDEO ───────────────────────────────────────────── */}
      {mounted && (
        <section style={{ background: "#0D1B2A", overflow: "hidden", position: "relative" }}>
          <video autoPlay muted loop playsInline className="hidden md:block" style={{ width: "100%", maxHeight: 620, objectFit: "cover", opacity: 0.55 }}>
            <source src="/jp_milestones.mp4" type="video/mp4" />
          </video>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: 24 }}>
            <p className="section-label" style={{ color: "#7b8fd4" }}>Our Journey</p>
            <h2 style={{ color: "white", fontWeight: 900, fontSize: 36, marginBottom: 12 }}>40 Years of Milestones</h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, maxWidth: 400 }}>From our first project in 1984 to 40,000+ homes delivered — a legacy of excellence.</p>
          </div>
        </section>
      )}

      {/* ── NEWS & ARTICLES ────────────────────────────────────────────── */}
      <section style={{ background: "#F8FAFB", padding: "80px 0" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40, flexWrap: "wrap", gap: 16 }}>
            <div>
              <p className="section-label">Insights</p>
              <h2 className="section-title">Our Latest Article And<br />News For You</h2>
            </div>
            <Link href="/blog" style={{ color: "#273b84", fontWeight: 800, fontSize: 13, textDecoration: "none", border: "2px solid #273b84", borderRadius: 10, padding: "10px 20px" }}>
              All Articles →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {NEWS.map(n => (
              <div key={n.title} className="card-hover" style={{ background: "white", borderRadius: 18, overflow: "hidden", border: "1px solid #F0F0F0", boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
                <div className="news-img" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 40 }}>🏙️</span>
                </div>
                <div style={{ padding: "18px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span className="badge badge-brand">{n.tag}</span>
                    <span style={{ color: "#9CA3AF", fontSize: 11 }}>{n.date}</span>
                  </div>
                  <h3 style={{ fontWeight: 800, fontSize: 14, color: "#0D1B2A", lineHeight: 1.5, marginBottom: 12 }}>{n.title}</h3>
                  <span style={{ color: "#273b84", fontSize: 12, fontWeight: 800 }}>Read more →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FOOTER BANNER ──────────────────────────────────────────── */}
      <section style={{ background: "linear-gradient(135deg, #273b84, #1a2a6c)", padding: "72px 24px", textAlign: "center" }}>
        <div className="max-w-2xl mx-auto">
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", marginBottom: 14 }}>Take The Next Step</p>
          <h2 style={{ color: "white", fontWeight: 900, fontSize: 36, marginBottom: 12, lineHeight: 1.2 }}>Ready to Find Your<br />Dream Home?</h2>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, marginBottom: 32 }}>Talk to our experts today. Site visits available 7 days a week. No spam — ever.</p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/site-visit" style={{ background: "white", color: "#273b84", borderRadius: 12, padding: "14px 32px", fontWeight: 900, fontSize: 14, textDecoration: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
              🗓 Schedule a Visit
            </Link>
            <Link href="/projects" style={{ background: "rgba(255,255,255,0.12)", color: "white", borderRadius: 12, padding: "14px 32px", fontWeight: 800, fontSize: 14, textDecoration: "none", border: "2px solid rgba(255,255,255,0.3)" }}>
              Browse Projects →
            </Link>
          </div>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 20 }}>📞 Our team will reach out within 24 hours.</p>
        </div>
      </section>

      <Footer />
    </main>
  );
}