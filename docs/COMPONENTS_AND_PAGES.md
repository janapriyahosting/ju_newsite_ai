# Janapriya Upscale — Detailed Pages & Components Reference

Complete developer documentation. Covers every page, component, state, API call, and user flow.

**Tech stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS · Zustand

**Base API URL:** `process.env.NEXT_PUBLIC_API_URL` → e.g. `http://173.168.0.81/api/v1`

---

# PART 1 — CUSTOMER-FACING PAGES

## 1.1 Homepage `/`

**File:** `app/page.tsx`

### Purpose
Landing page showcasing Janapriya Upscale's flagship projects. Highlights trending units, featured projects, and drives users toward store browsing or contact.

### Key Sections
- Hero banner with headline & CTA (Browse Store)
- Trending Units carousel (6 units)
- Featured Projects grid
- "By Budget" carousel (Quick filters: ₹1.3Cr+, ₹90L+, ₹70L+, ₹50L+)
- "By Size" carousel (500+, 1000+, 1500+, 2000+ sqft)
- "By Bedrooms" carousel (1/2/3 BHK investments)
- Testimonials / Reviews
- Newsletter signup
- CTA footer

### API Endpoints
- `GET /units/trending?limit=6`
- `GET /projects?is_featured=true`
- `POST /search/nlp` (hero search, optional)

### Components Used
`Navbar`, `Footer`, `PropertyCard`, `AddToCartBtn`

### State
- `trendingUnits` — trending unit array
- `featuredProjects` — featured project array
- `loading` — page load state
- `searchQuery` — hero search input

### Interactions
Browse trending · Quick filter → pre-built store links · Subscribe newsletter · NLP search · Enquire/View Details

**URL params:** None · **Auth:** None

---

## 1.2 Store `/store`

**File:** `app/store/page.tsx`

### Purpose
Main property browse page. **All filters are admin-managed** via `/admin/store-filters`. Supports AI search, URL-param filter presets, and unit comparison.

### Key Sections
- Sticky filter bar: pills (Unit Type), selects (Status, Sort, Plan Series, etc.), Trending toggle
- Advanced filter panel (collapsible): price range, area range, facing, floor level, bedrooms, custom fields
- AI Search input (NLP)
- Unit grid (3 columns desktop, 1 mobile)
- CompareBar (floating, shows selected units)

### API Endpoints
- `GET /admin/cms/public/store-filters` — **filter config (admin-driven)**
- `GET /admin/cms/public/settings` — max price/area ranges
- `GET /units?page_size=200`
- `GET /units/trending?limit=50`
- `POST /search/nlp` (AI search)

### Components Used
`Navbar`, `Footer`, `BackButton`, `CompareBar`, `UnitCard` (inline), `RangeSlider` (inline)

### State
- `filterConfigs` — filter definitions from API
- `filterValues` — current filter selections (`Record<filter_key, any>`)
- `siteSettings` — admin settings for range maxes
- `units`, `trendingIds`, `filtered` (computed)
- `aiQuery`, `aiActive`, `searching`
- `filtersOpen` (advanced panel toggle)

### Interactions
Apply filters (auto-update grid) · AI search · Save/Compare/Share unit cards · Add to cart · Reset filters

### URL Params (all auto-applied)
| Param | Maps to filter |
|-------|----------------|
| `unit_type`, `status`, `sort`, `facing`, `bedrooms`, `floor_level`, `series_code` etc. | matching `filter_key` |
| `min_price` / `max_price` | price range slider |
| `min_area` / `max_area` | area range slider |
| `trending=1` | trending checkbox |

**Auth:** None (cart requires login)

---

## 1.3 Unit Detail `/units/[id]`

**File:** `app/units/[id]/page.tsx`

### Purpose
Comprehensive unit profile — media gallery with vertical thumbnail strip, specs, pricing, EMI/RiseUp calculators, brochure download, enquiry, booking.

### Key Sections
- **Vertical thumbnail slider** (left, outside media box) + main viewer — 2D/3D plans, model flat video, tower elevation, project image/video, walkthrough, photos
- Unit title bar (gradient) — type, status, Save/Compare/Share
- Unit specs grid (BHK, area, floor, facing, bathrooms, balconies, price)
- Price breakdown (base, down payment, EMI)
- **RiseUp Calculator** (80/20 pay plan)
- **Home Loan EMI Calculator** (interactive sliders + pie chart)
- Custom fields (admin-configured sections)
- Tower amenities
- Sidebar: Book Site Visit · Download Brochure · 🏦 Home Loan · 📋 Get Quote · Add to Cart · Enquire

### API Endpoints
- `GET /units/{id}`
- `GET /admin/sections/public/unit`
- `GET /admin/fields/public-values/unit/{id}`
- `GET /admin/towers/{tower_id}`
- `GET /projects` (project context)
- `POST /leads` (enquiry)

### Components Used
`Navbar`, `Footer`, `BackButton`, `UnitMediaProvider`, `UnitMediaThumbs`, `UnitMediaMain`, `RiseUpCalculator`, `HomeLoanEMICalculator`, `DynamicFields`, `AddToCartBtn`

### State
- `unit`, `tower`, `project`, `towerAmenities`, `towerData`
- `unitSections`, `customFieldMap`
- `loading`, `blocked` (if booked/sold)
- `saved`, `inCompare`, `toast`
- `enquireOpen`, `cartAdded`, `cartLoading`

### Interactions
Media gallery navigation · Save/Compare/Share · Add to cart · Open enquiry modal · EMI/RiseUp calc · Download brochure (login-gated) · Book site visit · Apply home loan

### URL Params
- `?enquire=true` → auto-open enquiry modal
- `?download=brochure` → auto-trigger brochure download after login

**Auth:** Partial (login required for brochure/booking)

---

## 1.4 Projects List `/projects`

**File:** `app/projects/page.tsx`

