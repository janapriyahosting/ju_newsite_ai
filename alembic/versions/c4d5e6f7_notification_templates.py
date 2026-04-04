"""add notification_templates table

Revision ID: c4d5e6f7
Revises: b3c4d5e6f7a8
Create Date: 2026-04-04
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
import uuid

revision: str = 'c4d5e6f7'
down_revision: Union[str, None] = 'b3c4d5e6f7a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# ── Seed data ──

BOOKING_EMAIL_BODY = """<div style="font-family:Lato,Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
  <div style="background:linear-gradient(135deg,#262262,#2A3887);padding:30px 24px;text-align:center;">
    <h1 style="color:#29A9DF;font-size:22px;margin:0 0 4px;">Janapriya Upscale</h1>
    <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:0;">Booking Confirmation</p>
  </div>
  <div style="padding:28px 24px;">
    <p style="font-size:15px;color:#333;margin:0 0 16px;">Dear <strong>{{customer_name}}</strong>,</p>
    <p style="font-size:15px;color:#333;margin:0 0 20px;">Thank you for choosing Janapriya Upscale! Your booking has been <strong style="color:#16A34A;">confirmed</strong>.</p>
    <div style="background:#F0F4FF;border:1px solid #E2F1FC;border-radius:12px;padding:20px;margin:0 0 20px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:6px 0;color:#666;">Unit</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#2A3887;">{{unit_number}}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Project</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#333;">{{project_name}}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Total Price</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#333;">{{total_amount}}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Token Amount Paid</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#16A34A;">{{booking_amount}}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Payment ID</td><td style="padding:6px 0;text-align:right;font-family:monospace;color:#555;">{{payment_id}}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Booking ID</td><td style="padding:6px 0;text-align:right;font-family:monospace;color:#555;">{{booking_id}}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Date</td><td style="padding:6px 0;text-align:right;color:#333;">{{booked_at}}</td></tr>
      </table>
    </div>
    <p style="font-size:14px;color:#555;margin:0 0 8px;"><strong>Next steps:</strong></p>
    <ul style="font-size:14px;color:#555;padding-left:20px;margin:0 0 20px;">
      <li style="margin-bottom:6px;">Complete your KYC documents on your dashboard</li>
      <li style="margin-bottom:6px;">Our team will contact you within 24 hours</li>
      <li>You can view your booking anytime at your dashboard</li>
    </ul>
    <div style="text-align:center;margin:24px 0;">
      <a href="https://janapriyaupscale.com/dashboard" style="background:linear-gradient(135deg,#2A3887,#29A9DF);color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;">View My Booking</a>
    </div>
  </div>
  <div style="background:#262262;padding:20px 24px;text-align:center;">
    <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0 0 4px;">Janapriya Upscale — Your Dream Home Awaits</p>
    <p style="color:rgba(255,255,255,0.4);font-size:11px;margin:0;">This is an automated message. Please do not reply to this email.</p>
  </div>
