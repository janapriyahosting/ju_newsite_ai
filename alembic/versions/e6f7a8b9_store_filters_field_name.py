"""add field_name to store_filters and backfill existing rows

Revision ID: e6f7a8b9
Revises: d5e6f7a8
Create Date: 2026-04-15
"""
from alembic import op
import sqlalchemy as sa

revision = 'e6f7a8b9'
down_revision = 'd5e6f7a8'
branch_labels = None
depends_on = None

# Map existing filter_key → the unit field it filters on
BACKFILL = {
    "unit_type":   "unit_type",
    "trending":    "is_trending",
    "status":      "status",
    "sort":        None,            # sort is not a field filter
    "price_range": "base_price",
    "area_range":  "area_sqft",
    "facing":      "facing",
    "floor_level": "floor_number",
    "bedrooms":    "bedrooms",
}


def upgrade() -> None:
    op.add_column('store_filters', sa.Column('field_name', sa.String(100), nullable=True))

    # Backfill existing filters
    for filter_key, field_name in BACKFILL.items():
        if field_name:
            op.execute(
                sa.text(
                    "UPDATE store_filters SET field_name = :field_name WHERE filter_key = :filter_key"
                ).bindparams(field_name=field_name, filter_key=filter_key)
            )


def downgrade() -> None:
    op.drop_column('store_filters', 'field_name')