### Purpose
Browsable grid of all Janapriya projects with status filters.

### Key Sections
- Hero banner
- Sticky filter bar: All · Ready to Move · Under Construction · New Launch
- Project cards (3-column grid): status, units count, min–max price, location
- Quick view / Enquire buttons per card

### API Endpoints
- `GET /projects?limit=50`

### Components Used
`Navbar`, `Footer`, `BackButton` + inline project card

### State
- `filter` — selected status
- `allProjects`, `filtered` (computed)
- `loading`

**URL params:** None · **Auth:** None

---

## 1.5 Project Detail `/projects/[id]`

**File:** `app/projects/[id]/page.tsx`

### Purpose
In-depth project showcase with towers, units, gallery, walkthrough, brochure, and inline enquiry/site visit forms.

### Key Sections
- Hero (project name, address, RERA, total units, available, towers)
- **Sticky tab nav:** Overview · Towers · Units
- **Overview tab:** Gallery, floor plans, video, walkthrough, brochure, amenities, map, custom sections, inline forms
- **Towers tab:** Tower cards (thumbnail, floors, units, media indicators)
- **Units tab:** Full unit grid
- Inline OTP enquiry form (project-level)
- Site visit booking form (project-level)

### API Endpoints
- `GET /projects?limit=50` → find by slug/id
- `GET /projects/{id}`
- `GET /projects/{id}/towers`
- `GET /admin/sections/public/project`
- `GET /units?tower_id={id}&limit=200` (per tower)
- `POST /auth/send-otp`, `/auth/verify-otp`
- `POST /leads`, `/site-visits`

### Components Used
`Navbar`, `Footer`, `DynamicFields`, `UnitCard`, inline Gallery/FloorPlans/forms

### State
- `project`, `towers`, `units`, `sections`
- `tab`, `loading`
- `enquireForm`, `visitForm`, `otpStep`

**URL params:** route `[id]` only · **Auth:** None (creates lead via OTP)

---

## 1.6 Cart `/cart`

**File:** `app/cart/page.tsx`

### Purpose
View/manage units saved for potential purchase. Bulk enquiry.

### Key Sections
- Header with item count + clear cart
- Cart items (unit details + remove button)
- Bulk actions: Continue Shopping · Request Callback · Proceed to Booking
- Summary stats (total items, total value)

### API Endpoints
- `GET /cart/units` (JWT required)
- `DELETE /cart/{cartItemId}`

### State
- `items`, `loading`, `removing`

**URL params:** None · **Auth:** Customer JWT (redirects to login)

---

## 1.7 Compare `/compare`

**File:** `app/compare/page.tsx`

### Purpose
Side-by-side comparison table of 2-3 selected units.

### Key Sections
- Header (info)
- Unit cards at top (image, price, key info)
- Comparison table rows: Unit #, Type, BHK, Bathrooms, Area, Floor, Price, Status, Facing

### API Endpoints
- `GET /units/{id}` (for each unit)

### State
- `units` (2-3), `loading`, `ids` (from URL)

**URL params:** `?ids=id1,id2,id3` · **Auth:** None

---

## 1.8 Contact `/contact`

**File:** `app/contact/page.tsx`

### Purpose
Lead capture form with OTP phone verification. Salesforce CRM integration.

### Key Sections
- Form: Name, Email, Phone, Project dropdown, Message, Consent
- OTP verification step (6-digit, auto-focus, resend countdown)
- Success message
- Office address, phone, email

### API Endpoints
- `POST /auth/send-otp` (purpose=lead)
- `POST /auth/verify-phone`
- `POST /leads`

### State
- `form`, `errors`, `otpStep`, `otp`, `otpLoading`, `otpError`
- `countdown` (30s), `devOtp`, `status`

### URL Params
- `?unit={unitId}` — pre-populate for specific unit

**Auth:** None

---

## 1.9 Site Visit `/site-visit`

**File:** `app/site-visit/page.tsx`

### Purpose
Schedule site visit with OTP-verified phone. Sends SMS + WhatsApp confirmations.

### Key Sections
- Form: Name, Phone, Email, Visit Date (min tomorrow), Visit Time (7 slots 10AM–5PM), Notes, Consent
- OTP verification step
- Success confirmation

### API Endpoints
- `POST /auth/send-otp` (purpose=site_visit)
- `POST /auth/verify-phone`
- `POST /site-visits`

### State
- `form`, `errors`, `otpStep`, `otp`, `countdown`, `submitted`, `submitError`

**URL params:** None · **Auth:** None (creates visit record via OTP)

---

## 1.10 Booking Flow `/booking/[unitId]`

**File:** `app/booking/[unitId]/page.tsx`

### Purpose
Complete booking workflow — Razorpay payment + KYC + receipt.

### Key Sections
- Unit summary (name, price, down payment)
- Booking form (notes, coupon, consent)
- **Razorpay checkout** modal
- 4-step KYC form:
  - Primary applicant (name, PAN, Aadhaar, address, phone, email)
  - Co-applicant (optional)
  - Primary employment (job type, income, org, experience, payslips, Form 16)
  - Co-applicant employment
- Receipt download (after payment)

### API Endpoints
- `GET /units/{unitId}`
- `POST /bookings` → returns Razorpay order
- `POST /bookings/{id}/verify-payment` (signature check)
- `POST /bookings/{id}/kyc`
- `GET /bookings/{id}/receipt`

### State
- `unit`, `loading`, `token`, `submitting`
- `booking`, `paymentDone`, `error`
- `form` (notes, coupon_code, consent)
- `kycStep` (1-4), `primary`, `coApplicant`, `primaryEmployment`, `coEmployment`
- `receiptData`

**URL params:** route `[unitId]` · **Auth:** Customer JWT (auto-redirect)

---

## 1.11 Home Loan Application `/home-loan/[unitId]`

**File:** `app/home-loan/[unitId]/page.tsx`

