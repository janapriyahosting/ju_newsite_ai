"""add assistant_chat_logs

Revision ID: f2b3c4d5e6f7
Revises: f1a2b3c4d5e6
Create Date: 2026-04-20 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'f2b3c4d5e6f7'
down_revision: Union[str, None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'assistant_chat_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('session_id',    sa.String(length=100), nullable=False, index=True),
        sa.Column('visitor_id',    sa.String(length=100), nullable=True,  index=True),
        sa.Column('role',          sa.String(length=20),  nullable=False),   # 'user' | 'assistant'
        sa.Column('content',       sa.Text(),             nullable=False),
        sa.Column('intent',        sa.String(length=50),  nullable=True),
        sa.Column('provider',      sa.String(length=50),  nullable=True),    # 'groq' | 'gemini:<model>'
        sa.Column('page',          sa.String(length=20),  nullable=True),    # home | store | project | tower | unit
        sa.Column('page_entity_id', sa.String(length=100), nullable=True),
        sa.Column('action_type',   sa.String(length=40),  nullable=True),    # 'navigate_store' | 'ask_which' | ...
        sa.Column('action_url',    sa.String(length=500), nullable=True),
        sa.Column('latency_ms',    sa.Integer(),          nullable=True),
        # Attribution / visitor profile — populated on the first user turn of each session
        sa.Column('ip_address',    sa.String(length=50),  nullable=True),
        sa.Column('user_agent',    sa.Text(),             nullable=True),
        sa.Column('referrer',      sa.String(length=500), nullable=True),
        sa.Column('landing_page',  sa.String(length=500), nullable=True),
        sa.Column('utm_source',    sa.String(length=100), nullable=True),
        sa.Column('utm_medium',    sa.String(length=100), nullable=True),
        sa.Column('utm_campaign',  sa.String(length=100), nullable=True),
        sa.Column('utm_term',      sa.String(length=100), nullable=True),
        sa.Column('utm_content',   sa.String(length=100), nullable=True),
        sa.Column('cookies',       postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at',    sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False, index=True),
    )
    op.create_index('ix_assistant_chat_logs_session_created',
                    'assistant_chat_logs', ['session_id', 'created_at'])


def downgrade() -> None:
    op.drop_index('ix_assistant_chat_logs_session_created', table_name='assistant_chat_logs')
    op.drop_table('assistant_chat_logs')
