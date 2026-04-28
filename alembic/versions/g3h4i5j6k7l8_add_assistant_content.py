"""add_assistant_content

Revision ID: g3h4i5j6k7l8
Revises: f2b3c4d5e6f7
Create Date: 2026-04-28 06:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import json

revision: str = 'g3h4i5j6k7l8'
down_revision: Union[str, None] = 'f2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


RISEUP_DEFAULT = {
    "title": "RiseUp Offer",
    "subtitle": "Buy a bigger home with a smaller budget",
    "bullets": [
        {"heading": "Pay only 80% now",        "description": "Lock in the home at 80% of total cost"},
        {"heading": "Bank funds up to 90%",    "description": "Of the 80% — down payment is just 8–16%"},
        {"heading": "20% after final demand",  "description": "Paid once the builder raises the final demand"},
        {"heading": "Save on interest",        "description": "EMI only on 80% during construction"},
    ],
    "example_title": "Example: ₹1 Crore unit",
    "example_lines": [
        "→ Pay for ₹80L only",
        "→ Down payment: ₹8L (10%) or ₹16L (20%)",
        "→ Bank funds: ₹64L–₹72L",
        "→ After final demand: ₹20L (top-up / personal loan)",
        "→ Own a ₹1Cr home at the cost of ₹80L!",
    ],
    "cta_label": "Explore at riseup.house →",
    "cta_url":   "https://riseup.house",
}

CALLBACK_DEFAULT = {
    "heading":          "Request a Callback",
    "subheading":       "Our advisor will call within 30 minutes after a quick OTP check.",
    "success_heading":  "We'll call you soon!",
    "success_body":     "Our advisor will reach out within 30 minutes during business hours.",
    "direct_call_label":"Or call us directly",
    "phone_display":    "+91 40 1234 5678",
    "phone_tel":        "+914012345678",
}


def upgrade() -> None:
    op.create_table(
        'assistant_content',
        sa.Column('key',  sa.String(64), primary_key=True),
        sa.Column('data', postgresql.JSON, nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    bind = op.get_bind()
    bind.execute(
        sa.text("INSERT INTO assistant_content (key, data) VALUES (:k, CAST(:d AS JSON))"),
        [{"k": "riseup",   "d": json.dumps(RISEUP_DEFAULT)}],
    )
    bind.execute(
        sa.text("INSERT INTO assistant_content (key, data) VALUES (:k, CAST(:d AS JSON))"),
        [{"k": "callback", "d": json.dumps(CALLBACK_DEFAULT)}],
    )


def downgrade() -> None:
    op.drop_table('assistant_content')
