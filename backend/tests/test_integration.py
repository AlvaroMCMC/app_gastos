def _expense_payload(**overrides):
    payload = {
        "amount": 50.0,
        "description": "Gasto de prueba",
        "payment_method": "banco",
        "currency": "soles",
    }
    payload.update(overrides)
    return payload


# ---- Auth ----

def test_register_and_login(client):
    r = client.post("/api/auth/register", json={"email": "a@test.com", "password": "pass1234", "name": "A"})
    assert r.status_code == 201

    r = client.post("/api/auth/login", json={"email": "a@test.com", "password": "pass1234"})
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_login_wrong_password_fails(client):
    client.post("/api/auth/register", json={"email": "a@test.com", "password": "pass1234", "name": "A"})
    r = client.post("/api/auth/login", json={"email": "a@test.com", "password": "wrong"})
    assert r.status_code == 401


def test_me_requires_token(client):
    r = client.get("/api/auth/me")
    assert r.status_code in (401, 403)


def test_me_returns_current_user(client, auth_headers):
    headers = auth_headers("a@test.com")
    r = client.get("/api/auth/me", headers=headers)
    assert r.status_code == 200
    assert r.json()["email"] == "a@test.com"


# ---- Items ----

def test_create_item(client, auth_headers):
    headers = auth_headers()
    r = client.post("/api/items", json={"name": "Viaje", "item_type": "personal"}, headers=headers)
    assert r.status_code == 201
    assert r.json()["item_type"] == "personal"
    assert r.json()["is_recurring"] is False


def test_add_registered_participant(client, auth_headers):
    owner = auth_headers("owner@test.com")
    auth_headers("partner@test.com")  # se registra
    item_id = client.post("/api/items", json={"name": "Compartido", "item_type": "shared"}, headers=owner).json()["id"]

    r = client.post(f"/api/items/{item_id}/participants", json={"email": "partner@test.com"}, headers=owner)
    assert r.status_code == 201
    assert r.json()["is_pending"] is False


def test_add_pending_participant_for_unregistered_email(client, auth_headers):
    owner = auth_headers("owner@test.com")
    item_id = client.post("/api/items", json={"name": "Compartido", "item_type": "shared"}, headers=owner).json()["id"]

    r = client.post(f"/api/items/{item_id}/participants", json={"email": "nobody@test.com"}, headers=owner)
    assert r.status_code == 201
    assert r.json()["is_pending"] is True


def test_budget_set_and_get(client, auth_headers):
    headers = auth_headers()
    item_id = client.post("/api/items", json={"name": "Item", "item_type": "personal"}, headers=headers).json()["id"]

    r = client.put(f"/api/items/{item_id}/budget", json={"budget_soles": 300, "budget_dolares": 0, "budget_reales": 0}, headers=headers)
    assert r.status_code == 200
    assert r.json()["budget_soles"] == 300


def test_archive_item(client, auth_headers):
    headers = auth_headers()
    item_id = client.post("/api/items", json={"name": "Item", "item_type": "personal"}, headers=headers).json()["id"]

    r = client.put(f"/api/items/{item_id}", json={"is_archived": True}, headers=headers)
    assert r.status_code == 200
    assert r.json()["is_archived"] is True


def test_delete_item_unlinks_chain(client, auth_headers):
    headers = auth_headers()
    a = client.post("/api/items", json={"name": "Agosto 2026", "item_type": "shared", "is_recurring": True}, headers=headers).json()
    b = client.post(f"/api/items/{a['id']}/next-month", headers=headers).json()

    r = client.delete(f"/api/items/{a['id']}", headers=headers)
    assert r.status_code == 204

    r = client.get(f"/api/items/{b['id']}", headers=headers)
    assert r.json()["previous_item_id"] is None


# ---- Expenses & permissions ----

