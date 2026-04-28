"""add_assistant_facts

Revision ID: h4i5j6k7l8m9
Revises: g3h4i5j6k7l8
Create Date: 2026-04-28 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'h4i5j6k7l8m9'
down_revision: Union[str, None] = 'g3h4i5j6k7l8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'assistant_facts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('project_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('projects.id', ondelete='CASCADE'),
                  nullable=True),
        sa.Column('topic', sa.String(100), nullable=False, server_default='general'),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column('sort_order', sa.Integer, nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_assistant_facts_project_id', 'assistant_facts', ['project_id'])

    # Seed two examples so the admin can see what good entries look like.
    bind = op.get_bind()
    bind.execute(sa.text("""
        INSERT INTO assistant_facts (project_id, topic, content, sort_order)
        VALUES
          (NULL, 'pricing',
           'The total amount shown for a unit includes GST, club house, parking, '
           'utilities, advance maintenance, and documentation charges — unless '
           'noted otherwise for a specific project below.',
           0),
          (NULL, 'pricing',
           'When the visitor asks "what does the price include", list those '
           'inclusions explicitly instead of just quoting a number.',
           1)
    """))


def downgrade() -> None:
    op.drop_index('ix_assistant_facts_project_id', table_name='assistant_facts')
    op.drop_table('assistant_facts')
