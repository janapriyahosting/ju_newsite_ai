import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import Footer from "@/components/Footer";

export const metadata = { title: "Technology — Janapriya Upscale" };

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimelineEntry {
  id: number;
  side: "left-image" | "right-image";
  title: string;
  body: string;
  imageSrc: string;
  imageAlt: string;
  caption?: { line1: string; line2: string };
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const TIMELINE: TimelineEntry[] = [
  {
    id: 1,
    side: "left-image",
    title: "Technology",
    body: "At Janapriya we are very innovative. Self-performing Construction has been our core strength from inception in July 1995. We have many firsts when it comes to technology in construction. We introduce technology in ways that our Homes get more space and look aesthetically pleasing to the naked eye. The benefits of technology are Standardisation without relying solely on human skillsets, Timely delivery, reduction in people needed for construction from labour to managerial staff and most importantly consistent Quality.",
    imageSrc: "/technology.jpg",
    imageAlt: "Janapriya building aerial view",
  },
  {
    id: 2,
    side: "right-image",
    title: "Shear Wall Technology",
    body: "All our building are designed with most of the concrete walls going way in to the foundations. Such walls are called Shear Walls. Shear walls allow for greater resistance against earth quakes. Having the building designed with concrete walls removes the existence of columns and beams directly increasing the space in your rooms may it be your living rooms, Bed rooms or kitchens. You will no longer have readjust your sofa because the side table won\u2019t fit as there is a column protrusion in the corner of your room. This additional space is 3% higher than your normal space but feels like much more when you see all the furniture you can fit in.",
    imageSrc: "/shearwall.jpg",
    imageAlt: "Reinforced Concrete Shear Walls",
    caption: { line1: "REINFORCED", line2: "CONCRETE SHEAR WALLS" },
  },
  {
    id: 3,
    side: "left-image",
    title: "German \u2018Modular\u2019 Formwork",
    body: "We own most of the German formwork that we build with. We have started using this technology since 2008 onwards and delivered more than 6000 units using this method. No Developer has ventured into owning equipment the way we did. The use of these systems gives us great flexibility in deployment of formwork, speed up building delivery whenever needed. Our formwork allows us to build any configuration of flat without relying on the manufacturing unlike rigid formwork systems. Furthermore we have the wherewithal to go as tall as possible with his technology. We have already built more than 45m tall building using this technology and are now on the way to build up to 120m tall structures.",
    imageSrc: "/german.jpg",
    imageAlt: "German Modular Formwork construction",
  },
  {
    id: 4,
    side: "right-image",
    title: "Precast",
    body: "Janapriya is the first to build in Precast technology with machinery bought from Finland in 2008 or 2010. We own a precast plant that deliver factory made walls lifted with heavy cranes on site to its location. We have built the first 10 floor building in the country using Precast. We have built 2000 units high end villas namely Janapriya Silver crest using precast. The quality that can be managed in a controlled factory like environment is impeccable and the same is reflected in the projects where we have used Precast.",
    imageSrc: "/precast.jpg",
    imageAlt: "Precast concrete panels",
  },
];

// ─── TimelineItem ─────────────────────────────────────────────────────────────

interface TimelineItemProps {
  entry: TimelineEntry;
  isLast: boolean;
}

function TimelineItem({ entry, isLast }: TimelineItemProps) {
  const isLeftImage = entry.side === "left-image";

  // Desktop connector line maths — UNCHANGED
  const lineOffsetLeft = isLeftImage
    ? `calc(${(50 / 56) * 100}% - 0.5px)`
    : `calc(${((50 - 44) / 56) * 100}% - 0.5px)`;

  // ── image block — desktop styles UNCHANGED, only w-full added for mobile ──
  const imageBlock = (
    <div className="w-full md:w-[56%] md:flex-shrink-0">
      <div className="relative">
        <img
          src={entry.imageSrc}
          alt={entry.imageAlt}
          className="w-full object-cover rounded-2xl bg-gray-100"
          style={{
            height: "100%",
            // UNCHANGED from original desktop version:
            boxShadow: "0px 18px 30px 1px rgba(0, 0, 0, 0.64)",
          }}
        />
        {entry.caption && (
          <div className="absolute bottom-4 right-4 bg-white/95 border border-gray-200 px-3 py-2 text-right">
            <span className="block text-[8px] font-bold tracking-[0.16em] uppercase text-gray-600 leading-[1.7]">
              {entry.caption.line1}
              <br />
              {entry.caption.line2}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  // ── text block — desktop styles UNCHANGED, pt-4 added for mobile spacing ──
  const textBlock = (
    <div
      className={`
        w-full md:w-[44%] md:flex-shrink-0
        flex flex-col justify-center
        pt-4 md:pt-0
        ${isLeftImage ? "md:pl-12 md:pr-10" : "md:pl-10 md:pr-12 md:text-right"}
      `}
    >
      <h2
        className="font-bold tracking-[0.2em] uppercase text-gray-900 mb-4"
        style={{ fontSize: 18 }}
      >
        {entry.title}
      </h2>
      <p className="text-gray-500 leading-[1.8]" style={{ fontSize: 12.5,textAlign: "justify" }}>
        {entry.body}
      </p>
    </div>
  );

  return (
    <div className={isLast ? "" : "mb-10 md:mb-0"}>

      {/* ── Row ──
            mobile  : flex-col — image always on top, text below
            desktop : flex-row — respects left-image / right-image side
      ── */}
      <div className="flex flex-col md:flex-row md:items-center">
        {isLeftImage ? (
          <>
            {imageBlock}
            {textBlock}
          </>
        ) : (
          <>
            {/* Mobile: image on top regardless of side */}
            <div className="md:hidden">{imageBlock}</div>
            <div className="md:hidden">{textBlock}</div>

            {/* Desktop: text left, image right — UNCHANGED layout */}
            <div className="hidden md:contents">
              {textBlock}
              {imageBlock}
            </div>
          </>
        )}
      </div>

      {/* ── Desktop connector line — UNCHANGED (width: 1, color #c0c0c0) ── */}
      {!isLast && (
        <div className="hidden md:block relative" style={{ height: 120 }}>
          <div
            style={{
              position: "absolute",
              top: 0,
              width: "56%",
              left: isLeftImage ? 0 : "44%",
            }}
          >
            <div
              style={{
                marginLeft: lineOffsetLeft,
                width: 3,          // UNCHANGED
                height: 120,
                background: "#ccc", // UNCHANGED
              }}
            />
          </div>
        </div>
      )}

      {/* ── Mobile only: subtle divider between entries ── */}
      {!isLast && (
        <div className="md:hidden flex justify-center mt-8">
          <div className="w-12 h-px bg-gray-300" />
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TechnologyPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      {/* ── HERO BANNER — mobile shorter, desktop UNCHANGED at 600px ── */}
      <div className="pt-[60px]">
        <div className="w-full h-[220px] sm:h-[350px] md:h-[500px] xl:h-[600px] overflow-hidden">
          <img
            src="/banner.jpg"
            alt="Janapriya Upscale Buildings"
            className="w-full h-full object-cover object-center"
          />
        </div>
      </div>



      {/* ── TIMELINE ──
            mobile  : px-4 (comfortable side padding)
            tablet  : px-8
            desktop : 18rem each side — UNCHANGED
      ── */}
      <div className="pt-6 pb-16 md:pb-24 px-4 md:px-8 xl:px-0">
        <div className="timeline-xl-padding">
          <style>{`
            @media (min-width: 1280px) {
              .timeline-xl-padding {
                padding-left: 18rem;
                padding-right: 18rem;
				padding-top: 5rem;
              }
            }
          `}</style>

          {TIMELINE.map((entry, i) => (
            <TimelineItem
              key={entry.id}
              entry={entry}
              isLast={i === TIMELINE.length - 1}
            />
          ))}
        </div>
      </div>

      <Footer />
    </main>
  );
}