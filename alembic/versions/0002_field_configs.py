"""add field_configs and custom_field_values tables

Revision ID: 0002_field_configs
Revises: bec181d4fa57
Create Date: 2026-03-10
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0002_field_configs'
down_revision = 'bec181d4fa57'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TYPE entitytype AS ENUM
        ('project','tower','unit','lead','site_visit','booking')
    """)
    op.execute("""
        CREATE TYPE fieldtype AS ENUM
        ('text','number','decimal','boolean','select','multiselect',
         'date','textarea','email','phone','url','currency')
    """)

    op.create_table(
        'field_configs',
        sa.Column('id',               postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('entity',           sa.Text(), nullable=False),
        sa.Column('field_key',        sa.String(100), nullable=False),
        sa.Column('label',            sa.String(200), nullable=False),
        sa.Column('field_type',       sa.Text(), nullable=False, server_default='text'),
        sa.Column('is_visible',       sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_required',      sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_custom',        sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('sort_order',       sa.Integer(), nullable=False, server_default='0'),
        sa.Column('placeholder',      sa.String(300), nullable=True),
        sa.Column('help_text',        sa.String(500), nullable=True),
        sa.Column('field_options',    postgresql.JSONB(), nullable=True),
        sa.Column('show_on_customer', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('show_on_admin',    sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at',       sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at',       sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.UniqueConstraint('entity', 'field_key', name='uq_field_config_entity_key'),
    )
    op.create_index('ix_field_configs_entity', 'field_configs', ['entity'])

    op.create_table(
        'custom_field_values',
        sa.Column('id',              postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('field_config_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('field_configs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('entity_id',       postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('value',           postgresql.JSONB(), nullable=True),
        sa.Column('created_at',      sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at',      sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_cfv_field_config_id', 'custom_field_values', ['field_config_id'])
    op.create_index('ix_cfv_entity_id',       'custom_field_values', ['entity_id'])

    op.execute("""
    INSERT INTO field_configs
      (entity,field_key,label,field_type,is_visible,is_required,is_custom,sort_order,show_on_customer,show_on_admin)
    VALUES
      ('project','name','Project Name','text',true,true,false,1,true,true),
      ('project','slug','URL Slug','text',false,true,false,2,false,true),
      ('project','city','City','text',true,true,false,3,true,true),
      ('project','locality','Locality','text',true,false,false,4,true,true),
      ('project','rera_number','RERA Number','text',true,false,false,5,true,true),
      ('project','total_units','Total Units','number',true,false,false,6,true,true),
      ('project','possession_date','Possession Date','date',true,false,false,7,true,true),
      ('project','description','Description','textarea',true,false,false,8,true,true),
      ('project','amenities','Amenities','multiselect',true,false,false,9,true,true),
      ('tower','name','Tower Name','text',true,true,false,1,true,true),
      ('tower','total_floors','Total Floors','number',true,false,false,2,true,true),
      ('tower','total_units','Total Units','number',true,false,false,3,true,true),
      ('unit','unit_number','Unit Number','text',true,true,false,1,true,true),
      ('unit','unit_type','Unit Type','select',true,true,false,2,true,true),
      ('unit','bedrooms','BHK','number',true,false,false,3,true,true),
      ('unit','bathrooms','Bathrooms','number',true,false,false,4,true,true),
      ('unit','floor_number','Floor','number',true,false,false,5,true,true),
      ('unit','area_sqft','Area (sqft)','number',true,false,false,6,true,true),
      ('unit','base_price','Base Price (₹)','currency',true,true,false,7,true,true),
      ('unit','emi_estimate','EMI Estimate (₹/mo)','currency',true,false,false,8,true,true),
      ('unit','down_payment','Down Payment (₹)','currency',true,false,false,9,true,true),
      ('unit','facing','Facing','select',true,false,false,10,true,true),
      ('unit','status','Status','select',true,true,false,11,false,true),
      ('unit','is_trending','Trending','boolean',false,false,false,12,false,true),
      ('unit','description','Description','textarea',true,false,false,13,true,true),
      ('lead','name','Full Name','text',true,true,false,1,true,true),
      ('lead','email','Email','email',true,false,false,2,true,true),
      ('lead','phone','Phone Number','phone',true,true,false,3,true,true),
      ('lead','source','Lead Source','select',true,false,false,4,false,true),
      ('lead','interest','Interested In','select',true,false,false,5,true,true),
      ('lead','budget_min','Min Budget (₹)','currency',true,false,false,6,true,true),
      ('lead','budget_max','Max Budget (₹)','currency',true,false,false,7,true,true),
      ('lead','message','Message','textarea',true,false,false,8,true,true),
      ('lead','status','Status','select',false,false,false,9,false,true),
      ('site_visit','visit_date','Visit Date','date',true,true,false,1,true,true),
      ('site_visit','visit_time','Preferred Time','select',true,true,false,2,true,true),
      ('site_visit','name','Your Name','text',true,true,false,3,true,true),
      ('site_visit','phone','Phone Number','phone',true,true,false,4,true,true),
      ('site_visit','email','Email','email',true,false,false,5,true,true),
      ('site_visit','notes','Special Requests','textarea',true,false,false,6,true,true),
      ('site_visit','status','Status','select',false,false,false,7,false,true),
      ('booking','booking_amount','Booking Amount (₹)','currency',true,true,false,1,true,true),
      ('booking','total_amount','Total Amount (₹)','currency',true,false,false,2,true,true),
      ('booking','coupon_code','Coupon Code','text',true,false,false,3,true,true),
      ('booking','notes','Notes','textarea',true,false,false,4,true,true),
      ('booking','status','Booking Status','select',false,false,false,5,false,true)
    ON CONFLICT ON CONSTRAINT uq_field_config_entity_key DO NOTHING;
    """)


def downgrade() -> None:
    op.drop_table('custom_field_values')
    op.drop_table('field_configs')
    op.execute("DROP TYPE IF EXISTS entitytype")
    op.execute("DROP TYPE IF EXISTS fieldtype")
