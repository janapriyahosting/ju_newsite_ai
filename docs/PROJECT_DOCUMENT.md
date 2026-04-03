# Janapriya Upscale — Project Document

**Version:** 1.0.0
**Last Updated:** 2026-04-03
**Domain:** janapriyaupscale.com

---

## 1. Project Overview

Janapriya Upscale is a full-stack real estate platform for Janapriya Group, Hyderabad. It serves as the customer-facing website, admin panel, and lead management system for property sales across multiple projects and towers.

**Code Stats:**
- Backend (Python): ~5,570 lines
- Frontend (TypeScript/TSX): ~13,584 lines
- Database Models: 17
- API Routers: 22
- Frontend Pages: 31 (17 public + 14 admin)
- Reusable Components: 11

---

## 2. Technology Stack

### Backend
| Component | Technology |
|-----------|-----------|
| Framework | FastAPI (Python 3.12) |
| ORM | SQLAlchemy (async) |
| Database | PostgreSQL 16 + pgvector |
| Cache | Valkey 8.0 (Redis-compatible) |
| Migrations | Alembic |
| Auth | JWT (HS256), OTP via SMS |
| SMS Gateway | SmartPing (JTPL account, sender: JPTOWN) |
| AI/NLP | Groq LLaMA 3.1 8B (search parsing, assistant) |
| CRM | Salesforce (planned) |
| Payment | Razorpay (planned) |
| Email | Gmail SMTP |

### Frontend
| Component | Technology |
|-----------|-----------|
| Framework | Next.js 16 + React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State Management | Zustand |
| Data Fetching | React Query + Axios |
| Form Handling | React Hook Form + Zod |
| UI Primitives | Radix UI |
| Animations | Framer Motion |
| Charts | Recharts |
| Icons | Lucide React |

