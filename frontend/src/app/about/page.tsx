import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

export const metadata = { title: "About Us — Janapriya Upscale" };

const TEAM = [
  {
    name: "Mr. Ravinder Reddy",
    role: "Founder & Chairman",
    bio: `Mr. Ravinder Reddy, Founder & Chairman of the Janapriya Group is an engineer who envisioned a company that changed the way people view property. He studied Civil Engineering at NIT (Rourkela) and began his career as a Junior Engineer in the Government Irrigation Department.

In 1985, Janapriya was born as a small part-time plotting business. Over the years, it grew into a full-fledged construction company that helped many salaried employees own their homes through affordable financing.

He recognized that many people could not afford homes due to lack of loan awareness and an unorganized construction sector. His approach focused on cost efficiency, transparency, and customer-first development.

Today, Janapriya continues to deliver quality housing and upscale projects while carrying forward his legacy.`,
    image: "/ravinder-sir.png",
  },
  {
    name: "Kranti Kiran Reddy",
    role: "Managing Director",
    bio: `Kranti Kiran Reddy is the Managing Director of Janapriya Group, a leading real estate development company in South India.

After graduating from Osmania University with a bachelor’s degree in Civil Engineering (CBIT), he went to USA to get his master’s in Construction Management from the NC State University. He returned to join the company in 2005 with a passion for delivery. Since then, Kranti has been able to amplify the company’s existing DNA of self-perform in construction and accelerate the pace of their projects.

In addition to developing this ability, Kranti had a vision for quality and speed in their projects. To achieve this, Janapriya became the first Company in India to adopt German formwork technology and precast technologies—with more than 6500 apartments being delivered using these methods. This transformation made Janapriya a brand known for high-quality housing at a fast pace.

SAP and Salesforce: The Power Couple That Keeps Janapriya Running Smoothly

For a company that provides the highest level of customer service, it’s essential to have a process management system that’s easy to use, intuitive, and flexible. This is why Kranti implemented SAP at Janapriya so that they could ensure near-perfect process management in their business practices. Furthermore, to ensure absolute customer service and transparency of processes to customers, Janapriya also implemented Salesforce to provide all necessary information quickly and effectively to clients who need it most!`,
    image: "/kranti-sir.png",
  },
  {
    name: "Nandanandan Reddy",
    role: "Director",
    bio: `Nandan, who has a Bachelors in Civil Engineering, started his career as a Marketing Engineer with Janapriya in 1992. He was able to combine his knowledge of construction with an acumen for marketing, and he worked under Mr. Reddy to take on additional responsibilities as the company’s Marketing Personnel. Over the years, Nandan’s career progressed, becoming General Manager – Sales & Marketing to lead his teams to new heights.

Presently, Nandan is serving as Director of the Company and shoulders responsibility for business development, investor relations, and legal affairs.`,
    image: "/nandan.png",
  },
  {
    name: "Kamal Kishan",
    role: "Vice President / Marketing",
    bio: `Kamal Kishan is a results-oriented professional with over 29 years of experience in Advertising, Sales, and Marketing. He has handled clients from small start-ups to global corporations with excellent leadership and team-building skills.

As a result-oriented professional with demonstrated expertise and deep understanding of Media & Communication, Corporate Comms, Sales and Marketing initiatives, Pre-planning, Budgeting, Campaign Conceptualization & Execution, Media Buying & Planning, Client Servicing, PR Exercises, Forecasting, executing extensive Exhibitions and Events has ensured the brands reach their target audience seamlessly. Kamal has handled clients ranging from small start-ups to global corporations. His diverse experience with multi-national clients, agencies, and media houses has contributed to the growth of many brands.

Kamal has over a decade of experience advising business leaders and helping them reach their full potential. He has worked with some of the best advertising agencies in South India, as well as Mindshare (A WPP Company), where he headed their Hyderabad branch as a Senior Director.

His experiences have allowed him to gain the trust and confidence of influential decision-makers across multiple industries that built lasting relationships. In addition, he worked closely with business leaders to influence the direction of their company’s marketing strategy.

`,
    image: "/kamal.png",
  },
  {
    name: "Maneesh Kumar Dubey",
    role: "AVP Construction",
    bio: `Maneesh Kumar Dubey, AVP Construction, has more than two decades of experience in real estate and commercial projects. He is a qualified civil engineer with extensive experience in design, execution, and project management.

Maneesh has worked with major construction organizations across India and Malaysia. While holding key roles with engineering, project management he has led teams to deliver major landmarks. He has worked with reputed conglomerates like IJM Corporation Berhad, IJM(India) Infrastructure Ltd, Mitrajaya Holding Sdn Berhad Malaysia prior to joining our group.

He is currently heading the construction and related activities since 2022`,
    image: "/manish.png",
  },
  {
    name: "Mr. Satish Kumar",
    role: "CFO",
    bio: `Satish Kumar is a qualified Charted Accountant & Cost Accountant and holds CIMA from UK and Executive MBA from ISB.

He is an Award winning finance professional and has 16+ years of experience in Financial Planning & Analysis, Stakeholder Management, reengineering F&A, delivering key business decisions cantered on strategy, business growth and optimization functions. Offers accomplished career in steering the implementation of strategic financial plans to ensure ROI, ROCE with robust financial and accounting policies and leveraging deep industry know-how.  His expertise lies in Pricing Strategies, Risk Management, Business Growth, Post Merger Activities, Regulatory Compliance, Budgeting, Forecasting, Variance Analysis, GAAP/IFC/SOX Compliance, Treasury, Legal and Secretarial Practice.  He worked in diversified roles with various industries like Bharathi Cements, Apollo Hospitals Enterprises Ltd., Bharati Airtel Ltd., Vendanta Aluminium Ltd. He functions as a trusted advisor to top management and internal department teams with a strong understanding of business models, processes, systems, and underlying controls, and the ability to influence positive change in these areas.

`,
    image: "/satish-sir.jpg",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white font-sans">
      <Navbar />

      {/* HERO */}
      <div
        className="pt-16"
        style={{
          backgroundImage: "url('/banner.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          height: "600px",
        }}
      />

      {/* ABOUT TEXT */}
      <section className="py-20 bg-[#F8F9FB]">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-sm text-gray-600 leading-relaxed mb-6" style={{ textAlign: "justify", fontSize: "18px" }}>
           Janapriya Homes came into existence in the late eighties under Mr. Ravinder Reddy’s (Chairman) guidance amid the real estate boom wave. The prime objective then was to build an ideal solution for home buyers seeking homes within a specified budget. As a result, Janapriya has been building homes of all sizes, types, and styles For the past 39 years. In its pursuit of bringing real estate to many and supporting every step of the way. For the past 39 years. Since 1985, we’ve delivered 26,250 homes to our valued customers, starting with 700 homes in 1985 to 26,250-plus delivered homes as of March 2017 in Bangalore & Hyderabad. Today, we’re one of the most reputable building companies in South India.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed" style={{ textAlign: "justify", fontSize: "18px" }}>
            In the early 90s, our Chairman had a far-sightedness and a vision that everyone must own a home. He made it possible by cutting down on third-party expenses, reducing construction costs and maintaining quality. As a result, we accomplished many feats that lessened the burden on the buyer due to our in-depth expertise. For example, we have an in-house Brick manufacturing facility, crusher, and concrete plant, and we even make door and window frames.
          </p>
		  <p className="text-sm text-gray-600 leading-relaxed" style={{ textAlign: "justify", fontSize: "18px" }}>To make things easier – when sanctions on home loans were challenging, we introduced a friendly financing option that allowed home buyers to walk in with just Rs. 10,000 as an initial payment and own a home. He created the belief – Anyone could walk into Janapriya’s office and leave with a home.</p>
          <p className="text-sm text-gray-600 leading-relaxed" style={{ textAlign: "justify", fontSize: "18px" }}>We will keep pace with the ever-more demands of today’s discerning home buyers through our various land parcels in Bengaluru & Hyderabad. We build homes that reflect your personality. So if you’re looking for an apartment, a villa, or a house of your own, you’ll find something within our portfolio.</p>
		</div>
      </section>

      {/* QUOTE */}
      <section className="py-20 text-center">
        <h2 className="text-2xl md:text-3xl font-semibold text-[#2A3887] leading-relaxed max-w-3xl mx-auto">
          You can dream, create, design, and build the most wonderful place in
          the world. But it requires people to make the dream a reality.
        </h2>
      </section>

      {/* TEAM SECTION */}
      <section className="py-24 bg-white">
        <div className="mx-auto px-6 space-y-28" style={{ maxWidth: "90rem" }}>

          {TEAM.map((m, i) => (
            <div
              key={i}
              className={`flex flex-col md:flex-row items-center md:items-start gap-12 ${
                i % 2 !== 0 ? "md:flex-row-reverse" : ""
              }`}
            >

              {/* IMAGE */}
              <div className="flex-shrink-0">
                <div
                  className="w-60 h-60 md:w-72 md:h-72 rounded-full overflow-hidden"
                  style={{ boxShadow: "0 20px 60px rgba(42,56,135,0.2)" }}
                >
                  <img
                    src={m.image}
                    alt={m.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* CONTENT */}
              <div
  className="max-w-2xl text-center md:text-left"
  style={{ maxWidth: "62rem" }}
>
                <h3 className="text-2xl font-semibold text-[#2A3887] mb-1">
                  {m.name}
                </h3>

                <p className="text-sm font-semibold text-[#29A9DF] mb-4">
                  {m.role}
                </p>

                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line" style={{ textAlign: "justify" }}>
                  {m.bio}
                </p>
              </div>

            </div>
          ))}

        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center bg-white">
        <h2 className="text-3xl font-bold text-[#262262] mb-4">
          Ready to Find Your Dream Home?
        </h2>

        <p className="text-gray-600 mb-8">
          Browse our premium projects or connect with our team today.
        </p>

        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/store"
            className="px-8 py-3 text-white rounded-full font-semibold"
            style={{
              background: "linear-gradient(135deg,#2A3887,#29A9DF)",
            }}
          >
            Browse Properties →
          </Link>

          <Link
            href="/contact"
            className="px-8 py-3 border-2 border-[#2A3887] text-[#2A3887] rounded-full font-semibold"
          >
            Contact Us
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}