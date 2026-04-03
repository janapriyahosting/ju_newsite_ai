"""make email nullable, phone unique for OTP auth

Revision ID: e33d9512ecc4
Revises: a1b2c3d4e5f6
Create Date: 2026-04-03 17:23:35.583501

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e33d9512ecc4'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Make email nullable (OTP users may not have email)
    op.alter_column('customers', 'email',
               existing_type=sa.VARCHAR(length=255),
               nullable=True)
    # Make phone unique for OTP-based lookup
    op.create_unique_constraint('uq_customers_phone', 'customers', ['phone'])


def downgrade() -> None:
    op.drop_constraint('uq_customers_phone', 'customers', type_='unique')
    op.alter_column('customers', 'email',
               existing_type=sa.VARCHAR(length=255),
               nullable=False)
