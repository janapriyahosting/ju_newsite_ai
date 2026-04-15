"""add store_filters table for admin-managed store page filters

Revision ID: d5e6f7a8
Revises: c4d5e6f7
Create Date: 2026-04-15
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'd5e6f7a8'
down_revision = 'c4d5e6f7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    store_filters = op.create_table(
        'store_filters',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('filter_key', sa.String(100), unique=True, nullable=False),
        sa.Column('filter_label', sa.String(200), nullable=False),
        sa.Column('filter_type', sa.String(50), nullable=False, server_default='pills'),
        sa.Column('options', postgresql.JSONB(), nullable=True),
        sa.Column('config', postgresql.JSONB(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_quick_filter', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )

    # Seed current hardcoded filters as initial data
    op.bulk_insert(store_filters, [
        {
            "filter_key": "unit_type",
            "filter_label": "Unit Type",
            "filter_type": "pills",
            "options": [
                {"value": "All", "label": "All"},
                {"value": "2BHK", "label": "2BHK"},
                {"value": "3BHK", "label": "3BHK"},
                {"value": "4BHK", "label": "4BHK"},
                {"value": "Villa", "label": "Villa"},
                {"value": "Plot", "label": "Plot"},
                {"value": "Studio", "label": "Studio"},
            ],
            "config": {"default_value": "All"},
            "is_active": True,
            "is_quick_filter": True,
            "sort_order": 1,
        },
        {
            "filter_key": "trending",
            "filter_label": "Trending",
            "filter_type": "checkbox",
            "options": None,
            "config": ({"label": "\U0001f525 Trending"}),
            "is_active": True,
            "is_quick_filter": True,
            "sort_order": 2,
        },
        {
            "filter_key": "status",
            "filter_label": "Status",
            "filter_type": "select",
            "options": ([
                {"value": "All Status", "label": "All Status"},
                {"value": "available", "label": "Available"},
                {"value": "booked", "label": "Booked"},
                {"value": "reserved", "label": "Reserved"},
            ]),
            "config": ({"default_value": "All Status"}),
            "is_active": True,
            "is_quick_filter": True,
            "sort_order": 3,
        },
        {
            "filter_key": "sort",
            "filter_label": "Sort By",
            "filter_type": "select",
            "options": ([
                {"value": "newest", "label": "Newest First"},
                {"value": "price_asc", "label": "Price: Low \u2192 High"},
                {"value": "price_desc", "label": "Price: High \u2192 Low"},
                {"value": "area_desc", "label": "Area: Largest"},
                {"value": "floor_asc", "label": "Floor: Lowest"},
                {"value": "floor_desc", "label": "Floor: Highest"},
            ]),
            "config": ({"default_value": "newest"}),
            "is_active": True,
            "is_quick_filter": True,
            "sort_order": 4,
        },
        {
            "filter_key": "price_range",
            "filter_label": "Price Range",
            "filter_type": "range_slider",
            "options": None,
            "config": ({"min": 0, "max": 20000000, "format": "price", "setting_key": "filter_price_max"}),
            "is_active": True,
            "is_quick_filter": False,
            "sort_order": 5,
        },
        {
            "filter_key": "area_range",
            "filter_label": "Area (sqft)",
            "filter_type": "range_slider",
            "options": None,
            "config": ({"min": 0, "max": 5000, "format": "area", "setting_key": "filter_area_max"}),
            "is_active": True,
            "is_quick_filter": False,
            "sort_order": 6,
        },
        {
            "filter_key": "facing",
            "filter_label": "Facing",
            "filter_type": "pills",
            "options": ([
                {"value": "Any", "label": "Any"},
                {"value": "East", "label": "East"},
                {"value": "West", "label": "West"},
                {"value": "North", "label": "North"},
                {"value": "South", "label": "South"},
                {"value": "North-East", "label": "North-East"},
                {"value": "North-West", "label": "North-West"},
                {"value": "South-East", "label": "South-East"},
                {"value": "South-West", "label": "South-West"},
            ]),
            "config": ({"default_value": "Any"}),
            "is_active": True,
            "is_quick_filter": False,
            "sort_order": 7,
        },
        {
            "filter_key": "floor_level",
            "filter_label": "Floor Level",
            "filter_type": "pills",
            "options": ([
                {"value": "any", "label": "Any Floor", "min": 0, "max": 999},
                {"value": "ground", "label": "Ground (0-2)", "min": 0, "max": 2},
                {"value": "low", "label": "Low (3-7)", "min": 3, "max": 7},
                {"value": "mid", "label": "Mid (8-15)", "min": 8, "max": 15},
                {"value": "high", "label": "High (16+)", "min": 16, "max": 999},
            ]),
            "config": ({"default_value": "any"}),
            "is_active": True,
            "is_quick_filter": False,
            "sort_order": 8,
        },
        {
            "filter_key": "bedrooms",
            "filter_label": "Min Bedrooms",
            "filter_type": "button_group",
            "options": ([
                {"value": "0", "label": "Any"},
                {"value": "1", "label": "1+"},
                {"value": "2", "label": "2+"},
                {"value": "3", "label": "3+"},
                {"value": "4", "label": "4+"},
            ]),
            "config": ({"default_value": "0"}),
            "is_active": True,
            "is_quick_filter": False,
            "sort_order": 9,
        },
    ])


def downgrade() -> None:
    op.drop_table('store_filters')
