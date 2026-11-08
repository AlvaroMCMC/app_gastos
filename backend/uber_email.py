"""Parser de recibos de Uber recibidos por correo. Sin dependencias externas."""
import re
from dataclasses import dataclass
from email.message import Message
from email.utils import parseaddr
from html.parser import HTMLParser
from typing import Optional

CURRENCY_BY_SYMBOL = {"S/": "soles", "US$": "dolares", "R$": "reales"}

# "Total" seguido del monto: "Total S/ 11.60", "Total US$ 5.20"
TOTAL_RE = re.compile(r"\bTotal\s*(S/|US\$|R\$)\s*(-?[\d.,]+\d)", re.IGNORECASE)


@dataclass
class UberReceipt:
    amount: float
    currency: str


class _TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self._skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self._skip += 1

    def handle_endtag(self, tag):
        if tag in ("script", "style") and self._skip:
            self._skip -= 1

    def handle_data(self, data):
        if not self._skip:
            self.parts.append(data)


def html_to_text(html: str) -> str:
    extractor = _TextExtractor()
    extractor.feed(html)
    return re.sub(r"\s+", " ", " ".join(extractor.parts)).strip()


def parse_amount(raw: str) -> float:
    """Acepta '11.60', '1,234.50' y '1.234,50'."""
    if "," in raw and "." in raw:
        if raw.rfind(",") > raw.rfind("."):
            raw = raw.replace(".", "").replace(",", ".")
        else:
            raw = raw.replace(",", "")
    elif "," in raw:
        head, _, tail = raw.rpartition(",")
        raw = f"{head}.{tail}" if len(tail) <= 2 else raw.replace(",", "")
    return float(raw)


def parse_receipt_text(text: str) -> Optional[UberReceipt]:
    match = TOTAL_RE.search(text)
    if not match:
        return None
    amount = parse_amount(match.group(2))
    if amount <= 0:
        return None
    return UberReceipt(amount=amount, currency=CURRENCY_BY_SYMBOL[match.group(1).upper()])


def is_from_uber(msg: Message) -> bool:
    """Remitente en uber.com y autenticado por DKIM (Gmail añade Authentication-Results)."""
    domain = parseaddr(msg.get("From", ""))[1].rpartition("@")[2].lower()
    if domain != "uber.com" and not domain.endswith(".uber.com"):
        return False
    auth = (msg.get("Authentication-Results") or "").lower()
    return "dkim=pass" in auth and "uber.com" in auth


def extract_body_text(msg: Message) -> str:
    html, plain = [], []
    for part in msg.walk():
        ctype = part.get_content_type()
        if ctype not in ("text/html", "text/plain"):
            continue
        payload = part.get_payload(decode=True)
        if payload is None:
            continue
        text = payload.decode(part.get_content_charset() or "utf-8", errors="replace")
        (html if ctype == "text/html" else plain).append(text)
    if html:
        return html_to_text(" ".join(html))
    return re.sub(r"\s+", " ", " ".join(plain)).strip()


def parse_email(msg: Message) -> Optional[UberReceipt]:
    """Devuelve el recibo si es un correo de Uber autenticado con un Total, si no None."""
    if not is_from_uber(msg):
        return None
    return parse_receipt_text(extract_body_text(msg))
