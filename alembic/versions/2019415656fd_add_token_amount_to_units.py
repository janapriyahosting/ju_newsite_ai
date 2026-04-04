"""add_token_amount_to_units

Revision ID: 2019415656fd
Revises: d48da2215c64
Create Date: 2026-04-04 14:30:08.348792

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '2019415656fd'
down_revision: Union[str, None] = 'd48da2215c64'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add token_amount column with default 20000
    op.add_column('units', sa.Column(
        'token_amount', sa.Numeric(precision=15, scale=2),
        server_default='20000', nullable=True
    ))
    # Set all existing units to 20000
    op.execute("UPDATE units SET token_amount = 20000 WHERE token_amount IS NULL")


def downgrade() -> None:
    op.drop_column('units', 'token_amount')
