"""add project_interest to leads

Revision ID: 0707e25c48db
Revises: e33d9512ecc4
Create Date: 2026-04-03 17:56:21.777252

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0707e25c48db'
down_revision: Union[str, None] = 'e33d9512ecc4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('leads', sa.Column('project_interest', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('leads', 'project_interest')