### Purpose
Multi-step home loan application for selected unit.

### Key Sections
- Unit summary
- **Step 1:** Personal details (name, PAN, Aadhaar, DOB, address, state)
- **Step 2:** Employment (job type, income, org, experience, payslips, Form 16)
- **Step 3:** Co-applicant details (optional)
- **Step 4:** Co-applicant employment
- Success screen with reference number

### API Endpoints
- `GET /units/{unitId}`
- `POST /home-loan-requests`

### State
- `unit`, `loading`, `token`, `submitting`
- `step` (1-4 or success)
- `primary`, `primaryEmployment`, `coApplicant`, `coEmployment`
- `includeCoApplicant`, `error`, `successRef`

**URL params:** route `[unitId]` · **Auth:** Partial (auto-redirects to login)

---

## 1.12 Customer Dashboard `/dashboard`

**File:** `app/dashboard/page.tsx`

### Purpose
Central hub for logged-in customers.

### Tabs
1. **Overview** — welcome, stats, recent bookings
2. **My Bookings** — status, receipt download, KYC upload
3. **KYC Documents** — PAN, Aadhaar, payslips, Form 16, face verification
4. **Site Visits** — schedule/reschedule, date/time/status
5. **Home Loans** — application status, disbursement details
6. **Saved Properties** — grid with remove button
7. **Change Password** — current/new/confirm
8. **Profile** — name, email, phone, address, profile pic

### API Endpoints
- `GET /bookings`, `/site-visits`, `/home-loan-requests`
- `GET /bookings/{id}/receipt`
- `GET /units/{unitId}` (for saved units)
- `POST /bookings/{id}/kyc`, `GET /bookings/kyc/{bookingId}`
- `POST /auth/change-password`
- `POST /auth/profile/pic`, `DELETE /auth/profile/pic`
- `POST /auth/profile/send-otp`, `/auth/profile/verify-update`
- `PATCH /auth/profile`
- `PATCH /site-visits/{id}`

### State
`customer`, `tab`, `bookings`, `visits`, `homeLoanRequests`, `savedIds`, `receiptData`, `receiptOpen` + per-tab form states

### URL Params
`?tab=overview|bookings|kyc|visits|home-loans|saved|password|profile`

**Auth:** Customer JWT

---

## 1.13 Login `/login`

**File:** `app/login/page.tsx`

### Purpose
Phone + OTP login for customers.

### Features
- PhoneOtpVerify component (mode=login)
- "Create Account" link if phone not found
- Security badges (Secure Login, 70K+ Happy Families, RERA)

### API Endpoints
- `POST /auth/send-otp`, `/auth/verify-otp`

### URL Params
- `?redirect=/some-page` — post-login redirect
- `?reason=booking|cart|session_expired`

**Auth:** None

---

## 1.14 Register `/register`

**File:** `app/register/page.tsx`

### Purpose
New customer signup with phone OTP + profile collection.

### Features
- PhoneOtpVerify (mode=register, collectProfile=true)
- Collects: phone, name, email (optional), consent

### API Endpoints
- `POST /auth/send-otp`, `/auth/verify-otp`

### URL Params
- `?redirect=/some-page`

**Auth:** None

---

## 1.15 AI Search `/search`

**File:** `app/search/page.tsx`

### Purpose
NLP search results — interprets queries like "3BHK under 1 crore facing East".

### Key Sections
- Search input with example suggestions
- "Interpreted as" display (shows parsed filters)
- Results grid
- Empty state

### API Endpoints
- `POST /search/nlp` (Groq/spaCy/regex 3-layer parsing)
- `POST /search/filter` (fallback)

### State
- `query`, `loading`, `results`, `total`, `message`, `interpreted`, `hasApiKey`

**Auth:** None

---

## 1.16 About `/about` & Technology `/technology`

**Files:** `app/about/page.tsx`, `app/technology/page.tsx`

### Purpose
Static marketing pages — company info, team, tech stack, sustainability.

### About Page Sections
Hero · Company history · Leadership (Kamal, Manish with photos) · Awards · Culture · Milestones

### Technology Page Sections
Hero · AI-Powered Smart Homes · Tech Stack grid (BIM, EV, green building, JP Digital App, biometric, water/waste management) · Sustainability (IGBC, green rating) · Digital tools · Competitor comparison

**API:** None · **State:** None · **Auth:** None

---

# PART 2 — ADMIN PAGES

All admin pages require JWT (`admin_token` in localStorage). Roles: `admin`, `superadmin`.

## 2.1 Admin Login `/admin/login`

**File:** `app/admin/login/page.tsx`

### Purpose
Username + password login for admin users.

### API: `POST /admin/login`

### State
`username`, `password`, `error`, `loading`

**Auth:** None (public login)

---

## 2.2 Admin Dashboard `/admin/dashboard`

**File:** `app/admin/dashboard/page.tsx`

### Purpose
Platform overview — key metrics, recent activity.

### Sections
- Stats cards: total units, available, customers, leads, bookings, visits
- Recent admin logins
- 30-day registration chart
- Recent leads list
- Change password modal
- Quick nav links

### API Endpoints
- `GET /admin/stats`
- `GET /admin/customers/recent-logins?limit=8`
- `GET /admin/customers/registrations/chart?days=30`

### State
`stats`, `logins`, `chart`, `loading`, `pwModal`, `pwForm`, `pwMsg`, `pwSaving`

---

## 2.3 Analytics `/admin/analytics`

**File:** `app/admin/analytics/page.tsx`

### Purpose
Track visitor/customer behavior — NLP searches, sessions, engagement.

### Sections
- Date range: 7 / 30 / 60 / 90 days
- Summary cards: total searches, visitor sessions, customer sessions, avg time
- Tabs: Searches · Sessions
- Search/filter by customer name or page

### API: `GET /admin/analytics?days={N}`

