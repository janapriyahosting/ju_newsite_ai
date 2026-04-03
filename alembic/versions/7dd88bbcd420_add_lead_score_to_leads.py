"""add lead_score to leads

Revision ID: 7dd88bbcd420
Revises: 0707e25c48db
Create Date: 2026-04-03 18:26:30.272179

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

revision: str = '7dd88bbcd420'
down_revision: Union[str, None] = '0707e25c48db'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('leads', sa.Column('lead_score', sa.Integer(), server_default='0', nullable=False))
    op.add_column('leads', sa.Column('score_details', JSON(), server_default='{}', nullable=False))


def downgrade() -> None:
    op.drop_column('leads', 'score_details')
    op.drop_column('leads', 'lead_score')
