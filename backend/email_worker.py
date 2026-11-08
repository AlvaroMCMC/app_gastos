"""Worker que lee recibos de Uber en Gmail (IMAP) y crea el gasto en la app.

Variables de entorno: GMAIL_USER, GMAIL_APP_PASSWORD, INGEST_USER_EMAIL (usuario de la app,
por defecto GMAIL_USER), EMAIL_POLL_SECONDS (por defecto 120), EMAIL_LOOKBACK_DAYS (por defecto 7).
Solo procesa correos posteriores a la primera ejecución del worker (se guarda en processed_emails).
"""
import email
import imaplib
import logging
import os
import time
from datetime import datetime, timedelta, timezone
from email import policy
from email.utils import parsedate_to_datetime

from database import Base, SessionLocal, engine
from models import Category, Expense, Item, ProcessedEmail, User
from uber_email import parse_email

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("email_worker")

IMAP_HOST = "imap.gmail.com"
BASELINE_ID = "__baseline__"
LIMA_TZ = timezone(timedelta(hours=-5))  # Perú no tiene horario de verano


def classify(description: str, db) -> str:
    text_value = description.strip().lower()
    for category in db.query(Category).order_by(Category.position).all():
        keywords = [k.strip() for k in (category.keywords or "").split(",") if k.strip()]
        if any(keyword in text_value for keyword in keywords):
            return category.name
    return "otros"


def expense_date(msg) -> datetime:
    """Fecha del correo en hora de Lima, sin zona (como guarda la app las fechas)."""
    try:
        return parsedate_to_datetime(msg["Date"]).astimezone(LIMA_TZ).replace(tzinfo=None)
    except (TypeError, ValueError):
        return datetime.now(LIMA_TZ).replace(tzinfo=None)


def process_message(db, user: User, message_id: str, msg) -> None:
    receipt = parse_email(msg)
    if receipt is None:
        db.add(ProcessedEmail(message_id=message_id, status="ignored"))
        db.commit()
        log.info("Ignorado (no es un recibo de Uber válido): %s", message_id)
        return

    item = (
        db.query(Item)
        .filter(Item.owner_id == user.id, Item.is_archived.is_(False))
        .order_by(Item.created_at.desc())
        .first()
    )
    if item is None:
        # No se marca como procesado: se reintenta cuando exista un item activo.
        log.warning("Sin item activo para %s, se reintentará: %s", user.email, message_id)
        return

    description = "Uber"
    now = datetime.utcnow()
    expense = Expense(
        item_id=item.id,
        amount=receipt.amount,
        description=description,
        payment_method="banco",
        currency=receipt.currency,
        paid_by=user.id,
        date=expense_date(msg),
        ai_category=classify(description, db),
        ai_confidence=0.35,
        ai_model="rules-v1",
        ai_classified_at=now,
    )
    db.add(expense)
    db.flush()
    db.add(ProcessedEmail(message_id=message_id, status="created", expense_id=expense.id))
    db.commit()
    log.info("Gasto creado: %s %.2f %s en '%s'", description, receipt.amount, receipt.currency, item.name)


def get_baseline(db) -> datetime:
    """Momento de la primera ejecución (UTC, con zona). Solo se procesan correos posteriores."""
    row = db.get(ProcessedEmail, BASELINE_ID)
    if row is None:
        row = ProcessedEmail(message_id=BASELINE_ID, status="baseline")
        db.add(row)
        db.commit()
        log.info("Primera ejecución: solo se procesarán correos posteriores a %s UTC", row.processed_at)
    return row.processed_at.replace(tzinfo=timezone.utc)


def received_at(msg) -> datetime:
    try:
        return parsedate_to_datetime(msg["Date"]).astimezone(timezone.utc)
    except (TypeError, ValueError):
        return datetime.now(timezone.utc)


def poll_once(gmail_user: str, gmail_password: str, ingest_email: str, lookback_days: int) -> None:
    db = SessionLocal()
    try:
        baseline = get_baseline(db)
        user = db.query(User).filter(User.email == ingest_email).first()
        if user is None:
            log.error("No existe el usuario %s en la app", ingest_email)
            return

        since = (datetime.now() - timedelta(days=lookback_days)).strftime("%d-%b-%Y")
        with imaplib.IMAP4_SSL(IMAP_HOST) as imap:
            imap.login(gmail_user, gmail_password)
            imap.select("INBOX", readonly=True)
            status, data = imap.search(None, "SINCE", since, "FROM", '"uber.com"')
            if status != "OK":
                log.error("Búsqueda IMAP falló: %s", status)
                return

            for num in data[0].split():
                # BODY.PEEK no marca el correo como leído
                status, fetched = imap.fetch(num, "(BODY.PEEK[])")
                if status != "OK" or not fetched or not isinstance(fetched[0], tuple):
                    continue
                msg = email.message_from_bytes(fetched[0][1], policy=policy.default)
                message_id = (msg.get("Message-ID") or "").strip()
                if not message_id:
                    continue
                if db.get(ProcessedEmail, message_id):
                    continue
                if received_at(msg) < baseline:
                    db.add(ProcessedEmail(message_id=message_id, status="ignored"))
                    db.commit()
                    continue
                try:
                    process_message(db, user, message_id, msg)
                except Exception:
                    db.rollback()
                    log.exception("Error procesando %s", message_id)
    finally:
        db.close()


def main() -> None:
    gmail_user = os.environ["GMAIL_USER"]
    gmail_password = os.environ["GMAIL_APP_PASSWORD"].replace(" ", "")
    ingest_email = os.getenv("INGEST_USER_EMAIL") or gmail_user
    interval = int(os.getenv("EMAIL_POLL_SECONDS", "120"))
    lookback_days = int(os.getenv("EMAIL_LOOKBACK_DAYS", "7"))

    Base.metadata.create_all(bind=engine)
    log.info("Worker iniciado: %s -> usuario %s cada %ss", gmail_user, ingest_email, interval)
    while True:
        try:
            poll_once(gmail_user, gmail_password, ingest_email, lookback_days)
        except Exception:
            log.exception("Error en el ciclo de lectura")
        time.sleep(interval)


if __name__ == "__main__":
    main()
