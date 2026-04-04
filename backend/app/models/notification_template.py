import uuid
from sqlalchemy import String, Boolean, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB
from backend.app.models.base import UUIDMixin, TimeStampMixin
from backend.app.core.database import Base


class NotificationTemplate(UUIDMixin, TimeStampMixin, Base):
    __tablename__ = "notification_templates"

    trigger_event:       Mapped[str]  = mapped_column(String(50), nullable=False, index=True)
    channel:             Mapped[str]  = mapped_column(String(20), nullable=False)
    label:               Mapped[str]  = mapped_column(String(200), nullable=False)
    is_active:           Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Email fields
    email_subject:       Mapped[str]  = mapped_column(String(500), nullable=True)
    email_body:          Mapped[str]  = mapped_column(Text, nullable=True)

    # SMS fields
    sms_text:            Mapped[str]  = mapped_column(Text, nullable=True)
    sms_dlt_content_id:  Mapped[str]  = mapped_column(String(100), nullable=True)

    # WhatsApp fields
    wa_template_title:   Mapped[str]  = mapped_column(String(200), nullable=True)
    wa_param_mapping:    Mapped[dict] = mapped_column(JSONB, nullable=True)

    # Variable metadata for admin UI
    available_variables: Mapped[dict] = mapped_column(JSONB, nullable=True)

    __table_args__ = (
        UniqueConstraint("trigger_event", "channel", name="uq_notif_trigger_channel"),
    )

    def __repr__(self):
        return f"<NotificationTemplate {self.trigger_event}/{self.channel}>"
