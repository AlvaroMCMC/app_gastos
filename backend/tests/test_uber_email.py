from email.message import EmailMessage

import pytest

from uber_email import UberReceipt, parse_amount, parse_email, parse_receipt_text

UBER_HTML = """
<html><body><style>.x{color:red}</style>
<h1>Gracias por usar Uber, Alvaro</h1>
<table><tr><td>Total</td><td>S/ 11.60</td></tr>
<tr><td>S/ 1.20</td><td>Créditos Uber One obtenidos</td></tr>
<tr><td>Tarifa del viaje</td><td>S/ 14.40</td></tr></table>
</body></html>
"""


def build_email(sender="Uber Receipts <uber.pe@uber.com>", auth="mx.google.com; dkim=pass header.i=@uber.com", html=UBER_HTML):
    msg = EmailMessage()
    msg["From"] = sender
    msg["Subject"] = "Tu recorrido"
    if auth:
        msg["Authentication-Results"] = auth
    msg.set_content("texto plano")
    msg.add_alternative(html, subtype="html")
    return msg


def test_parses_total_from_uber_receipt():
    assert parse_email(build_email()) == UberReceipt(amount=11.60, currency="soles")


def test_ignores_sender_outside_uber_domain():
    assert parse_email(build_email(sender="Uber <uber@uber.com.evil.net>")) is None


def test_ignores_email_without_dkim_pass():
    assert parse_email(build_email(auth="mx.google.com; dkim=fail header.i=@uber.com")) is None
    assert parse_email(build_email(auth=None)) is None


def test_ignores_uber_email_without_total():
    assert parse_email(build_email(html="<p>Ofertas de Uber One</p>")) is None


def test_total_picks_total_not_credits_or_fare():
    assert parse_receipt_text("Tarifa S/ 14.40 Total S/ 11.60 Créditos S/ 1.20").amount == 11.60


@pytest.mark.parametrize("text,currency", [("Total US$ 5.20", "dolares"), ("Total R$ 20,00", "reales")])
def test_other_currencies(text, currency):
    assert parse_receipt_text(text).currency == currency


@pytest.mark.parametrize("raw,expected", [("11.60", 11.60), ("1,234.50", 1234.50), ("1.234,50", 1234.50), ("20,00", 20.0)])
def test_parse_amount_formats(raw, expected):
    assert parse_amount(raw) == expected
