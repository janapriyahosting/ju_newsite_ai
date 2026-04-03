# Booking & Payment System — Technical Document

**Last Updated:** 2026-04-03
**Payment Gateway:** Razorpay (Test Mode)
**Status:** Integrated and functional

---

## 1. Overview

The booking system allows authenticated customers to reserve a property unit by paying 10% of the unit price online via Razorpay. The flow covers booking creation, payment processing, signature verification, and status management.

---

## 2. Payment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        BOOKING FLOW                             │
│                                                                 │
│  Customer                Frontend              Backend          │
│  ────────                ────────              ───────          │
│                                                                 │
│  1. Click "Book"  ──→  POST /bookings  ──→  Create Booking     │
│                                              (status: pending)  │
│                                              Create Razorpay    │
│                                              Order via API      │
│                         ←── Return order_id + key_id            │
│                                                                 │
│  2. Razorpay     ←──  Open Razorpay                            │
│     Checkout           Checkout Modal                           │
│     (card/UPI/NB)                                               │
│                                                                 │
│  3. Payment      ──→  POST /bookings/    ──→  Verify HMAC      │
│     Success            verify-payment          Signature        │
│                                                                 │
│                                              ✓ Update booking   │
│                                                status: confirmed│
│                                                payment: paid    │
│                                              ✓ Unit → booked   │
│                         ←── Return success                      │
│                                                                 │
│  4. Confirmation ←──  Show success                              │
│     Screen             screen with                              │
│                        booking details                          │
└─────────────────────────────────────────────────────────────────┘
```

### Failure Scenarios

| Scenario | What Happens |
|----------|-------------|
| User dismisses Razorpay modal | Booking stays `pending`/`unpaid`, unit stays `hold`. "Retry Payment" button shown. |
| Payment fails (card declined, etc.) | Error shown. User can retry. Booking stays `pending`. |
| Signature verification fails | `payment_status` set to `failed`. Error returned. |
| Network error during verification | Frontend shows "Payment completed but verification failed. Contact support." |

---

## 3. API Endpoints

### POST `/api/v1/bookings` — Create Booking + Razorpay Order

**Auth:** Bearer token (customer must be logged in)

**Request:**
```json
{
  "unit_id": "uuid",
  "coupon_code": "SAVE10",     // optional
  "notes": "Preferred 5th floor"  // optional
}
```

**Response (201):**
```json
{
  "id": "booking-uuid",
  "razorpay_order_id": "order_ABC123",
  "razorpay_key_id": "rzp_test_...",
  "amount": 450000,              // in paise (₹4,500)
  "currency": "INR",
  "booking_amount": 4500.00,     // 10% of unit price
  "discount_amount": 0.00,
  "payable_amount": 4500.00,     // after discount
  "total_amount": 45000.00,      // full unit price
  "status": "pending",
  "payment_status": "unpaid",
  "unit_number": "A-101",
  "customer_name": "Ravi Kumar",
  "customer_email": "ravi@example.com",
  "customer_phone": "9876543210"
}
```

**What happens internally:**
1. Validates unit exists and is `available`
2. Calculates 10% booking amount
3. Applies coupon discount if provided
4. Creates Razorpay order via `POST https://api.razorpay.com/v1/orders`
5. Creates Booking record (status: pending, payment: unpaid)
6. Sets unit status to `hold`

---

### POST `/api/v1/bookings/verify-payment` — Verify & Confirm

**Auth:** Bearer token

**Request:**
```json
{
  "razorpay_order_id": "order_ABC123",
  "razorpay_payment_id": "pay_XYZ789",
  "razorpay_signature": "hmac_sha256_signature"
}
```

**Response (200):**
```json
{
  "status": "success",
  "booking_id": "booking-uuid",
  "payment_id": "pay_XYZ789",
  "booking_status": "confirmed",
  "payment_status": "paid"
}
```

**Signature Verification:**
```
message = razorpay_order_id + "|" + razorpay_payment_id
expected = HMAC-SHA256(message, RAZORPAY_KEY_SECRET)
verify: expected == razorpay_signature
```

**What happens on success:**
1. Verifies HMAC-SHA256 signature
2. Updates booking: `status → confirmed`, `payment_status → paid`
3. Stores `razorpay_payment_id` and `razorpay_signature`
4. Sets `confirmed_at` timestamp
5. Updates unit status to `booked`

---

### GET `/api/v1/bookings` — List My Bookings

**Auth:** Bearer token

Returns all bookings for the logged-in customer, ordered by most recent.

---

### GET `/api/v1/bookings/{booking_id}` — Get Booking Details

Returns a single booking by ID.

---

## 4. Database Schema

### Booking Model

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `customer_id` | UUID (FK) | References customers.id |
| `unit_id` | UUID (FK) | References units.id |
| `coupon_id` | UUID (FK) | References coupons.id (nullable) |
| `booking_amount` | Numeric(15,2) | 10% of unit price |
| `total_amount` | Numeric(15,2) | Full unit price |
| `discount_amount` | Numeric(15,2) | Coupon discount applied |
| `status` | String(30) | `pending` → `confirmed` → `cancelled` |
| `payment_status` | String(20) | `unpaid` → `paid` / `failed` |
| `razorpay_order_id` | String(100) | Razorpay order ID |
| `razorpay_payment_id` | String(100) | Razorpay payment ID (after payment) |
| `razorpay_signature` | String(255) | HMAC signature (after verification) |
| `sf_opportunity_id` | String(50) | Salesforce Opportunity ID (planned) |
| `notes` | Text | Customer's special requests |
| `booked_at` | DateTime | When booking was created |
| `confirmed_at` | DateTime | When payment was verified |
| `cancelled_at` | DateTime | When booking was cancelled |
| `created_at` | DateTime | Record creation timestamp |
| `updated_at` | DateTime | Record update timestamp |

