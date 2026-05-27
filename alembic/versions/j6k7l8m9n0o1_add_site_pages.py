"""add_site_pages

Revision ID: j6k7l8m9n0o1
Revises: i5j6k7l8m9n0
Create Date: 2026-05-27 17:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'j6k7l8m9n0o1'
down_revision: Union[str, None] = 'i5j6k7l8m9n0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'site_pages',
        sa.Column('url', sa.String(255), primary_key=True),
        sa.Column('title', sa.String(255), nullable=False, server_default=''),
        sa.Column('summary', sa.Text, nullable=False, server_default=''),
        sa.Column('text', sa.Text, nullable=False, server_default=''),
        sa.Column('char_count', sa.Integer, nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('site_pages')