</div>"""

BOOKING_VARS = ["customer_name", "customer_email", "customer_phone", "unit_number",
                "project_name", "booking_amount", "total_amount", "payment_id", "booking_id", "booked_at"]
PAYMENT_VARS = ["customer_name", "customer_phone", "amount", "transaction_id"]
SITE_VISIT_VARS = ["customer_name", "customer_phone", "customer_email", "visit_date", "visit_time", "project_name"]
LEAD_VARS = ["name", "phone", "email", "source", "project_interest"]
WELCOME_VARS = ["customer_name", "customer_phone", "customer_email"]


def _id():
    return str(uuid.uuid4())


SEEDS = [
    # ── booking_confirmed ──
    {"id": _id(), "trigger_event": "booking_confirmed", "channel": "email", "label": "Booking Confirmation Email",
     "is_active": True,
     "email_subject": "Booking Confirmed — {{unit_number}} | Janapriya Upscale",
     "email_body": BOOKING_EMAIL_BODY,
     "available_variables": BOOKING_VARS},

    {"id": _id(), "trigger_event": "booking_confirmed", "channel": "sms", "label": "Booking Confirmation SMS",
     "is_active": True,
     "sms_text": "Your booking for Unit - {{unit_number}} is confirmed. Booking ID - {{booking_id}}. - Janapriya Upscale",
     "sms_dlt_content_id": "1707177528503543610",
     "available_variables": BOOKING_VARS},

    {"id": _id(), "trigger_event": "booking_confirmed", "channel": "whatsapp", "label": "Booking Confirmation WhatsApp",
     "is_active": True,
     "wa_template_title": "bookingconfirmaton",
     "wa_param_mapping": {"customer_name": "customer_name", "unit_number": "unit_number", "booking_id": "booking_id"},
     "available_variables": BOOKING_VARS},

    # ── payment_received ──
    {"id": _id(), "trigger_event": "payment_received", "channel": "email", "label": "Payment Confirmation Email",
     "is_active": False,
     "email_subject": "Payment Received — {{amount}} | Janapriya Upscale",
     "email_body": "",
     "available_variables": PAYMENT_VARS},

    {"id": _id(), "trigger_event": "payment_received", "channel": "sms", "label": "Payment Confirmation SMS",
     "is_active": True,
     "sms_text": "Payment of Rs.{{amount}} received for your booking. Transaction ID - {{transaction_id}}. - Janapriya Upscale",
     "sms_dlt_content_id": "1707177528535228397",
     "available_variables": PAYMENT_VARS},

    {"id": _id(), "trigger_event": "payment_received", "channel": "whatsapp", "label": "Payment Confirmation WhatsApp",
     "is_active": True,
     "wa_template_title": "paymentconfirmation",
     "wa_param_mapping": {"amount": "amount", "customer_name": "customer_name", "transaction_id": "transaction_id"},
     "available_variables": PAYMENT_VARS},

    # ── site_visit_requested ──
    {"id": _id(), "trigger_event": "site_visit_requested", "channel": "email", "label": "Site Visit Request Email",
     "is_active": False, "email_subject": "Site Visit Scheduled | Janapriya Upscale", "email_body": "",
     "available_variables": SITE_VISIT_VARS},
    {"id": _id(), "trigger_event": "site_visit_requested", "channel": "sms", "label": "Site Visit Request SMS",
     "is_active": False, "sms_text": "", "sms_dlt_content_id": "",
     "available_variables": SITE_VISIT_VARS},
    {"id": _id(), "trigger_event": "site_visit_requested", "channel": "whatsapp", "label": "Site Visit Request WhatsApp",
     "is_active": False, "wa_template_title": "", "wa_param_mapping": {},
     "available_variables": SITE_VISIT_VARS},

    # ── site_visit_confirmed ──
    {"id": _id(), "trigger_event": "site_visit_confirmed", "channel": "email", "label": "Site Visit Confirmed Email",
     "is_active": False, "email_subject": "Site Visit Confirmed | Janapriya Upscale", "email_body": "",
     "available_variables": SITE_VISIT_VARS},
    {"id": _id(), "trigger_event": "site_visit_confirmed", "channel": "sms", "label": "Site Visit Confirmed SMS",
     "is_active": False, "sms_text": "", "sms_dlt_content_id": "",
     "available_variables": SITE_VISIT_VARS},
    {"id": _id(), "trigger_event": "site_visit_confirmed", "channel": "whatsapp", "label": "Site Visit Confirmed WhatsApp",
     "is_active": False, "wa_template_title": "", "wa_param_mapping": {},
     "available_variables": SITE_VISIT_VARS},

    # ── lead_created ──
    {"id": _id(), "trigger_event": "lead_created", "channel": "email", "label": "Lead Welcome Email",
     "is_active": False, "email_subject": "Thank you for your enquiry | Janapriya Upscale", "email_body": "",
     "available_variables": LEAD_VARS},
    {"id": _id(), "trigger_event": "lead_created", "channel": "sms", "label": "Lead Welcome SMS",
     "is_active": False, "sms_text": "", "sms_dlt_content_id": "",
     "available_variables": LEAD_VARS},
    {"id": _id(), "trigger_event": "lead_created", "channel": "whatsapp", "label": "Lead Welcome WhatsApp",
     "is_active": False, "wa_template_title": "", "wa_param_mapping": {},
     "available_variables": LEAD_VARS},

    # ── welcome ──
    {"id": _id(), "trigger_event": "welcome", "channel": "email", "label": "Welcome Email",
     "is_active": False, "email_subject": "Welcome to Janapriya Upscale!", "email_body": "",
     "available_variables": WELCOME_VARS},
    {"id": _id(), "trigger_event": "welcome", "channel": "sms", "label": "Welcome SMS",
     "is_active": False, "sms_text": "", "sms_dlt_content_id": "",
     "available_variables": WELCOME_VARS},
    {"id": _id(), "trigger_event": "welcome", "channel": "whatsapp", "label": "Welcome WhatsApp",
     "is_active": False, "wa_template_title": "", "wa_param_mapping": {},
     "available_variables": WELCOME_VARS},
]


def upgrade() -> None:
    op.create_table(
        'notification_templates',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('trigger_event', sa.String(50), nullable=False, index=True),
        sa.Column('channel', sa.String(20), nullable=False),
        sa.Column('label', sa.String(200), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('email_subject', sa.String(500), nullable=True),
        sa.Column('email_body', sa.Text(), nullable=True),
        sa.Column('sms_text', sa.Text(), nullable=True),
        sa.Column('sms_dlt_content_id', sa.String(100), nullable=True),
        sa.Column('wa_template_title', sa.String(200), nullable=True),
        sa.Column('wa_param_mapping', JSONB(), nullable=True),
        sa.Column('available_variables', JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('trigger_event', 'channel', name='uq_notif_trigger_channel'),
    )

    # Seed templates
    import json
    conn = op.get_bind()
    stmt = sa.text("""INSERT INTO notification_templates
        (id, trigger_event, channel, label, is_active,
         email_subject, email_body, sms_text, sms_dlt_content_id,
         wa_template_title, wa_param_mapping, available_variables)
        VALUES (:id, :trigger_event, :channel, :label, :is_active,
                :email_subject, :email_body, :sms_text, :sms_dlt_content_id,
                :wa_template_title, CAST(:wa_param_mapping AS jsonb), CAST(:available_variables AS jsonb))""")
    for s in SEEDS:
        conn.execute(stmt, {
            "id": s["id"], "trigger_event": s["trigger_event"], "channel": s["channel"],
            "label": s["label"], "is_active": s.get("is_active", False),
            "email_subject": s.get("email_subject"), "email_body": s.get("email_body"),
            "sms_text": s.get("sms_text"), "sms_dlt_content_id": s.get("sms_dlt_content_id"),
            "wa_template_title": s.get("wa_template_title"),
            "wa_param_mapping": json.dumps(s.get("wa_param_mapping") or {}),
            "available_variables": json.dumps(s.get("available_variables") or []),
        })


def downgrade() -> None:
    op.drop_table('notification_templates')