### Unit Status Transitions

```
available ──(booking created)──→ hold ──(payment verified)──→ booked
                                   │
                                   └──(booking cancelled)──→ available
```

---

## 5. Coupon System

Coupons are applied during booking creation.

### Coupon Model Fields
- `code` — Unique code (e.g., "SAVE10")
- `discount_type` — `"percentage"` or `"flat"`
- `discount_value` — Percentage or flat amount
- `max_discount` — Cap for percentage discounts
- `is_active` — Enable/disable
- `used_count` — Auto-incremented on use

### Discount Calculation
```
if discount_type == "percentage":
    discount = booking_amount × (discount_value / 100)
    discount = min(discount, max_discount)  // cap
else:
    discount = discount_value  // flat amount

payable = booking_amount - discount
```

---

## 6. Frontend Integration

### Razorpay Checkout Script
```html
<Script src="https://checkout.razorpay.com/v1/checkout.js" />
```

### Checkout Configuration
```javascript
{
  key: "rzp_test_...",           // from backend response
  amount: 450000,                // paise
  currency: "INR",
  name: "Janapriya Upscale",
  description: "Booking for A-101",
  order_id: "order_ABC123",      // from backend
  prefill: {
    name: "Ravi Kumar",
    email: "ravi@example.com",
    contact: "9876543210"
  },
  theme: { color: "#2A3887" },
  handler: function(response) {
    // POST to /bookings/verify-payment
  }
}
```

### Frontend States

| State | Screen |
|-------|--------|
| Loading | Spinner |
| Unit not found | Error + Browse Units link |
| Not logged in | Warning + Sign In link |
| Form (default) | Coupon, notes, consent, "Pay & Confirm" button |
| Razorpay open | Razorpay modal overlay |
| Payment success | Green confirmation with booking details |
| Payment pending | Amber warning with "Retry Payment" button |
| Error | Red error message |

---

## 7. Razorpay Configuration

### Test Mode Credentials
```env
RAZORPAY_KEY_ID=rzp_test_SZ2mMuCMcHgsAc
RAZORPAY_KEY_SECRET=aZfEo68H3djPpq02eRuKIhuO
```

### Test Payment Methods

| Method | Details |
|--------|---------|
| **Card (Success)** | `4111 1111 1111 1111`, any future expiry, any CVV |
| **Card (Failure)** | `4000 0000 0000 0002` |
| **UPI (Success)** | `success@razorpay` |
| **UPI (Failure)** | `failure@razorpay` |
| **Netbanking** | Any bank — auto-succeeds in test mode |
| **Wallet** | Any wallet — auto-succeeds in test mode |

### Razorpay Dashboard
- **Test Dashboard:** https://dashboard.razorpay.com
- View orders, payments, refunds
- Switch between Test and Live mode

### Going Live
1. Complete KYC on Razorpay dashboard
2. Get Live API keys
3. Update `.env`:
   ```
   RAZORPAY_KEY_ID=rzp_live_XXXXX
   RAZORPAY_KEY_SECRET=live_secret_XXXXX
   ```
4. Update `frontend/.env.local`:
   ```
   NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_XXXXX
   ```
5. Restart backend and rebuild frontend

---

## 8. Security

### Payment Signature Verification
Every payment is verified server-side using HMAC-SHA256:
```python
message = f"{order_id}|{payment_id}"
expected = hmac.new(secret.encode(), message.encode(), sha256).hexdigest()
assert expected == razorpay_signature
```
This ensures the payment response hasn't been tampered with.

### Additional Security Measures
- All booking endpoints require JWT authentication
- Unit availability checked before order creation
- Razorpay API called with Basic Auth (key_id:key_secret)
- Payment ID and signature stored for audit trail
- Unit status transitions are atomic (within DB transaction)
- Frontend never sees the Razorpay secret key

---

## 9. Admin View

Bookings are visible in the admin dashboard. Each booking shows:
- Booking ID, customer name, unit number
- Status (pending/confirmed/cancelled)
- Payment status (unpaid/paid/failed)
- Razorpay order ID, payment ID
- Amounts: total, booking, discount
- Timestamps: booked_at, confirmed_at

### Razorpay Dashboard Reconciliation
- Every booking has a `razorpay_order_id` linking to Razorpay's dashboard
- Payments can be verified/refunded from Razorpay dashboard
- Webhooks can be added later for real-time status sync

---

## 10. Future Enhancements

| Feature | Status | Notes |
|---------|--------|-------|
| Razorpay Webhooks | Planned | Auto-update booking status on payment events |
| Partial Payments | Planned | Allow installment-based payments |
| Refund API | Planned | Initiate refunds from admin panel |
| Payment Receipts | Planned | Generate PDF receipts after payment |
| Salesforce Sync | Planned | Create Opportunity on booking, update on payment |
| EMI Options | Planned | Razorpay EMI for higher amounts |
| Auto-cancel | Planned | Cancel unpaid bookings after 24 hours, release unit |

---

*Generated on 2026-04-03 by Claude Code*