### State
`data`, `loading`, `days`, `tab`, `searchQ`

---

## 2.4 Leads `/admin/leads`

**File:** `app/admin/leads/page.tsx`

### Purpose
Manage sales leads, track status, auto-scoring.

### Sections
- Filter by status: new / contacted / qualified / converted / lost
- Leads table: Name, Phone, Project, Score, Source, Status, Date
- Expandable rows (email, message, KYC status)
- Status dropdown inline edit
- **Rescore All** button
- Pagination (15/page)

### API Endpoints
- `GET /admin/leads?page={n}&page_size=15&status={s}`
- `PATCH /admin/leads/{id}`
- `POST /admin/leads/rescore`

### State
`leads`, `total`, `page`, `filterStatus`, `loading`, `updating`, `expandedId`

---

## 2.5 Customers `/admin/customers`

**File:** `app/admin/customers/page.tsx`

### Purpose
Manage registered customer accounts.

### Sections
- Stats: total registrations, active, this month, this week
- Search (name/email/phone)
- Customer list (side panel)
- Detail panel (profile, bookings, KYC status, wallet)

### API Endpoints
- `GET /admin/customers?limit=200`
- `GET /admin/customers/stats`

### State
`customers`, `loading`, `search`, `selected`, `stats`

---

## 2.6 Units `/admin/units` + `[id]/page.tsx`

### List Page

**Purpose:** CRUD for units, filter by type/status, inline edit

**Sections:**
- Filter: Unit Type (1BHK-4BHK, Villa, Plot, Studio) · Status (available/hold/booked/blocked)
- Table: Unit #, Type, Floor, Facing, Area, Price, Token, EMI, Trending, Featured, Status
- Inline edit (status dropdown, trending/featured toggles)
- Bulk Dimensions link → `/admin/units/bulk-dimensions`
- Pagination (15/page)

**API:**
- `GET /admin/units?page={n}&page_size=15&status={s}&unit_type={t}`
- `PATCH /admin/units/{id}`

**State:** `units`, `total`, `page`, `filterStatus`, `filterType`, `loading`, `updating`

### Edit Page `/admin/units/[id]`

**Purpose:** Full unit editor

**Sections:** Basic info · Pricing · Floor/Facing · Media uploads · Amenities · Status

**API:**
- `GET /admin/units/{id}`
- `PATCH /admin/units/{id}`
- `POST /admin/units/{id}/media`

**State:** `unit`, `loading`, `saving`, `success`

### Bulk Dimensions `/admin/units/bulk-dimensions`

CSV upload for bulk unit dimension updates.

---

## 2.7 Towers `/admin/towers` + `[id]/page.tsx`

### List

**Sections:** Towers table — name, unit count, floor count, amenities count, Edit link

**API:** `GET /admin/towers`

### Edit `/admin/towers/[id]`

**Sections:**
- Basic info (name, description, total floors, total units)
- Amenities multi-select (gym, pool, security, etc.)
- Media uploads (images, floor plans, video, brochure)

**API:**
- `GET /admin/towers/{id}`
- `PATCH /admin/towers/{id}`
- `POST /admin/towers/{id}/media`

---

## 2.8 Media Manager `/admin/media`

**File:** `app/admin/media/page.tsx`

### Purpose
Upload/manage media across projects, towers, units.

### Sections
- Entity selector (Projects / Towers / Units)
- Record dropdown
- Media type tabs (Photos, Floor Plans, Video URL, Brochure)
- File upload (multi-image, single for URLs)
- Preview + delete per item

### API Endpoints
- `GET /admin/projects/list?page_size=100`
- `GET /admin/towers/list?page_size=100`
- `GET /admin/units/all?page_size=100`
- `GET /admin/{entity}/{id}`
- `POST /admin/{entity}/{id}/upload`
- `DELETE /admin/{entity}/{id}/media/{key}`

### State
`entity`, `records`, `selectedId`, `selectedRecord`, `uploading`, `toast`, `urlInputs`

---

## 2.9 Media Series `/admin/media/series`

**File:** `app/admin/media/series/page.tsx`

### Purpose
Manage standardized media series (2D/3D plans, model flat video, tower elevation, unit photos) shared across similar units.

### API Endpoints
- `GET /admin/media-series`
- `POST /admin/media-series/{id}/upload`
- `PATCH /admin/media-series/{id}` (assign to unit types)

### State
`series`, `selectedSeries`, `uploading`, `assignedUnits`

---

## 2.10 CMS `/admin/cms`

**File:** `app/admin/cms/page.tsx`

### Purpose
Site content, SEO, sections visibility, global settings.

### Tabs
1. **Site Settings** — General (site name, tagline, logo) · Contact (phone, email, address) · Social (FB/IG/YT/LinkedIn) · SEO (GA ID, meta) · Filters (store max values)
2. **SEO/Pages** — per-page SEO (title, meta description, keywords, og image)
3. **Content Sections** — visibility toggles for project/unit/homepage sections

### API Endpoints
- `GET /admin/cms/settings`, `PATCH /admin/cms/settings`
- `GET /admin/cms/seo`, `PATCH /admin/cms/seo/{page}`
- `GET /admin/cms/sections`, `PATCH /admin/cms/sections/{key}`

### State
`tab`, `settings`, `values`, `activeGroup`, `saving`, `success`, `error`

---

## 2.11 Custom Fields `/admin/fields`

**File:** `app/admin/fields/page.tsx`

### Purpose
Define custom fields per entity (unit, project, tower, lead, site_visit, booking). Drag-to-reorder.

### Sections
- Entity tabs
- Field rows (drag-reorder)
- Per-field: Label, Type, Required, Visible, Show on Customer, Show on Admin
- Add Custom Field modal
- Delete button (custom fields, superadmin)

### API Endpoints
- `GET /admin/fields?entity={entity}`
- `PATCH /admin/fields/{fieldId}`
- `POST /admin/fields`
- `DELETE /admin/fields/{fieldId}`
- `POST /admin/fields/reorder`

