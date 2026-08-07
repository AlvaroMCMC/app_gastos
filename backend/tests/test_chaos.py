import json
import threading
import urllib.error
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

import main


def _expense_payload(**overrides):
    payload = {
        "amount": 50.0,
        "description": "Uber al trabajo",
        "payment_method": "banco",
        "currency": "soles",
    }
    payload.update(overrides)
    return payload


# ---- Caída de base de datos ----

def test_db_outage_returns_controlled_500_not_a_crash(client, auth_headers):
    headers = auth_headers()

    unsafe_client = TestClient(main.app, raise_server_exceptions=False)
    unsafe_client.headers.update(headers)

    with patch.object(Session, "query", side_effect=OperationalError("SELECT 1", {}, Exception("connection lost"))):
        r = unsafe_client.get("/api/items")

    assert r.status_code == 500


def test_app_recovers_after_db_outage(client, auth_headers):
    """La sesión rota de un request fallido no debe dejar el engine/proceso en mal estado."""
    headers = auth_headers()

    unsafe_client = TestClient(main.app, raise_server_exceptions=False)
    unsafe_client.headers.update(headers)

    with patch.object(Session, "query", side_effect=OperationalError("SELECT 1", {}, Exception("connection lost"))):
        unsafe_client.get("/api/items")

    # Fuera del patch, un request normal debe funcionar sin problema
    r = client.get("/api/items", headers=headers)
    assert r.status_code == 200


# ---- OpenAI caído / timeout ----

def test_openai_timeout_falls_back_to_rules(client, auth_headers, monkeypatch):
    headers = auth_headers()
    monkeypatch.setattr(main, "OPENAI_API_KEY", "fake-key-for-test")

    item_id = client.post("/api/items", json={"name": "Item", "item_type": "personal"}, headers=headers).json()["id"]
    expense_id = client.post(
        f"/api/items/{item_id}/expenses", json=_expense_payload(), headers=headers
    ).json()["id"]

    with patch.object(main.urllib.request, "urlopen", side_effect=urllib.error.URLError("timed out")):
        r = client.post(f"/api/items/{item_id}/expenses/{expense_id}/recategorize", headers=headers)

    assert r.status_code == 200
    assert r.json()["ai_model"] == "rules-v1"
    assert r.json()["ai_category"] == "transporte"


def test_openai_down_during_summary_generation_falls_back_to_rules(client, auth_headers, monkeypatch):
    headers = auth_headers()
    monkeypatch.setattr(main, "OPENAI_API_KEY", "fake-key-for-test")

    item_id = client.post("/api/items", json={"name": "Item", "item_type": "personal"}, headers=headers).json()["id"]
    client.post(f"/api/items/{item_id}/expenses", json=_expense_payload(), headers=headers)

    with patch.object(main.urllib.request, "urlopen", side_effect=urllib.error.URLError("connection refused")):
        r = client.post(f"/api/items/{item_id}/summary/generate", headers=headers)

    assert r.status_code == 200
    assert r.json()["ai_model"] == "rules-v1"


# ---- OpenAI responde JSON malformado ----

class _FakeResponse:
    def __init__(self, body: bytes):
        self._body = body

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self):
        return self._body


def test_openai_malformed_json_falls_back_to_rules(client, auth_headers, monkeypatch):
    headers = auth_headers()
    monkeypatch.setattr(main, "OPENAI_API_KEY", "fake-key-for-test")

    item_id = client.post("/api/items", json={"name": "Item", "item_type": "personal"}, headers=headers).json()["id"]
    expense_id = client.post(
        f"/api/items/{item_id}/expenses", json=_expense_payload(), headers=headers
    ).json()["id"]

    malformed_openai_response = json.dumps({
        "choices": [{"message": {"content": "esto no es json valido {{{"}}]
    }).encode("utf-8")

    with patch.object(main.urllib.request, "urlopen", return_value=_FakeResponse(malformed_openai_response)):
        r = client.post(f"/api/items/{item_id}/expenses/{expense_id}/recategorize", headers=headers)

    assert r.status_code == 200
    assert r.json()["ai_model"] == "rules-v1"


# ---- Concurrencia: doble "crear siguiente mes" ----

def test_concurrent_next_month_does_not_create_duplicate_links(client, auth_headers):
    if main.IS_SQLITE:
        pytest.skip(
            "SELECT ... FOR UPDATE es no-op en SQLite (el motor de test); el lock de fila "
            "agregado en create_next_month_item solo es efectivo en Postgres (producción). "
            "Correr esta prueba contra Postgres para verificar el fix real."
        )

    headers = auth_headers()
    item_id = client.post(
        "/api/items", json={"name": "Agosto 2026", "item_type": "personal", "is_recurring": True}, headers=headers
    ).json()["id"]

    results = []

    def _call():
        c = TestClient(main.app)
        results.append(c.post(f"/api/items/{item_id}/next-month", headers=headers).status_code)

    threads = [threading.Thread(target=_call) for _ in range(2)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    successes = results.count(201)
    item = client.get(f"/api/items/{item_id}", headers=headers).json()

    assert successes >= 1, f"ninguna de las dos llamadas concurrentes tuvo éxito: {results}"
    if successes == 2:
        pytest.fail(
            f"race condition confirmada: las dos llamadas concurrentes crearon un siguiente mes cada una "
            f"(status codes: {results}), item.next_item_id solo puede apuntar a una: {item['next_item_id']}"
        )
