"""add is_riseup_eligible to units

Revision ID: f1a2b3c4d5e6
Revises: e6f7a8b9
Create Date: 2026-04-20 12:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = 'e6f7a8b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('units', sa.Column(
        'is_riseup_eligible', sa.Boolean(),
        server_default=sa.false(), nullable=False,
    ))


def downgrade() -> None:
    op.drop_column('units', 'is_riseup_eligible')