### State
`activeEntity`, `fields`, `saving`, `draggingId`, `showAddModal`, `newField`

---

## 2.12 Sections `/admin/sections`

**File:** `app/admin/sections/page.tsx`

### Purpose
Configure which sections appear on entity detail pages (Project/Tower/Unit) and which fields appear in each.

### API Endpoints
- `GET /admin/sections?entity={entity}`
- `PATCH /admin/sections/{sectionId}`

### State
`activeEntity`, `sections`, `saving`, `success`

---

## 2.13 CRUD Data Manager `/admin/crud`

**File:** `app/admin/crud/page.tsx`

### Purpose
Generic spreadsheet-style editor for all entities.

---

## 2.14 Store Filters `/admin/store-filters` ⭐ NEW

**File:** `app/admin/store-filters/page.tsx`

### Purpose
**Manage filters shown on `/store` page.** Pick unit fields (including custom fields), auto-populate options from DB, reorder, toggle visibility.

### Sections
- Header + "+ Add Filter" button
- Filter list: label, type badge, quick/advanced badge, field_name, key, options count
- Row actions: Reorder arrows · Move to Quick/Advanced · Show/Hide · Edit · Delete
- Edit/Create modal:
  - **Step 1:** Select Unit Field (66 fields: built-in + custom), "Auto-populate Options" button
  - **Step 2:** Filter key, label, type (pills/select/range_slider/button_group/checkbox), Quick bar toggle
  - **Step 3:** Options editor OR Range config (min/max/format) OR Checkbox config
  - Default Value field

### API Endpoints
- `GET /admin/cms/store-filters` (list)
- `GET /admin/cms/store-filters/unit-fields` (available fields)
- `GET /admin/cms/store-filters/field-values?field={key}` (distinct values)
- `POST /admin/cms/store-filters` (create)
- `PATCH /admin/cms/store-filters/{id}` (update)
- `DELETE /admin/cms/store-filters/{id}`
- `PATCH /admin/cms/store-filters-reorder`

### State
`filters`, `editing`, `creating`, `saving`, `toast`, `unitFields`, `newFilter`, `editOptions`, `editConfig`, `editFieldName`, `populating`

---

## 2.15 Filter Links `/admin/filter-links`

**File:** `app/admin/filter-links/page.tsx`

### Purpose
Create shareable pre-filtered store URLs for campaigns. **Dynamically driven by store filter configs** — any new filter auto-appears here.

### Sections
- Filter builder (inputs generated from store filter configs)
- Preview URL + label
- Copy URL / Save Link / Reset buttons
- Saved links list (Copy / Delete actions)

### API Endpoints
- `GET /admin/cms/store-filters` (inputs)
- `GET /admin/cms/public/settings` (range hints)
- `GET/POST/DELETE /admin/cms/filter-links`

### State
`filterConfigs`, `filterValues`, `customLabel`, `savedLinks`, `copied`, `settings`

---

## 2.16 Notifications `/admin/notifications`

**File:** `app/admin/notifications/page.tsx`

### Purpose
Configure SMS/WhatsApp/Email templates for triggered events.

### Sections
- Trigger events list (booking confirmed, payment received, site visit requested/confirmed, lead created, welcome)
- Templates per event: Email · SMS · WhatsApp
- Template editor with placeholder variables (`{{customer_name}}`, `{{unit_number}}`, `{{amount}}`)
- Enable/disable per template
- Test send (test phone/email)

### API Endpoints
- `GET /admin/notification-templates`
- `PATCH /admin/notification-templates/{id}`
- `POST /admin/notifications/test`

### State
`templates`, `activeEvent`, `editTemplate`, `saving`, `testPhone`, `testEmail`, `testResult`, `testLoading`

**Channels:** SmartPing (SMS), Chat360 (WhatsApp), Office365 SMTP (Email)

---

## 2.17 AI Assistant `/admin/assistant`

**File:** `app/admin/assistant/page.tsx`

### Purpose
Configure proactive chatbot flow (triggered on widget open / after 0 results / manual).

### Step Types
Message · Options · Text Input · Collect Lead · Show Units · Show Brochure · End

### API Endpoints
- `GET /admin/assistant/flows`
- `POST /admin/assistant/flows`
- `DELETE /admin/assistant/flows/{id}`

### State
`flows`, `editingFlow`, `steps`, `trigger`, `saving`, `previewStep`, `showPreview`

---

## 2.18 Site Visits `/admin/visits`

**File:** `app/admin/visits/page.tsx`

### Purpose
Manage customer site visit bookings, update status.

### Sections
- Filter by status (scheduled/completed/cancelled/rescheduled)
- Table: Visitor, Phone, Date, Time, Notes, Status, Booked On
- Inline status dropdown
- Expandable rows
- Pagination (15/page)

### API Endpoints
- `GET /admin/visits?page={n}&page_size=15&status={s}`
- `PATCH /admin/visits/{id}`

### State
`visits`, `total`, `page`, `filterStatus`, `loading`, `updating`

---

## 2.19 Home Loan Requests `/admin/home-loan-requests`

**File:** `app/admin/home-loan-requests/page.tsx`

### Purpose
Manage home loan applications, route to banks, track approvals.

### Sections
- Filter by status (new/contacted/processing/approved/rejected)
- Table: Applicant, Phone, Unit, Loan Amount, EMI, Status, Submitted
- Expandable rows (full KYC, employment, co-applicant, documents)
- Status dropdown

### API Endpoints
- `GET /admin/home-loan-requests?page={n}&page_size=15&status={s}`
- `PATCH /admin/home-loan-requests/{id}`

### State
`items`, `total`, `page`, `filterStatus`, `loading`, `updating`, `expanded`

---

## 2.20 Admin Users `/admin/users`