def test_create_and_list_expense(client, auth_headers):
    headers = auth_headers()
    item_id = client.post("/api/items", json={"name": "Item", "item_type": "personal"}, headers=headers).json()["id"]

    r = client.post(f"/api/items/{item_id}/expenses", json=_expense_payload(), headers=headers)
    assert r.status_code == 201

    r = client.get(f"/api/items/{item_id}/expenses", headers=headers)
    assert len(r.json()) == 1


def test_non_participant_cannot_access_item(client, auth_headers):
    owner = auth_headers("owner@test.com")
    stranger = auth_headers("stranger@test.com")
    item_id = client.post("/api/items", json={"name": "Item", "item_type": "personal"}, headers=owner).json()["id"]

    r = client.get(f"/api/items/{item_id}", headers=stranger)
    assert r.status_code == 403

    r = client.post(f"/api/items/{item_id}/expenses", json=_expense_payload(), headers=stranger)
    assert r.status_code == 403


def test_toggle_expense_settled(client, auth_headers):
    headers = auth_headers()
    item_id = client.post("/api/items", json={"name": "Item", "item_type": "personal"}, headers=headers).json()["id"]
    expense_id = client.post(f"/api/items/{item_id}/expenses", json=_expense_payload(), headers=headers).json()["id"]

    r = client.patch(f"/api/items/{item_id}/expenses/{expense_id}/settled", headers=headers)
    assert r.status_code == 200
    assert r.json()["is_settled"] is True


# ---- Cadena mensual (next-month) ----

def test_next_month_full_flow(client, auth_headers):
    owner = auth_headers("owner@test.com")
    auth_headers("partner@test.com")
    item_id = client.post(
        "/api/items", json={"name": "Agosto 2026 (pareja)", "item_type": "shared", "is_recurring": True}, headers=owner
    ).json()["id"]

    client.post(f"/api/items/{item_id}/participants", json={"email": "partner@test.com"}, headers=owner)
    client.put(f"/api/items/{item_id}/budget", json={"budget_soles": 500, "budget_dolares": 0, "budget_reales": 0}, headers=owner)
    client.post(
        f"/api/items/{item_id}/expenses",
        json=_expense_payload(is_installment=True, installment_number=1, installment_total=3),
        headers=owner
    )

    r = client.post(f"/api/items/{item_id}/next-month", headers=owner)
    assert r.status_code == 201
    next_item = r.json()
    assert next_item["name"] == "Setiembre 2026 (pareja)"
    assert next_item["previous_item_id"] == item_id

    participants = client.get(f"/api/items/{next_item['id']}/participants", headers=owner).json()
    assert {p["email"] for p in participants} == {"owner@test.com", "partner@test.com"}

    budget = client.get(f"/api/items/{next_item['id']}/budget", headers=owner).json()
    assert budget["budget_soles"] == 500

    expenses = client.get(f"/api/items/{next_item['id']}/expenses", headers=owner).json()
    assert len(expenses) == 1
    assert expenses[0]["installment_number"] == 2


def test_next_month_blocks_second_call(client, auth_headers):
    headers = auth_headers()
    item_id = client.post("/api/items", json={"name": "Agosto 2026", "item_type": "personal", "is_recurring": True}, headers=headers).json()["id"]

    assert client.post(f"/api/items/{item_id}/next-month", headers=headers).status_code == 201
    assert client.post(f"/api/items/{item_id}/next-month", headers=headers).status_code == 400


def test_next_month_blocks_non_recurring_item(client, auth_headers):
    headers = auth_headers()
    item_id = client.post("/api/items", json={"name": "Argentina", "item_type": "shared"}, headers=headers).json()["id"]

    r = client.post(f"/api/items/{item_id}/next-month", headers=headers)
    assert r.status_code == 400


# ---- Categorías ----

def test_categories_seeded_with_otros_default(client, auth_headers):
    headers = auth_headers()
    r = client.get("/api/categories", headers=headers)
    categories = r.json()
    assert len(categories) == 15
    otros = next(c for c in categories if c["name"] == "otros")
    assert otros["is_default"] is True


