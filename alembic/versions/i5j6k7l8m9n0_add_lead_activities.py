"""add_lead_activities

Revision ID: i5j6k7l8m9n0
Revises: h4i5j6k7l8m9
Create Date: 2026-05-02 11:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'i5j6k7l8m9n0'
down_revision: Union[str, None] = 'h4i5j6k7l8m9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'lead_activities',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('lead_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('leads.id', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('activity_type', sa.String(40), nullable=False),
        sa.Column('subject', sa.String(255), nullable=False),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('source', sa.String(50), nullable=True),
        sa.Column('assigned_to', sa.String(255), nullable=True),
        sa.Column('created_by', sa.String(255), nullable=True),
        sa.Column('extra_data', postgresql.JSONB, nullable=True, server_default=sa.text("'{}'::jsonb")),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_lead_activities_lead_id', 'lead_activities', ['lead_id'])
    op.create_index('ix_lead_activities_scheduled_at', 'lead_activities', ['scheduled_at'])
    op.create_index('ix_lead_activities_status', 'lead_activities', ['status'])


def downgrade() -> None:
    op.drop_index('ix_lead_activities_status', table_name='lead_activities')
    op.drop_index('ix_lead_activities_scheduled_at', table_name='lead_activities')
    op.drop_index('ix_lead_activities_lead_id', table_name='lead_activities')
    op.drop_table('lead_activities')