**File:** `app/admin/users/page.tsx`

### Purpose
Manage admin/staff accounts (**superadmin only**).

### Sections
- Users table: Username, Email, Name, Role, Active, Created
- Create User button
- Reset Password / Toggle Active / Delete per user

### API Endpoints
- `GET /admin/users`
- `POST /admin/users`
- `PATCH /admin/users/{id}`
- `POST /admin/users/{id}/reset-password`

### State
`users`, `loading`, `showCreate`, `form`, `showReset`, `newPass`, `msg`, `error`

**Auth:** Superadmin role required

---

# PART 3 — SHARED COMPONENTS

## 3.1 Navbar (`Navbar.tsx`)

**Purpose:** Fixed nav header for customer pages.

**Features:**
- Logo (dark/light based on scroll state)
- Nav links: Home, Store, Projects, Technology, About, Contact
- Cart icon with badge count (if logged in)
- User menu (profile/dashboard/logout)
- Sign In / Register buttons (if logged out)
- Mobile hamburger
- Scroll-aware styling (transparent → white)

**State:** `scrolled`, `menuOpen`, `loggedIn`, `customer`, `userMenuOpen`, `cartCount`

**API:** Reads localStorage (`jp_token`, `jp_customer`)

---

## 3.2 Footer (`Footer.tsx`)

**Purpose:** Site footer.

**Sections:** Brand + social · Navigation · Featured projects · Contact (address, phone, email, hours) · Copyright · RERA

**State:** None · **API:** None

---

## 3.3 BackButton (`BackButton.tsx`)

**Purpose:** Router back button for detail pages.

**State:** None · **Props:** None

---

## 3.4 PropertyCard (`PropertyCard.tsx`)

**Purpose:** Reusable unit card with specs, price, actions.

**Features:**
- Gradient header (image/placeholder) + status badge
- Specs grid (BHK, sqft, floor)
- Badges: bathrooms, facing, balconies
- Price + ₹/sqft
- Save ♥ / Compare ⇄ / Share ↗
- Add to Cart + Enquire + Details buttons
- Hover lift animation
- Toast messages

**Props:** `unit`, `onCompareChange`, `isTrending?`

**State:** `saved`, `inCompare`, `shareMsg`, `compareErr`, `toast`

**API:** Uses `savedProperties` lib (localStorage)

---

## 3.5 UnitMediaSlider (`UnitMediaSlider.tsx`)

**Purpose:** Media carousel for unit detail with **vertical left thumbnail strip** + main viewer.

**Exports:** `UnitMediaProvider`, `UnitMediaThumbs`, `UnitMediaMain`, default `UnitMediaSlider`

**Features:**
- Context-based state sharing between thumbs and main
- Ordered media: 2D → 3D → Model Flat Video → Tower Elevation → Project Image → Project Video → Walkthrough → Brochure → Unit Photos → unit-level media
- Supports images, floor plans, videos (MP4/WebM), YouTube embed, Vimeo, walkthrough iframe, PDFs
- Vertical scrollable thumb strip (80px wide, max-height 450px)
- Main viewer: 16:9 aspect, prev/next arrows, status badge, type badge, counter
- Active thumbnail: left-edge accent + scale

**State (inside Provider):** `active`, `items`

**Props:** `unit`, `seriesFields?`

**Usage:**
```tsx
<UnitMediaProvider unit={unit} seriesFields={customFieldMap}>
  <div className="flex items-start" style={{ marginLeft: '-90px' }}>
    <UnitMediaThumbs />
    <div className="rounded-3xl overflow-hidden flex-1">
      <UnitMediaMain />
      <div>Title bar</div>
    </div>
  </div>
</UnitMediaProvider>
```

---

## 3.6 CompareBar (`CompareBar.tsx`)

**Purpose:** Floating footer showing compare selection.

**Features:**
- Item count (X/3)
- Dot progress indicator
- Clear All / Compare Now (disabled if <2)
- Auto-hide when empty

**State:** `items` (unit IDs)
**API:** Uses `savedProperties` lib

---

## 3.7 AddToCartBtn (`AddToCartBtn.tsx`)

**Purpose:** Add unit to cart with inline feedback.

**Features:**
- States: idle · loading (spinner) · added (green + View Cart link)
- Login redirect if no JWT
- Only visible when unit status = "available"
- Two sizes: `sm` / `md`

**Props:** `unitId`, `status`, `size`

**State:** `state`, `toast`

**API:** `POST /cart` (JWT required)

---

## 3.8 PhoneOtpVerify (`PhoneOtpVerify.tsx`)

**Purpose:** Reusable phone + OTP flow for login / register / lead capture.

**Features:**
- Step 1: Phone number input with formatting
- Step 2: 6-digit OTP inputs (auto-focus next, paste support)
- Auto-submit when all 6 digits entered
- Resend button (30s countdown)
- Optional profile collection (name, email)
- Optional consent checkbox
- Dev OTP display (from API response)
- Modes: `login` (rejects if not registered) / `register` (creates account)

**Props:** `purpose` (auth/lead/site_visit), `mode`, `onVerified`, `onNotFound`, `collectProfile`, `defaultPhone`, `title`, `subtitle`, `buttonLabel`

**State:** `step`, `phone`, `otp`, `name`, `email`, `consent`, `loading`, `error`, `countdown`, `devOtp`

**API:**
- `POST /auth/send-otp`
- `POST /auth/verify-otp` or `/auth/verify-phone`

---

## 3.9 DynamicFields (`DynamicFields.tsx`)

**Purpose:** Render custom field values by type on detail pages.

**Features:**
- Fetches `custom_field_values` for entity
- Renders by `field_type`: text, number/decimal, currency (formatted ₹L/Cr), boolean (Yes/No pill), url, image (preview + link), video, PDF
- Section-based grouping
- URL encoding for media paths

**Props:** `entity`, `entityId`, `entityData?`

