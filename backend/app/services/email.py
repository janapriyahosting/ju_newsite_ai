"""Email service for Janapriya Upscale — booking confirmations & notifications."""
import smtplib
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from backend.app.core.config import settings


def _send_email_sync(to_email: str, subject: str, html: str) -> bool:
    """Blocking SMTP send — runs in a thread via asyncio."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"Janapriya Upscale <{settings.SMTP_USER}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, to_email, msg.as_string())
        print(f"[Email] Sent to {to_email}")
        return True
    except Exception as e:
        print(f"[Email] Failed to send to {to_email}: {e}")
        return False


async def send_booking_confirmation_email(
    to_email: str,
    customer_name: str,
    unit_number: str,
    project_name: str,
    booking_amount: str,
    total_amount: str,
    payment_id: str,
    booking_id: str,
    booked_at: str,
) -> bool:
    """Send booking confirmation email to customer."""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print("[Email] SMTP not configured, skipping email")
        return False

    subject = f"Booking Confirmed — {unit_number} | Janapriya Upscale"

    html = f"""
    <div style="font-family:'Lato',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
      <div style="background:linear-gradient(135deg,#262262,#2A3887);padding:30px 24px;text-align:center;">
        <h1 style="color:#29A9DF;font-size:22px;margin:0 0 4px;">Janapriya Upscale</h1>
        <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:0;">Booking Confirmation</p>
      </div>

      <div style="padding:28px 24px;">
        <p style="font-size:15px;color:#333;margin:0 0 16px;">
          Dear <strong>{customer_name}</strong>,
        </p>
        <p style="font-size:15px;color:#333;margin:0 0 20px;">
          Thank you for choosing Janapriya Upscale! Your booking has been <strong style="color:#16A34A;">confirmed</strong>.
        </p>

        <div style="background:#F0F4FF;border:1px solid #E2F1FC;border-radius:12px;padding:20px;margin:0 0 20px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr>
              <td style="padding:6px 0;color:#666;">Unit</td>
              <td style="padding:6px 0;text-align:right;font-weight:700;color:#2A3887;">{unit_number}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#666;">Project</td>
              <td style="padding:6px 0;text-align:right;font-weight:700;color:#333;">{project_name}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#666;">Total Price</td>
              <td style="padding:6px 0;text-align:right;font-weight:700;color:#333;">{total_amount}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#666;">Token Amount Paid</td>
              <td style="padding:6px 0;text-align:right;font-weight:700;color:#16A34A;">{booking_amount}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#666;">Payment ID</td>
              <td style="padding:6px 0;text-align:right;font-family:monospace;color:#555;">{payment_id}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#666;">Booking ID</td>
              <td style="padding:6px 0;text-align:right;font-family:monospace;color:#555;">{booking_id[:8].upper()}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#666;">Date</td>
              <td style="padding:6px 0;text-align:right;color:#333;">{booked_at}</td>
            </tr>
          </table>
        </div>

        <p style="font-size:14px;color:#555;margin:0 0 8px;">
          <strong>Next steps:</strong>
        </p>
        <ul style="font-size:14px;color:#555;padding-left:20px;margin:0 0 20px;">
          <li style="margin-bottom:6px;">Complete your KYC documents on your dashboard</li>
          <li style="margin-bottom:6px;">Our team will contact you within 24 hours</li>
          <li>You can view your booking anytime at your dashboard</li>
        </ul>

        <div style="text-align:center;margin:24px 0;">
          <a href="https://janapriyaupscale.com/dashboard"
             style="background:linear-gradient(135deg,#2A3887,#29A9DF);color:#fff;padding:12px 32px;
                    border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;">
            View My Booking
          </a>
        </div>
      </div>

      <div style="background:#262262;padding:20px 24px;text-align:center;">
        <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0 0 4px;">
          Janapriya Upscale — Your Dream Home Awaits
        </p>
        <p style="color:rgba(255,255,255,0.4);font-size:11px;margin:0;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    </div>
    """

    # Run blocking SMTP in a thread to avoid blocking the async event loop
    return await asyncio.to_thread(_send_email_sync, to_email, subject, html)
