from datetime import date, timedelta

from main import count_periodic_occurrences


def _expense_payload(**overrides):
    payload = {
        "amount": 100.0,
        "description": "Gasto",
        "payment_method": "banco",
        "currency": "soles",
    }
    payload.update(overrides)
    return payload


# ---- count_periodic_occurrences (unit) ----

def test_periodic_occurrences_same_month():
    assert count_periodic_occurrences(date(2026, 8, 1), 1, date(2026, 8, 15)) == 1


def test_periodic_occurrences_multiple_months():
    assert count_periodic_occurrences(date(2026, 5, 1), 1, date(2026, 8, 7)) == 4


def test_periodic_occurrences_before_start_returns_zero():
    assert count_periodic_occurrences(date(2026, 9, 1), 1, date(2026, 8, 7)) == 0


def test_periodic_occurrences_clamps_short_months():
    # dia 31 solicitado: enero 31 (ok), febrero clampeado a 28 (2026 no es bisiesto),
    # marzo 31 cae despues del limite (2026-03-01) -> solo 2 ocurrencias
    assert count_periodic_occurrences(date(2026, 1, 31), 31, date(2026, 3, 1)) == 2


def test_periodic_occurrences_respects_end_date():
    count_full = count_periodic_occurrences(date(2026, 1, 1), 1, date(2026, 8, 7))
    count_cut = count_periodic_occurrences(date(2026, 1, 1), 1, date(2026, 8, 7), end=date(2026, 3, 15))
    assert count_cut < count_full
    assert count_cut == 3  # ene, feb, mar


def test_periodic_occurrences_counts_creation_month_even_if_day_already_passed():
    # Regresión: crear el ingreso el dia 7 con day_of_month=1 debe contar
    # el mes de creación (agosto) inmediatamente, no esperar a septiembre.
    assert count_periodic_occurrences(date(2026, 8, 7), 1, date(2026, 8, 7)) == 1


def test_periodic_occurrences_not_yet_this_month():
    today = date(2026, 8, 7)
    future_day_this_month = 20
    count = count_periodic_occurrences(date(2026, 1, 20), future_day_this_month, today)
    assert count == 7  # ene..jul, agosto aun no llega al dia 20


# ---- API: ingresos ----

def test_create_periodic_income_requires_day_of_month(client, auth_headers):
    headers = auth_headers()
    r = client.post("/api/capital/incomes", json={"income_type": "periodic", "amount": 100, "currency": "soles"}, headers=headers)
    assert r.status_code == 400


def test_create_periodic_income_today_contributes_immediately(client, auth_headers):
    """Regresión del caso reportado: crear un ingreso periódico hoy, con day_of_month
    ya pasado dentro del mes actual, debe reflejarse de inmediato en el capital."""
    headers = auth_headers()
    r = client.post("/api/capital/incomes", json={
        "income_type": "periodic", "amount": 7000, "currency": "soles", "day_of_month": 1
    }, headers=headers)
    assert r.status_code == 201

    capital = client.get("/api/capital", headers=headers).json()["by_currency"]
    assert capital.get("soles", 0) == 7000


def test_create_one_time_income_contributes_immediately(client, auth_headers):
    headers = auth_headers()
    client.post("/api/capital/incomes", json={"income_type": "one_time", "amount": 500, "currency": "soles"}, headers=headers)

    r = client.get("/api/capital", headers=headers)
    assert r.json()["by_currency"]["soles"] == 500


def test_cancel_periodic_income_stops_future_growth(client, auth_headers):
    headers = auth_headers()
    old_date = (date.today().replace(day=1) - timedelta(days=200)).isoformat()
    income = client.post("/api/capital/incomes", json={
        "income_type": "periodic", "amount": 100, "currency": "soles", "day_of_month": 1, "date": old_date
    }, headers=headers).json()

    before = client.get("/api/capital", headers=headers).json()["by_currency"]["soles"]
    assert before > 0

    r = client.put(f"/api/capital/incomes/{income['id']}", json={"end_date": old_date}, headers=headers)
    assert r.status_code == 200

    after = client.get("/api/capital", headers=headers).json()["by_currency"]["soles"]
    assert after < before


def test_delete_one_time_income(client, auth_headers):
    headers = auth_headers()
    income = client.post("/api/capital/incomes", json={"income_type": "one_time", "amount": 200, "currency": "soles"}, headers=headers).json()

    r = client.delete(f"/api/capital/incomes/{income['id']}", headers=headers)
    assert r.status_code == 204

    capital = client.get("/api/capital", headers=headers).json()
    assert capital["by_currency"].get("soles", 0) == 0


def test_income_from_other_user_not_accessible(client, auth_headers):
    a = auth_headers("a@test.com")
    b = auth_headers("b@test.com")
    income = client.post("/api/capital/incomes", json={"income_type": "one_time", "amount": 100, "currency": "soles"}, headers=a).json()

    r = client.delete(f"/api/capital/incomes/{income['id']}", headers=b)
    assert r.status_code == 404


# ---- API: impacto de gastos en el capital (patrimonio) ----