**State:** `values`, `loading`, `sections`

**API:** `GET /admin/fields/public-values/{entity}/{entityId}`

---

## 3.10 HomeLoanEMICalculator (`HomeLoanEMICalculator.tsx`)

**Purpose:** Interactive EMI calculator with pie chart.

**Features:**
- 3 sliders: Loan Amount (default 80% of unit price) · Interest Rate (5-15%, default 8.5%) · Tenure (1-30 yr, default 20)
- Live EMI calculation: `EMI = P * r * (1+r)^n / ((1+r)^n - 1)`
- Principal vs Interest pie chart
- Monthly EMI display
- Total interest / total payment

**Props:** `unitPrice` (required), `unitName?`

**State:** `loanAmount`, `rate`, `tenure`

**API:** None

---

## 3.11 RiseUpCalculator (`RiseUpCalculator.tsx`)

**Purpose:** Janapriya's RiseUp offer calculator (80% now / 20% at possession).

**Features:**
- Toggle DP: 10% / 20%
- Breakdown: Total price · 80% amount · Down payment · Bank loan · Possession amount
- Interest saved estimate (possession × 9% p.a. × 2yr)
- Link to riseup.house

**Props:** `unitPrice`, `unitName?`

**State:** `dpPercent`

**API:** None

---

## 3.12 SessionTracker (`SessionTracker.tsx`)

**Purpose:** Background analytics beacon.

**Features:**
- Persistent session ID + visitor ID (localStorage)
- Tracks page path, duration, referrer, customer ID
- Uses `navigator.sendBeacon` (non-blocking on unload)
- Skips admin pages
- Initial ping after 5s → every 30s

**State:** `sessionId`, `visitorId`, `startTime`

**API:** `POST /search/session/ping`

---

## 3.13 ProactiveAssistant (`ProactiveAssistant.tsx`)

**Purpose:** In-widget AI chatbot.

**Features:**
- Triggers: on widget open · after 0 search results · manual (Guide tab)
- Configurable step flow (from `/admin/assistant`)
- Step types: Message · Options · Text Input · Collect Lead · Show Units · Show Brochure · End
- Multi-turn conversation
- Budget/BHK filtering + unit display
- Lead creation from collected data
- Toast notifications

**State:** `open`, `flow`, `step`, `history`, `formData`, `results`, `loading`, `error`

**API:**
- `GET /assistant/flows/active?trigger=on_open`
- `POST /assistant/chat`
- `POST /leads`

---

# PART 4 — LIBRARIES & UTILITIES (`lib/`)

| File | Purpose |
|------|---------|
| `api.ts` | Generic fetch wrapper (public API) |
| `customerAuth.ts` | Customer Zustand store + `customerApi()` JWT helper |
| `adminAuth.ts` | Admin Zustand store + `adminApi()` JWT helper |
| `savedProperties.ts` | localStorage favorites + compare list (max 3) |
| `validators.ts` | Validation (phone, email, PAN, Aadhaar, pincode) |

---

# PART 5 — STATE MANAGEMENT

**Pattern:** React hooks (useState, useContext) — no Redux/MobX.

**Global state (Zustand + localStorage):**
- `jp_token`, `jp_customer` — customer auth
- `admin_token`, `admin_username`, `admin_role`, `admin_fullname` — admin auth
- `jp_saved`, `jp_compare` — favorites & compare (max 3)
- `jp_session_id`, `jp_visitor_id` — analytics

**Page state:** Filters, loading, form data via `useState`
**Cross-component state:** Custom events (`jp_saved_update`, `jp_compare_update`) + context (for UnitMediaSlider)

---

# PART 6 — AUTHENTICATION FLOWS

### Customer
```
User enters phone → POST /auth/send-otp
User enters OTP → POST /auth/verify-otp
Response: { access_token, customer } → stored in localStorage
All subsequent requests: Authorization: Bearer {token}
```

### Admin
```
Admin enters username + password → POST /admin/login
Response: { access_token, role, full_name } → stored in localStorage
Zustand store updates → sidebar/routes re-render
401 response → auto-redirect to /admin/login
```

---

# PART 7 — DESIGN SYSTEM

## Brand Colors
| Name | Hex | Usage |
|------|-----|-------|
| Primary Dark | `#262262` | Gradient start, admin dark bg |
| Primary | `#2A3887` | Main text, buttons, borders, admin sidebar |
| Accent Blue | `#29A9DF` | Links, highlights, gradient end |
| Accent Light | `#E2F1FC` | Light backgrounds, dividers |
| Bg Light | `#F8F9FB` | Card backgrounds |
| Status Green | `#22c55e` | Available |
| Status Red | `#ef4444` | Booked |
| Status Amber | `#f59e0b` | Reserved/sold |

## Typography
- Font: **Lato** (sans-serif)
- Headings: `font-black` (900 weight)
- Body: `font-medium` / `font-semibold`

## Common Patterns
| Element | Style |
|---------|-------|
| Primary gradient | `linear-gradient(135deg, #2A3887, #29A9DF)` |
| Dark gradient | `linear-gradient(135deg, #262262, #2A3887)` |
| Cyan gradient | `linear-gradient(135deg, #29A9DF, #00C2FF)` |
| Card shadow light | `0 4px 20px rgba(42,56,135,0.08)` |
| Hero shadow | `0 8px 40px rgba(42,56,135,0.15)` |
| Border radius | `rounded-2xl` cards, `rounded-3xl` hero, `rounded-full` pills |
| Primary border | `1.5px solid #E2F1FC` |

## Toast Pattern
```tsx
const [toast, setToast] = useState("");
const showToast = (m: string) => {
  setToast(m);
  setTimeout(() => setToast(""), 2000);
};
```

---

# PART 8 — CRITICAL USER FLOWS

