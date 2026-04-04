"""add_profile_pic_to_customers

Revision ID: b3c4d5e6f7a8
Revises: 2019415656fd
Create Date: 2026-04-04

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b3c4d5e6f7a8'
down_revision: Union[str, None] = '2019415656fd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('customers', sa.Column('profile_pic', sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column('customers', 'profile_pic')
