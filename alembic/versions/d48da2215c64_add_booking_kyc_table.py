"""add booking_kyc table

Revision ID: d48da2215c64
Revises: 7dd88bbcd420
Create Date: 2026-04-03 19:41:26.195354

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision: str = 'd48da2215c64'
down_revision: Union[str, None] = '7dd88bbcd420'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'booking_kyc',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('booking_id', UUID(as_uuid=True), sa.ForeignKey('bookings.id', ondelete='CASCADE'), nullable=False, unique=True),
        # Correspondence address
        sa.Column('corr_address', sa.Text(), nullable=True),
        sa.Column('corr_city', sa.String(100), nullable=True),
        sa.Column('corr_state', sa.String(100), nullable=True),
        sa.Column('corr_pincode', sa.String(10), nullable=True),
        # Permanent address
        sa.Column('perm_same_as_corr', sa.Boolean(), server_default='false'),
        sa.Column('perm_address', sa.Text(), nullable=True),
        sa.Column('perm_city', sa.String(100), nullable=True),
        sa.Column('perm_state', sa.String(100), nullable=True),
        sa.Column('perm_pincode', sa.String(10), nullable=True),
        # Co-applicant
        sa.Column('co_applicant_name', sa.String(255), nullable=True),
        sa.Column('co_applicant_phone', sa.String(20), nullable=True),
        sa.Column('co_applicant_email', sa.String(255), nullable=True),
        sa.Column('co_applicant_relation', sa.String(100), nullable=True),
        sa.Column('co_applicant_aadhar', sa.String(12), nullable=True),
        sa.Column('co_applicant_pan', sa.String(10), nullable=True),
        # Employment
        sa.Column('employer_name', sa.String(255), nullable=True),
        sa.Column('designation', sa.String(255), nullable=True),
        sa.Column('employment_type', sa.String(50), nullable=True),
        sa.Column('monthly_salary', sa.Numeric(15, 2), nullable=True),
        sa.Column('work_experience', sa.String(50), nullable=True),
        # Loans
        sa.Column('has_existing_loans', sa.Boolean(), server_default='false'),
        sa.Column('existing_loan_amount', sa.Numeric(15, 2), nullable=True),
        sa.Column('existing_loan_emi', sa.Numeric(15, 2), nullable=True),
        sa.Column('loan_details', sa.Text(), nullable=True),
        # KYC documents
        sa.Column('aadhar_number', sa.String(12), nullable=True),
        sa.Column('aadhar_name', sa.String(255), nullable=True),
        sa.Column('pan_number', sa.String(10), nullable=True),
        sa.Column('pan_name', sa.String(255), nullable=True),
        sa.Column('date_of_birth', sa.String(20), nullable=True),
        # Extra
        sa.Column('extra_data', JSONB(), server_default='{}'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()')),
    )
    op.create_index('ix_booking_kyc_booking_id', 'booking_kyc', ['booking_id'])


def downgrade() -> None:
    op.drop_table('booking_kyc')