## Flow A: Property Discovery → Booking
```
/ (homepage)
  ↓ Browse Store / Quick Filter
/store
  ↓ Click unit card
/units/[id]
  ↓ "Book Now" or AddToCartBtn
/login (if unauthenticated, ?redirect=/booking/[id])
  ↓ Phone + OTP
/booking/[unitId]
  ↓ Fill booking form, Razorpay pay, submit KYC
Confirmation → /dashboard?tab=bookings
```

## Flow B: Site Visit Booking
```
Homepage / Unit detail → "Book Site Visit"
  ↓
/site-visit (or inline form)
  ↓ Fill date/time/notes
  ↓ POST /auth/send-otp
  ↓ Enter OTP
  ↓ POST /site-visits
Confirmation → SMS + WhatsApp sent
```

## Flow C: Home Loan Application
```
/units/[id] → "🏦 Home Loan" button
  ↓
/home-loan/[unitId]
  ↓ 4-step form (personal, employment, co-app, co-emp)
  ↓ Upload payslips + Form 16
  ↓ POST /home-loan-requests
Reference # shown → admin sees in /admin/home-loan-requests
```

## Flow D: Filter Link Campaign (Admin)
```
/admin/filter-links → configure filters → Save → Copy URL
  ↓ Share URL (SMS/WhatsApp/email/social)
User clicks → /store?min_price=5000000&bedrooms=3&facing=East
Store page reads URL params → pre-applies filters → shows filtered grid
```

## Flow E: Store Filter Management (Admin)
```
/admin/store-filters → "+ Add Filter"
  ↓ Pick Unit Field (e.g. "Plan Series (plan_series) [custom]")
  ↓ Auto-fills key/label/type
  ↓ Click "Auto-populate Options"
  ↓ Fetches distinct values from DB via /admin/cms/store-filters/field-values
  ↓ Edit labels if needed → Save
Filter immediately appears on /store (no code change needed)
```

## Flow F: Brochure Download
```
Unit detail → "Download Brochure"
  ↓ If unauthenticated: redirect to /login?redirect=/units/[id]?download=brochure
  ↓ After login: unit page detects ?download=brochure query param
  ↓ Auto-opens brochure URL (unit.brochure_url OR tower.brochure_url OR custom_fields.series_brochure)
```

---

# PART 9 — WHERE TO ADD CODE FOR NEW FEATURES

| Feature | Where |
|---------|-------|
| New customer page | `app/[route]/page.tsx` |
| New admin page | `app/admin/[route]/page.tsx` + nav link in `app/admin/layout.tsx` |
| New reusable component | `components/[Name].tsx` |
| New store filter | **No code** — `/admin/store-filters` |
| New unit/project/tower field | **No code** — `/admin/fields` |
| New filter link campaign | **No code** — `/admin/filter-links` |
| New SEO page metadata | **No code** — `/admin/cms` |
| New notification template | **No code** — `/admin/notifications` |
| New chatbot flow | **No code** — `/admin/assistant` |
| New page section on detail pages | **No code** — `/admin/sections` |

---

# PART 10 — FILE TREE

```
frontend/src/
├── app/
│   ├── admin/                    # 21 admin pages
│   │   ├── analytics/
│   │   ├── assistant/
│   │   ├── cms/
│   │   ├── crud/
│   │   ├── customers/
│   │   ├── dashboard/
│   │   ├── fields/
│   │   ├── filter-links/
│   │   ├── home-loan-requests/
│   │   ├── layout.tsx            # Sidebar + admin shell
│   │   ├── leads/
│   │   ├── login/
│   │   ├── media/
│   │   │   └── series/
│   │   ├── notifications/
│   │   ├── page.tsx              # Redirect to /dashboard
│   │   ├── sections/
│   │   ├── store-filters/        # ⭐ NEW
│   │   ├── towers/
│   │   │   └── [id]/
│   │   ├── units/
│   │   │   ├── [id]/
│   │   │   └── bulk-dimensions/
│   │   ├── users/
│   │   └── visits/
│   ├── about/
│   ├── booking/[unitId]/
│   ├── cart/
│   ├── compare/
│   ├── contact/
│   ├── dashboard/
│   ├── home-loan/[unitId]/
│   ├── login/
│   ├── page.tsx                  # Homepage /
│   ├── projects/
│   │   ├── [id]/
│   │   │   └── towers/[towerId]/
│   │   └── page.tsx
│   ├── register/
│   ├── search/
│   ├── site-visit/
│   ├── store/page.tsx
│   ├── technology/
│   ├── units/
│   │   ├── [id]/                 # Unit detail
│   │   └── page.tsx
│   └── layout.tsx                # Root layout + SessionTracker + Assistant
├── components/                   # 13 shared components
│   ├── AddToCartBtn.tsx
│   ├── BackButton.tsx
│   ├── CompareBar.tsx
│   ├── DynamicFields.tsx
│   ├── Footer.tsx
│   ├── HomeLoanEMICalculator.tsx
│   ├── Navbar.tsx
│   ├── PhoneOtpVerify.tsx
│   ├── ProactiveAssistant.tsx
│   ├── PropertyCard.tsx
│   ├── RiseUpCalculator.tsx
│   ├── SessionTracker.tsx
│   └── UnitMediaSlider.tsx
├── lib/                          # Utilities
│   ├── adminAuth.ts
│   ├── api.ts
│   ├── customerAuth.ts
│   ├── savedProperties.ts
│   └── validators.ts
└── hooks/                        # Custom hooks
```

---

# PART 11 — ENVIRONMENT VARIABLES

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base (e.g. `http://173.168.0.81/api/v1`) |
| `NEXT_PUBLIC_SITE_URL` | Frontend base URL (for filter links, canonical) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay public key (booking flow) |

---

*Generated: April 2026 · Maintained alongside commit `e660a5c` on `main`*
*For backend docs see `docs/PROJECT_DOCUMENT.md` and `docs/BOOKING_AND_PAYMENT.md`*