def test_personal_expense_reduces_capital_fully(client, auth_headers):
    headers = auth_headers()
    client.post("/api/capital/incomes", json={"income_type": "one_time", "amount": 1000, "currency": "soles"}, headers=headers)
    item_id = client.post("/api/items", json={"name": "Item", "item_type": "personal"}, headers=headers).json()["id"]
    client.post(f"/api/items/{item_id}/expenses", json=_expense_payload(amount=100), headers=headers)

    r = client.get("/api/capital", headers=headers)
    assert r.json()["by_currency"]["soles"] == 900


def test_divided_expense_only_reduces_capital_by_share(client, auth_headers):
    owner = auth_headers("owner@test.com")
    partner = auth_headers("partner@test.com")
    client.post("/api/capital/incomes", json={"income_type": "one_time", "amount": 1000, "currency": "soles"}, headers=owner)

    item_id = client.post("/api/items", json={"name": "Compartido", "item_type": "shared"}, headers=owner).json()["id"]
    client.post(f"/api/items/{item_id}/participants", json={"email": "partner@test.com"}, headers=owner)
    client.post(f"/api/items/{item_id}/expenses", json=_expense_payload(amount=100, split_type="divided"), headers=owner)

    owner_capital = client.get("/api/capital", headers=owner).json()["by_currency"]["soles"]
    partner_capital = client.get("/api/capital", headers=partner).json()["by_currency"].get("soles", 0)

    assert owner_capital == 950  # 1000 - 50 (su mitad)
    assert partner_capital == -50  # debe su mitad, aunque no pago nada


def test_capital_response_shows_owed_to_me_and_i_owe_breakdown(client, auth_headers):
    owner = auth_headers("owner@test.com")
    partner = auth_headers("partner@test.com")
    item_id = client.post("/api/items", json={"name": "Compartido", "item_type": "shared"}, headers=owner).json()["id"]
    client.post(f"/api/items/{item_id}/participants", json={"email": "partner@test.com"}, headers=owner)
    client.post(f"/api/items/{item_id}/expenses", json=_expense_payload(amount=100, split_type="divided"), headers=owner)

    owner_capital = client.get("/api/capital", headers=owner).json()
    partner_capital = client.get("/api/capital", headers=partner).json()

    assert owner_capital["owed_to_me"]["soles"] == 50
    assert owner_capital["i_owe"] == {}
    assert partner_capital["i_owe"]["soles"] == 50
    assert partner_capital["owed_to_me"] == {}


def test_settled_expense_does_not_count_as_pending_debt(client, auth_headers):
    owner = auth_headers("owner@test.com")
    auth_headers("partner@test.com")
    item_id = client.post("/api/items", json={"name": "Compartido", "item_type": "shared"}, headers=owner).json()["id"]
    client.post(f"/api/items/{item_id}/participants", json={"email": "partner@test.com"}, headers=owner)
    expense_id = client.post(
        f"/api/items/{item_id}/expenses", json=_expense_payload(amount=100, split_type="divided"), headers=owner
    ).json()["id"]
    client.patch(f"/api/items/{item_id}/expenses/{expense_id}/settled", headers=owner)

    owner_capital = client.get("/api/capital", headers=owner).json()
    assert owner_capital["owed_to_me"] == {}
    assert owner_capital["by_currency"]["soles"] == -50  # el capital neto no cambia por saldar


def test_archived_item_excludes_debts_but_keeps_capital_share(client, auth_headers):
    owner = auth_headers("owner@test.com")
    partner = auth_headers("partner@test.com")
    item_id = client.post("/api/items", json={"name": "Compartido", "item_type": "shared"}, headers=owner).json()["id"]
    client.post(f"/api/items/{item_id}/participants", json={"email": "partner@test.com"}, headers=owner)
    client.post(f"/api/items/{item_id}/expenses", json=_expense_payload(amount=100, split_type="divided"), headers=owner)

    client.put(f"/api/items/{item_id}", json={"is_archived": True}, headers=owner)

    owner_capital = client.get("/api/capital", headers=owner).json()
    assert owner_capital["owed_to_me"] == {}
    assert owner_capital["by_currency"]["soles"] == -50  # su parte del gasto sigue contando

    partner_capital = client.get("/api/capital", headers=partner).json()
    assert partner_capital["i_owe"] == {}
    assert partner_capital["by_currency"]["soles"] == -50  # su parte sigue contando


def test_assigned_expense_only_affects_assigned_user(client, auth_headers):
    owner = auth_headers("owner@test.com")
    partner = auth_headers("partner@test.com")
    item_id = client.post("/api/items", json={"name": "Compartido", "item_type": "shared"}, headers=owner).json()["id"]
    client.post(f"/api/items/{item_id}/participants", json={"email": "partner@test.com"}, headers=owner)
    participants = client.get(f"/api/items/{item_id}/participants", headers=owner).json()
    partner_id = next(p["id"] for p in participants if p["email"] == "partner@test.com")

    client.post(f"/api/items/{item_id}/expenses", json=_expense_payload(
        amount=80, split_type="assigned", assigned_to=partner_id
    ), headers=owner)

    owner_capital = client.get("/api/capital", headers=owner).json()["by_currency"].get("soles", 0)
    partner_capital = client.get("/api/capital", headers=partner).json()["by_currency"].get("soles", 0)

    assert owner_capital == 0  # el owner pago pero no le corresponde nada
    assert partner_capital == -80  # a la persona asignada le corresponde el 100%
