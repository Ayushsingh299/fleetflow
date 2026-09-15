import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("fleetflow.notifications")
logger.setLevel(logging.INFO)
# Avoid duplicating if logger is already configured
if not logger.handlers:
    ch = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - [%(levelname)s] - EXTERNAL NOTIFICATION - %(message)s')
    ch.setFormatter(formatter)
    logger.addHandler(ch)

def send_email(to_email: str, subject: str, html_content: str):
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_from_email = os.getenv("SMTP_FROM_EMAIL", smtp_username)

    # If SMTP is not properly configured, fallback to mock (for testing without creds)
    if not smtp_username or not smtp_password or smtp_password == "your_16_char_app_password":
        logger.info(f"--- MOCK EMAIL (SMTP Not Configured) ---")
        logger.info(f"To: {to_email}")
        logger.info(f"Subject: {subject}")
        logger.info(f"Body: {html_content}")
        logger.info(f"------------------")
        return

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = smtp_from_email
        msg["To"] = to_email

        part = MIMEText(html_content, "html")
        msg.attach(part)

        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        server.sendmail(smtp_from_email, to_email, msg.as_string())
        server.quit()

        logger.info(f"Email sent successfully to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")

def send_sms(to_phone: str, message: str):
    logger.info(f"--- MOCK SMS ---")
    logger.info(f"To: {to_phone}")
    logger.info(f"Message: {message}")
    logger.info(f"-----------------")

def send_push_notification(device_token: str, title: str, body: str):
    logger.info(f"--- MOCK FCM PUSH ---")
    logger.info(f"Device: {device_token}")
    logger.info(f"Title: {title}")
    logger.info(f"Body: {body}")
    logger.info(f"---------------------")
