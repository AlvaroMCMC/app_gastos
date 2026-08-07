import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

_TEST_DB_FD, _TEST_DB_PATH = tempfile.mkstemp(suffix=".db", prefix="app_gastos_test_")
os.close(_TEST_DB_FD)

os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB_PATH}"
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["ENVIRONMENT"] = "development"
os.environ.setdefault("OPENAI_API_KEY", "")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from main import app, engine, seed_categories  # noqa: E402
from database import Base, SessionLocal  # noqa: E402


@pytest.fixture(autouse=True)
def _reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_categories(db)
    yield


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def auth_headers(client):
    def _make(email="user@test.com", password="pass1234", name="Test User"):
        client.post("/api/auth/register", json={"email": email, "password": password, "name": name})
        r = client.post("/api/auth/login", json={"email": email, "password": password})
        token = r.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    return _make