def test_create_category_classifies_by_keyword(client, auth_headers):
    headers = auth_headers()
    item_id = client.post("/api/items", json={"name": "Item", "item_type": "personal"}, headers=headers).json()["id"]

    client.post("/api/categories", json={"name": "Mascotas", "keywords": "ornitorrincoshop"}, headers=headers)

    r = client.post(
        f"/api/items/{item_id}/expenses",
        json=_expense_payload(description="Compra en ornitorrincoshop"),
        headers=headers
    )
    assert r.json()["ai_category"] == "mascotas"


def test_rename_category_cascades_to_expenses(client, auth_headers):
    headers = auth_headers()
    item_id = client.post("/api/items", json={"name": "Item", "item_type": "personal"}, headers=headers).json()["id"]
    category_id = client.post("/api/categories", json={"name": "Vieja", "keywords": "tomate"}, headers=headers).json()["id"]
    expense_id = client.post(
        f"/api/items/{item_id}/expenses", json=_expense_payload(description="tomate"), headers=headers
    ).json()["id"]

    client.put(f"/api/categories/{category_id}", json={"name": "Nueva"}, headers=headers)

    expenses = client.get(f"/api/items/{item_id}/expenses", headers=headers).json()
    expense = next(e for e in expenses if e["id"] == expense_id)
    assert expense["ai_category"] == "nueva"


def test_delete_category_reassigns_to_otros(client, auth_headers):
    headers = auth_headers()
    item_id = client.post("/api/items", json={"name": "Item", "item_type": "personal"}, headers=headers).json()["id"]
    category_id = client.post("/api/categories", json={"name": "Temporal", "keywords": "unico"}, headers=headers).json()["id"]
    expense_id = client.post(
        f"/api/items/{item_id}/expenses", json=_expense_payload(description="unico"), headers=headers
    ).json()["id"]

    r = client.delete(f"/api/categories/{category_id}", headers=headers)
    assert r.status_code == 204

    expenses = client.get(f"/api/items/{item_id}/expenses", headers=headers).json()
    expense = next(e for e in expenses if e["id"] == expense_id)
    assert expense["ai_category"] == "otros"


def test_default_category_cannot_be_renamed_or_deleted(client, auth_headers):
    headers = auth_headers()
    otros = next(c for c in client.get("/api/categories", headers=headers).json() if c["name"] == "otros")

    assert client.put(f"/api/categories/{otros['id']}", json={"name": "cambio"}, headers=headers).status_code == 400
    assert client.delete(f"/api/categories/{otros['id']}", headers=headers).status_code == 400


# ---- Resumen (sin OPENAI_API_KEY -> usa reglas) ----

def test_generate_summary_without_openai_uses_rules(client, auth_headers):
    headers = auth_headers()
    item_id = client.post("/api/items", json={"name": "Item", "item_type": "personal"}, headers=headers).json()["id"]
    client.post(f"/api/items/{item_id}/expenses", json=_expense_payload(description="Uber al trabajo"), headers=headers)

    r = client.post(f"/api/items/{item_id}/summary/generate", headers=headers)
    assert r.status_code == 200
    assert r.json()["ai_model"] == "rules-v1"


def test_recategorize_without_openai_uses_rules(client, auth_headers):
    headers = auth_headers()
    item_id = client.post("/api/items", json={"name": "Item", "item_type": "personal"}, headers=headers).json()["id"]
    expense_id = client.post(
        f"/api/items/{item_id}/expenses", json=_expense_payload(description="Uber al trabajo"), headers=headers
    ).json()["id"]

    r = client.post(f"/api/items/{item_id}/expenses/{expense_id}/recategorize", headers=headers)
    assert r.status_code == 200
    assert r.json()["ai_category"] == "transporte"
    assert r.json()["ai_model"] == "rules-v1"
