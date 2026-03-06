"""add admin_users table
Revision ID: bec181d4fa57
Revises: 0643bb05d87f
Create Date: 2026-03-06 20:13:43.298600
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'bec181d4fa57'
down_revision: Union[str, None] = '0643bb05d87f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table('admin_users',
        sa.Column('username',      sa.String(50),  nullable=False),
        sa.Column('email',         sa.String(255), nullable=True),
        sa.Column('full_name',     sa.String(100), nullable=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('role',          sa.String(20),  server_default='admin', nullable=True),
        sa.Column('is_active',     sa.Boolean(),   server_default='true',  nullable=True),
        sa.Column('id',            postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('created_at',    sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at',    sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('username'),
    )
    op.create_index('ix_admin_users_username', 'admin_users', ['username'], unique=True)

def downgrade() -> None:
    op.drop_index('ix_admin_users_username', table_name='admin_users')
    op.drop_table('admin_users')