### Infrastructure
| Component | Technology |
|-----------|-----------|
| Process Manager | PM2 |
| Containerization | Docker Compose |
| Web Server | Nginx (reverse proxy + SSL) |
| SSL | Certbot (Let's Encrypt) |
| Dev Server | 173.168.0.81 |
| Production Target | Hostinger KVM8 VPS |

---

## 3. Architecture

```
                    ┌──────────────┐
                    │   Nginx      │ :80/:443
                    │  (SSL + RP)  │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │                         │
     ┌────────▼────────┐     ┌─────────▼────────┐
     │   Next.js Web   │     │   FastAPI Backend │
     │   (Port 3000)   │     │   (Port 8000)     │
     └────────┬────────┘     └──────┬──────┬─────┘
              │                     │      │
              │              ┌──────▼──┐ ┌─▼───────┐
              │              │PostgreSQL│ │ Valkey  │
              │              │ :5432    │ │ :6379   │
              │              └─────────┘ └─────────┘
              │
         ┌────▼──────┐
         │ SmartPing  │ (SMS OTP)
         │ Groq API   │ (NLP Search)
         │ Salesforce  │ (CRM - planned)
         │ Razorpay    │ (Payments - planned)
         └────────────┘
```

---

## 4. Database Models

### Core Entities

#### Project
Represents a real estate development (e.g., "Janapriya Meadows").
- `name`, `slug`, `description`
- `location`, `address`, `city`, `state`, `pincode`
- `lat`, `lng` (coordinates)
- `rera_number`
- `amenities`, `images` (JSON arrays)
- `brochure_url`, `video_url`, `walkthrough_url`
- `floor_plans` (JSON)
- `is_active`, `is_featured`
- **Relationships:** towers (cascade delete)

#### Tower
A building within a project.
- `project_id` (FK)
- `name`, `description`
- `total_floors`, `total_units`
- `svg_floor_plan`, `amenities`, `images` (JSON)
- `brochure_url`, `video_url`, `walkthrough_url`
- `floor_plans` (JSON)
- `is_active`
- **Relationships:** project, units (cascade delete)

#### Unit
An individual apartment/villa within a tower.
- `tower_id` (FK)
- `unit_number`, `floor_number`, `unit_type` (1BHK, 2BHK, etc.)
- `bedrooms`, `bathrooms`, `balconies`
- `area_sqft`, `carpet_area`, `plot_area`
- `base_price`, `price_per_sqft`, `down_payment`, `emi_estimate`
- `facing` (East, West, North, South)
- `status` (available, booked, sold, hold)
- `is_trending`, `is_featured`, `view_count`
- `amenities`, `images`, `floor_plans`, `dimensions` (JSON)
- `video_url`, `walkthrough_url`, `brochure_url`
- `embedding` (pgvector 1536-dim for AI search)
- **Relationships:** tower, cart_items, bookings

### User Entities

#### Customer
End users who browse/buy properties.
- `name`, `email` (unique, nullable), `phone` (unique, nullable)
- `password_hash` (optional — OTP-first auth)
- `is_verified`, `is_active`, `marketing_consent`
- `otp`, `otp_expiry`
- `preferences` (JSON — search preferences)
- `sf_contact_id` (Salesforce)
- **Relationships:** cart_items, bookings, leads, site_visits, search_logs

#### AdminUser
Admin panel users (admin, superadmin).
- `username`, `email`, `full_name`
- `password_hash`, `role`, `is_active`

### Lead Management

#### Lead
Enquiry/prospect records from all sources.
- `customer_id` (FK, nullable)
- `name`, `email`, `phone`
- `source` (website, contact_form, project_page, unit_detail, campaign)
- `status` (new, contacted, qualified, lost, converted)
- `interest` (unit type preference)
- `project_interest` (specific project name)
- `budget_min`, `budget_max`
- `message`, `notes`
- `lead_score` (0–100, auto-computed)
- `score_details` (JSON breakdown)
- `utm_source`, `utm_medium`, `utm_campaign`
- `sf_lead_id` (Salesforce)
- `assigned_to` (sales rep)
- `extra_data` (JSON — unit_id, unit_number, etc.)

#### SiteVisit
Scheduled property visits.
- `customer_id` (FK, nullable)
- `name`, `phone`, `email`
- `project_id` (FK, nullable)
- `visit_date`, `visit_time`
- `status` (scheduled, completed, cancelled, no_show)
- `assigned_to`, `notes`
- `reminder_sent`

#### Booking
Unit reservation/purchase.
- `customer_id` (FK), `unit_id` (FK), `coupon_id` (FK, nullable)
- `booking_amount`, `total_amount`, `discount_amount`
- `status` (pending, confirmed, cancelled)
- `payment_status` (unpaid, partial, paid)
- `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`
- `sf_opportunity_id` (Salesforce)
- `notes`, `booked_at`, `confirmed_at`, `cancelled_at`

### Supporting Entities

#### FieldConfig
Dynamic custom fields for any entity (project, tower, unit, lead, etc.).
- `entity`, `field_key`, `label`, `field_type`
- `is_visible`, `is_required`, `is_custom`
- `sort_order`, `placeholder`, `help_text`
- `field_options` (JSON — for select/multiselect)
- `show_on_customer`, `show_on_admin`

#### CustomFieldValue
Stores values for custom fields.
- `field_config_id` (FK), `entity_id` (UUID), `value` (JSONB)

#### SessionLog
User session tracking for analytics and lead scoring.
- `session_id`, `visitor_id`, `customer_id` (FK)
- `ip_address`, `user_agent`, `page_path`, `referrer`
- `started_at`, `last_seen_at`, `duration_seconds`, `page_views`
- `is_customer`

#### Other Models
- **Cart** — Shopping cart items (`customer_id`, `unit_id`)
- **Coupon** — Discount codes (`code`, `discount_type`, `discount_value`, `max_discount`, `used_count`)
- **SearchLog** — Search analytics
- **CMS** — Content management pages and sections
- **AssistantFlow** — AI assistant conversation flows

---

## 5. Authentication System

### Customer Auth (Phone OTP)
1. **Send OTP:** `POST /auth/send-otp` → SmartPing SMS to phone
2. **Login:** `POST /auth/verify-otp` with `mode: "login"` → rejects if phone not found
3. **Register:** `POST /auth/verify-otp` with `mode: "register"` → auto-creates customer
4. **Form Verify:** `POST /auth/verify-phone` → standalone OTP check (no login, for contact/site-visit forms)

OTP auto-submits on 6th digit entry. 30-second rate limit between resends. 5-minute expiry.

### Admin Auth (Username + Password)
- `POST /admin/login` → JWT token (12-hour expiry)
- Roles: `admin`, `superadmin`
- `verify_admin_token` middleware on all admin routes
- `require_superadmin` for destructive operations (delete, bulk-delete)

### Phone Validation
Strict Indian mobile number validation on all endpoints:
- Strips `+91`, `0` prefix, spaces, dashes
- Must match `^[6-9]\d{9}$` (10 digits, starts with 6-9)
- Applied via Pydantic `field_validator` on schemas + manual check on auth endpoints

---

## 6. Lead Scoring System (0–100)

Scores are computed automatically on lead creation and can be recomputed via admin.

| Signal | Points | Criteria |
|--------|--------|----------|
| Time on site | 0–15 | >5min=15, >2min=10, >1min=5 |
| Pages visited | 0–15 | >10=15, >5=10, >2=5 |
| Unit pages viewed | 0–15 | >5=15, >3=10, >1=5 |
| Return visits | 0–10 | >3=10, >1=5 |
| Enquiry submitted | 10 | Always (lead exists) |
| Site visit booked | 10 | Checked from DB |
| Booking made | 10 | Checked from DB |
| Brochure download | 5 | Session path detection |
| Has email | 5 | Email provided |
| UTM campaign lead | 5 | Came from ad campaign |
| **Max Total** | **100** | |

Admin can click "Rescore All" to recompute all leads, or rescore individual leads.

---

## 7. SMS Integration (SmartPing)

- **Provider:** SmartPing (JTPL account)
- **API:** `https://pgapi.smartping.ai/fe/api/v1/multiSend`
- **Sender ID:** JPTOWN
- **DLT Entity ID:** 1701166339309356089
- **DLT Content ID:** 1707174280396973930 (OTP template)
- **Template:** "Your OTP for verifying your account on JanapriyaUpscale.com is {OTP}. It is valid for 5 minutes. Do not share this code with anyone."

**Integrated in:**
- Login / Registration
- Contact form (lead submission)
- Site visit booking
- Brochure download
- Project enquiry form
- Unit enquiry modal

---

## 8. UTM Tracking

All lead capture forms automatically extract UTM parameters from the URL:
- `utm_source` (e.g., google, facebook)
- `utm_medium` (e.g., cpc, social, email)
- `utm_campaign` (e.g., hyderabad_2bhk_april)

**Example campaign URL:**
```
https://janapriyaupscale.com/projects/janapriya-meadows?utm_source=google&utm_medium=cpc&utm_campaign=hyderabad_2bhk
```

Leads from campaign URLs get `source: "campaign"` and UTM fields stored. Visible in admin leads page with cyan badges.

---

## 9. Dynamic Custom Fields

The FieldConfig system allows admins to add custom fields to any entity without developer intervention.

**Supported field types:** text, number, decimal, boolean, select, multiselect, date, textarea, email, phone, url, currency

**Supported entities:** project, tower, unit, lead, site_visit, booking

**Features:**
- Admin Fields Manager UI for CRUD
- Drag-and-drop reordering
- Show/hide per customer or admin views
- CSV templates auto-include custom fields
- CSV import auto-handles custom field values

---

## 10. Frontend Pages

### Public Pages
| Page | Route | Description |
|------|-------|-------------|
| Homepage | `/` | Hero section, featured projects, services, CTA |
| Projects List | `/projects` | All projects with cards |
| Project Detail | `/projects/[slug]` | Overview, towers, units tabs with enquiry forms |
| Tower Detail | `/projects/[slug]/towers/[id]` | Tower info and units |
| Store | `/store` | All units with filters |
| Unit Detail | `/units/[id]` | Full unit info, media, calculator, enquiry modal |
| Search | `/search` | Advanced property search |
| Compare | `/compare` | Side-by-side unit comparison |
| Login | `/login` | Phone OTP sign-in |
| Register | `/register` | Phone OTP registration with profile |
| Dashboard | `/dashboard` | Customer bookings, visits, quick actions |
| Contact | `/contact` | Enquiry form with OTP |
| Site Visit | `/site-visit` | Book a visit with date/time picker |
| Booking | `/booking/[unitId]` | Booking confirmation with coupon |
| Cart | `/cart` | Shopping cart |
| About | `/about` | Company info |
| Technology | `/technology` | Tech showcase |

### Admin Pages
| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/admin/dashboard` | Stats overview |
| Leads | `/admin/leads` | Lead management with scoring, UTM, expandable details |
| Visits | `/admin/visits` | Site visit management |
| Units | `/admin/units` | Unit management |
| Data Manager | `/admin/crud` | Inline editing for projects/towers/units with CSV import/export |
| Fields | `/admin/fields` | Custom field configuration |
| Customers | `/admin/customers` | Customer management |
| CMS | `/admin/cms` | Content management |
| Sections | `/admin/sections` | Page section management |
| Media | `/admin/media` | Media upload and management |
| Analytics | `/admin/analytics` | Advanced analytics |
| Towers | `/admin/towers` | Tower management |
| Users | `/admin/users` | Admin user management |
| Assistant | `/admin/assistant` | AI assistant config |

---

## 11. API Endpoints Summary

### Public API (`/api/v1`)
```
GET    /health
GET    /projects
GET    /projects/:id
GET    /projects/:id/towers
GET    /units
GET    /units/:id
GET    /units/trending
POST   /leads
POST   /site-visits
POST   /auth/send-otp
POST   /auth/verify-otp
POST   /auth/verify-phone
GET    /auth/me
POST   /search
POST   /search/session/ping
GET    /cart
POST   /cart
DELETE /cart/:id
POST   /bookings
GET    /bookings
GET    /bookings/:id
```

### Admin API (`/api/v1/admin`)
```
POST   /admin/login
GET    /admin/stats
GET    /admin/leads
PATCH  /admin/leads/:id
DELETE /admin/leads/:id
POST   /admin/leads/rescore
POST   /admin/leads/:id/rescore
GET    /admin/visits
PATCH  /admin/visits/:id
GET    /admin/units/all
GET    /admin/units/csv-template
POST   /admin/units/csv-import
POST   /admin/units/bulk-delete
PATCH  /admin/units/bulk-update
GET    /admin/projects/list
POST   /admin/projects
PATCH  /admin/projects/:id
DELETE /admin/projects/:id
GET    /admin/towers/list
POST   /admin/towers
PATCH  /admin/towers/:id
DELETE /admin/towers/:id
POST   /admin/units
PATCH  /admin/units/:id
DELETE /admin/units/:id
GET    /admin/fields
POST   /admin/fields
PATCH  /admin/fields/:id
DELETE /admin/fields/:id
POST   /admin/fields/reorder
POST   /admin/custom-values
GET    /admin/custom-values/:entity/:id
POST   /admin/upload
DELETE /admin/upload
GET    /admin/customers
PATCH  /admin/customers/:id
```

---

## 12. Services

### Lead Scoring (`services/lead_scoring.py`)
- `compute_lead_score(lead, db)` → (score, details_dict)
- `score_all_leads(db)` → recompute all leads

### SMS (`services/sms.py`)
- `generate_otp(length=6)` → 6-digit OTP string
- `send_otp_sms(phone, otp)` → bool (success/failure)

---

## 13. Docker Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| PostgreSQL | pgvector/pgvector:pg16 | 5432 | Primary database with vector search |
| Valkey | valkey/valkey:8.0-alpine | 6379 | Cache and session store (512MB, LRU) |

### Networks
- `frontend_net` — frontend ↔ nginx
- `backend_net` — backend ↔ nginx
- `db_net` — backend ↔ database/cache

---

## 14. PM2 Process Configuration

| Process | Command | Port | Working Directory |
|---------|---------|------|-------------------|
| janapriya-api | `uvicorn backend.app.main:app` | 8000 | /home/jpuser/projects/janapriyaupscale |
| janapriya-web | `npm run dev` | 3000 | .../frontend |

---

## 15. Database Migrations

| # | Migration | Description |
|---|-----------|-------------|
| 1 | `5b9fef923258` | Initial all models |
| 2 | `ae462345a625` | Add admin users table |
| 3 | `0002_field_configs` | Field configurations |
| 4 | `36e01455ed82` | Add media fields to project/tower/unit |
| 5 | `a1b2c3d4e5f6` | Add assistant flows |
| 6 | `e33d9512ecc4` | Make email nullable, phone unique (OTP auth) |
| 7 | `0707e25c48db` | Add project_interest to leads |
| 8 | `7dd88bbcd420` | Add lead_score to leads |

---

## 16. Planned / Upcoming

| Feature | Status | Notes |
|---------|--------|-------|
| Salesforce CRM integration | Planned | `sf_lead_id` field ready, config vars defined. Sync leads and bookings after dev freeze. |
| Razorpay payment gateway | Planned | Fields in Booking model ready (`razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`) |
| Production deployment | Planned | Hostinger KVM8 VPS. Needs Nginx config, SSL, production env, Docker setup. |
| WhatsApp Business API | Planned | For automated booking confirmations and lead follow-ups |

---

## 17. Environment Variables

```env
# App
APP_ENV=development
SECRET_KEY=<change-in-production>
DEBUG=True

# Database
POSTGRES_DB=janapriya_db
POSTGRES_USER=janapriya_user
POSTGRES_PASSWORD=<password>
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432

# Cache
VALKEY_PASSWORD=<password>
VALKEY_HOST=localhost
VALKEY_PORT=6379

# JWT
JWT_SECRET_KEY=<secret>
JWT_ALGORITHM=HS256
JWT_EXPIRY_MINUTES=60

# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<password>
ADMIN_SECRET_KEY=<secret>

# SmartPing SMS
SMARTPING_URL=https://pgapi.smartping.ai/fe/api/v1/multiSend
SMARTPING_USERNAME=janaptnpg.trans
SMARTPING_PASSWORD=<password>
SMARTPING_SENDER_ID=JPTOWN
SMARTPING_DLT_CONTENT_ID=1707174280396973930
SMARTPING_DLT_TELEMARKETER_ID=<id>
SMARTPING_DLT_ENTITY_ID=1701166339309356089

# Groq (AI)
GROQ_API_KEY=<key>
GROQ_MODEL=llama-3.1-8b-instant

# Salesforce (planned)
SF_USERNAME=
SF_PASSWORD=
SF_SECURITY_TOKEN=
SF_DOMAIN=login

# Razorpay (planned)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=

# Frontend
NEXT_PUBLIC_API_URL=http://173.168.0.81:8000/api/v1
NEXT_PUBLIC_SITE_URL=http://173.168.0.81:3000
```

---

## 18. Backup & Restore

**Backup location:** `/home/jpuser/projects/janapriyaupscale/backups/`

### Create Backup
```bash
# Database
docker exec jpus_postgres pg_dump -U janapriya_user -d janapriya_db -F c > backup.dump

# Project files
tar czf project.tar.gz -C /home/jpuser/projects \
  --exclude='janapriyaupscale/.venv' \
  --exclude='janapriyaupscale/frontend/node_modules' \
  --exclude='janapriyaupscale/frontend/.next' \
  --exclude='janapriyaupscale/.git' \
  janapriyaupscale
```

### Restore
```bash
# Database
docker exec -i jpus_postgres pg_restore -U janapriya_user -d janapriya_db --clean < backup.dump

# Project files
tar xzf project.tar.gz -C /home/jpuser/projects/
```

---

*Generated on 2026-04-03 by Claude Code*
