"""
CMS Models: cms_pages, cms_sections, site_settings, store_filters
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, JSON, Integer
from sqlalchemy.dialects.postgresql import UUID
from backend.app.core.database import Base

class CmsPage(Base):
    __tablename__ = "cms_pages"
    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    page_key      = Column(String(100), unique=True, nullable=False)  # e.g. "home", "projects"
    page_label    = Column(String(200), nullable=False)
    seo_title     = Column(String(300))
    seo_description = Column(Text)
    seo_keywords  = Column(Text)
    og_title      = Column(String(300))
    og_description = Column(Text)
    og_image_url  = Column(String(500))
    canonical_url = Column(String(500))
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class CmsSection(Base):
    __tablename__ = "cms_sections"
    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    section_key   = Column(String(100), unique=True, nullable=False)  # e.g. "hero", "why_us"
    section_label = Column(String(200), nullable=False)
    page_key      = Column(String(100), nullable=False, index=True)   # which page it belongs to
    title         = Column(String(500))
    subtitle      = Column(String(500))
    body          = Column(Text)                                       # rich text HTML
    cta_text      = Column(String(200))
    cta_url       = Column(String(500))
    extra_data    = Column(JSON, default=dict)                         # for stats, testimonials, etc.
    sort_order    = Column(String(10), default="0")
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class SiteSetting(Base):
    __tablename__ = "site_settings"
    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    setting_key   = Column(String(200), unique=True, nullable=False)
    setting_label = Column(String(300), nullable=False)
    setting_value = Column(Text)
    setting_type  = Column(String(50), default="text")   # text, url, email, phone, textarea, color
    group_key     = Column(String(100), default="general")  # general, contact, social, seo
    sort_order    = Column(String(10), default="0")
    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class StoreFilter(Base):
    __tablename__ = "store_filters"
    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filter_key      = Column(String(100), unique=True, nullable=False)
    filter_label    = Column(String(200), nullable=False)
    filter_type     = Column(String(50), nullable=False, default="pills")  # pills, select, range_slider, button_group, checkbox
    field_name      = Column(String(100), nullable=True)  # unit column to filter on (e.g. "facing", "unit_type", "series_code")
    options         = Column(JSON, nullable=True)    # [{value, label, ...}]
    config          = Column(JSON, nullable=True)    # {min, max, format, default_value, ...}
    is_active       = Column(Boolean, default=True)
    is_quick_filter = Column(Boolean, default=False)  # quick bar vs advanced panel
    sort_order      = Column(Integer, default=0)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
