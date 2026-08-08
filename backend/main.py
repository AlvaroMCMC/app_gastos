from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import or_, text
from datetime import timedelta, datetime, date
import calendar
from typing import List, Dict, Optional
import os
import json
import re
import requests

from database import engine, get_db, Base, DATABASE_URL, SessionLocal
from models import User, Item, Expense, PendingInvitation, UserItemBudget, ItemSummary, Category, UserIncome
from schemas import (
    UserCreate, UserLogin, UserResponse, Token,
    ItemCreate, ItemUpdate, ItemResponse,
    ExpenseCreate, ExpenseUpdate, ExpenseResponse, ExpenseCategoryUpdate,
    ItemParticipantAdd,
    UserItemBudgetUpdate, UserItemBudgetResponse,
    ItemSummaryResponse,
    CategoryCreate, CategoryUpdate, CategoryResponse,
    UserIncomeCreate, UserIncomeUpdate, UserIncomeResponse, CapitalResponse
)
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES
)

# Crear tablas
Base.metadata.create_all(bind=engine)

IS_SQLITE = DATABASE_URL.startswith("sqlite")
ALLOW_DESTRUCTIVE_MIGRATIONS = os.getenv("ALLOW_DESTRUCTIVE_MIGRATIONS", "false").lower() == "true"

SUMMARY_CATEGORIES = [
    "alimentacion",
    "supermercado",
    "transporte",
    "hogar",
    "salud",
    "entretenimiento",
    "suscripcion streaming",
    "ropa",
    "tecnologia",
    "gatas",
    "ahorro",
    "servicios",
    "educacion",
    "viajes",
    "otros",
]

RULE_CATEGORY_KEYWORDS = {
    "supermercado": ["vea", "mass", "plaza vea", "mercado", "supermercado", "wong", "metro", "tottus", "vivanda"],
    "suscripcion streaming": ["spotify", "netflix", "prime", "amazon prime", "hbo", "disney+", "streaming"],
    "gatas": ["gatas", "gata", "arena", "veterinaria", "comida gato", "comida para gato", "cat food", "petshop"],
    "tecnologia": ["iphone", "celular", "laptop", "tablet", "tecnologia", "audifonos", "smartwatch", "monitor"],
    "ahorro": ["junta", "ahorro"],
    "alimentacion": ["comida", "restaurante", "almuerzo", "cena", "desayuno", "delivery", "snack", "cafe", "huevos", "tuberculos"],
    "transporte": ["uber", "taxi", "bus", "metropolitano", "pasaje", "gasolina", "peaje", "estacionamiento", "movilidad"],
    "hogar": ["alquiler", "renta", "mantenimiento", "limpieza", "mueble", "electrodomestico", "hogar"],
    "salud": ["farmacia", "medicina", "doctor", "clinica", "salud", "seguro", "dentista"],
    "entretenimiento": ["cine", "juego", "fiesta", "bar", "entretenimiento", "salida"],
    "ropa": ["ropa", "zapato", "zapatilla", "camisa", "pantalon", "polera", "vestido"],
    "servicios": ["luz", "agua", "internet", "telefono", "servicio", "suscripcion"],
    "educacion": ["curso", "universidad", "colegio", "libro", "educacion", "capacitacion"],
    "viajes": ["hotel", "vuelo", "pasaje aereo", "viaje", "airbnb", "equipaje", "turismo"],
}

def column_exists(conn, table, column):
    """Verifica si una columna existe — compatible con SQLite y PostgreSQL."""
    if IS_SQLITE:
        result = conn.execute(text(f"PRAGMA table_info({table})"))
        return any(row[1] == column for row in result.fetchall())
    else:
        result = conn.execute(text(
            f"SELECT column_name FROM information_schema.columns "
            f"WHERE table_name='{table}' AND column_name='{column}'"
        ))
        return result.fetchone() is not None

# Migraciones destructivas (DROP COLUMN) deshabilitadas por defecto para proteger datos.
if ALLOW_DESTRUCTIVE_MIGRATIONS:
    # Migración: Eliminar columnas budget de items (ahora es personal por usuario)
    try:
        with engine.connect() as conn:
            if column_exists(conn, 'items', 'budget'):
                print("Migrando: Eliminando columnas 'budget' de items...")
                conn.execute(text("ALTER TABLE items DROP COLUMN budget"))
                conn.execute(text("ALTER TABLE items DROP COLUMN budget_currency"))
                conn.commit()
    except Exception as e:
        print(f"Migracion budget: {e}")

# Migración: Agregar ON DELETE CASCADE al FK de user_item_budgets (solo PostgreSQL)
if not IS_SQLITE:
    try:
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT constraint_name
                FROM information_schema.table_constraints
                WHERE table_name='user_item_budgets'
                AND constraint_type='FOREIGN KEY'
                AND constraint_name LIKE '%item_id%'
            """))
            constraint = result.fetchone()
            if constraint:
                constraint_name = constraint[0]
                cascade_check = conn.execute(text(f"""
                    SELECT delete_rule
                    FROM information_schema.referential_constraints
                    WHERE constraint_name='{constraint_name}'
                """))
                rule = cascade_check.fetchone()
                if rule and rule[0] != 'CASCADE':
                    conn.execute(text(f"ALTER TABLE user_item_budgets DROP CONSTRAINT {constraint_name}"))
                    conn.execute(text("""
                        ALTER TABLE user_item_budgets
                        ADD CONSTRAINT user_item_budgets_item_id_fkey
                        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
                    """))
                    conn.commit()
    except Exception as e:
        print(f"Migracion cascade: {e}")

# Migración: Agregar columnas de cuotas y saldado a expenses
try:
    with engine.connect() as conn:
        new_expense_cols = [
            ("is_installment",       "BOOLEAN DEFAULT FALSE"),
            ("installment_number",   "INTEGER"),
            ("installment_total",    "INTEGER"),
            ("installment_group_id", "VARCHAR"),
            ("is_recurring",         "BOOLEAN DEFAULT FALSE"),
            ("is_settled",           "BOOLEAN DEFAULT FALSE"),
            ("ai_category",          "VARCHAR"),
            ("ai_confidence",        "FLOAT"),
            ("ai_model",             "VARCHAR"),
            ("ai_classified_at",     "TIMESTAMP"),
        ]
        for col_name, col_def in new_expense_cols:
            if not column_exists(conn, 'expenses', col_name):
                print(f"Migrando: Agregando columna '{col_name}' a expenses...")
                conn.execute(text(f"ALTER TABLE expenses ADD COLUMN {col_name} {col_def}"))
        conn.commit()
except Exception as e:
    print(f"Migracion expenses: {e}")

# Migración: Agregar columnas de items mensuales conectados
try:
    with engine.connect() as conn:
        new_item_cols = [
            ("is_recurring",      "BOOLEAN DEFAULT FALSE"),
            ("previous_item_id",  "VARCHAR"),
            ("next_item_id",      "VARCHAR"),
        ]
        for col_name, col_def in new_item_cols:
            if not column_exists(conn, 'items', col_name):
                print(f"Migrando: Agregando columna '{col_name}' a items...")
                conn.execute(text(f"ALTER TABLE items ADD COLUMN {col_name} {col_def}"))
        conn.commit()
except Exception as e:
    print(f"Migracion items: {e}")

def seed_categories(db: Session):
    """Crea las categorías iniciales si la tabla está vacía. Idempotente."""
    if db.query(Category).count() == 0:
        print("Seed: creando categorías iniciales...")
        for position, name in enumerate(SUMMARY_CATEGORIES):
            keywords = RULE_CATEGORY_KEYWORDS.get(name)
            db.add(Category(
                name=name,
                keywords=",".join(keywords) if keywords else None,
                position=position,
                is_default=(name == "otros")
            ))
        db.commit()

try:
    with SessionLocal() as seed_db:
        seed_categories(seed_db)
except Exception as e:
    print(f"Seed categorias: {e}")

def get_category_names(db: Session) -> List[str]:
    return [c.name for c in db.query(Category).order_by(Category.position).all()]

def validate_category(category: str, db: Session) -> str:
    normalized = (category or "").strip().lower()
    return normalized if normalized in get_category_names(db) else "otros"

def classify_expense_with_rules(description: str, db: Session) -> str:
    text_value = (description or "").strip().lower()
    if not text_value:
        return "otros"
    for category in db.query(Category).order_by(Category.position).all():
        if not category.keywords:
            continue
        keywords = [k.strip() for k in category.keywords.split(",") if k.strip()]
        if any(keyword in text_value for keyword in keywords):
            return category.name
    return "otros"

def ensure_item_access(item_id: str, current_user: User, db: Session) -> Item:
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.owner_id != current_user.id and current_user not in item.participants:
        raise HTTPException(status_code=403, detail="Not authorized to access this item")
    return item

# ============= PERSONAL CAPITAL =============

_exchange_rate_cache = {"date": None, "rates": None}

def get_exchange_rates_to_pen() -> Dict[str, float]:
    """Devuelve cuántos soles equivalen a 1 dólar y 1 real, cacheado por día.
    Fuente: open.er-api.com (gratis, sin API key)."""
    today = date.today()
    if _exchange_rate_cache["date"] == today and _exchange_rate_cache["rates"]:
        return _exchange_rate_cache["rates"]

    try:
        response = requests.get("https://open.er-api.com/v6/latest/USD", timeout=5)
        response.raise_for_status()
        data = response.json()
        usd_to_pen = data["rates"]["PEN"]
        usd_to_brl = data["rates"]["BRL"]
        rates = {
            "dolares": usd_to_pen,
            "reales": usd_to_pen / usd_to_brl,
        }
        _exchange_rate_cache["date"] = today
        _exchange_rate_cache["rates"] = rates
        return rates
    except Exception:
        if _exchange_rate_cache["rates"]:
            return _exchange_rate_cache["rates"]
        raise HTTPException(status_code=503, detail="No se pudo obtener el tipo de cambio")

def convert_currency_dict(amounts: Dict[str, float], target: str, rates: Dict[str, float]) -> Dict[str, float]:
    """Convierte todos los montos de `amounts` a la moneda `target` ('soles' o 'dolares')."""
    if not amounts:
        return {}
    total = 0.0
    for currency, amount in amounts.items():
        if currency == target:
            total += amount
        elif currency == "soles":
            total += amount / rates["dolares"] if target == "dolares" else amount
        else:
            in_pen = amount * rates.get(currency, 1.0)
            total += in_pen if target == "soles" else in_pen / rates["dolares"]
    return {target: round(total, 2)}

def count_periodic_occurrences(start: date, day_of_month: int, until: date, end: date = None) -> int:
    """Cuenta cuántas veces ocurrió `day_of_month` entre `start` y `until` (inclusive),
    cortando en `end` si se dio (ingreso periódico cancelado). El mes en que se creó el
    ingreso siempre cuenta completo, sin importar qué día de ese mes se haya registrado."""
    effective_until = min(until, end) if end else until
    effective_start = date(start.year, start.month, 1)
    if effective_start > effective_until:
        return 0

    count = 0
    year, month = effective_start.year, effective_start.month
    while (year, month) <= (effective_until.year, effective_until.month):
        last_day = calendar.monthrange(year, month)[1]
        occurrence_day = min(day_of_month, last_day)
        occurrence_date = date(year, month, occurrence_day)
        if effective_start <= occurrence_date <= effective_until:
            count += 1
        if month == 12:
            year, month = year + 1, 1
        else:
            month += 1
    return count

def calculate_user_expense_share(expense: Expense, user_id: str, item: Item, participant_count: int) -> float:
    """Cuánto de este gasto le corresponde realmente a `user_id`, sin importar quién pagó.
    Mismo criterio que calculateTotalsByCurrency (frontend/src/pages/Expenses.jsx:609-635)."""
    if item.item_type == "personal":
        return expense.amount if item.owner_id == user_id else 0.0

    if expense.split_type == "assigned":
        return expense.amount if expense.assigned_to == user_id else 0.0
    elif expense.split_type == "divided":
        if participant_count <= 0:
            return 0.0
        return expense.amount / participant_count
    elif expense.split_type == "selected":
        selected_ids = expense.selected_participants.split(",") if expense.selected_participants else []
        if user_id in selected_ids and len(selected_ids) > 0:
            return expense.amount / len(selected_ids)
        return 0.0
    return 0.0

def get_user_capital(user_id: str, db: Session) -> Dict:
    by_currency: Dict[str, float] = {}
    owed_to_me: Dict[str, float] = {}
    i_owe: Dict[str, float] = {}
    income_details: List[Dict] = []
    item_details: List[Dict] = []
    today = datetime.utcnow().date()

    incomes = db.query(UserIncome).filter(UserIncome.user_id == user_id).all()
    for income in incomes:
        by_currency.setdefault(income.currency, 0.0)
        if income.income_type == "periodic" and income.day_of_month:
            occurrences = count_periodic_occurrences(
                income.date.date(), income.day_of_month, today,
                income.end_date.date() if income.end_date else None
            )
            contributed = income.amount * occurrences
        else:
            occurrences = 1
            contributed = income.amount
        by_currency[income.currency] += contributed
        income_details.append({
            "id": income.id,
            "description": income.description,
            "income_type": income.income_type,
            "currency": income.currency,
            "base_amount": round(income.amount, 2),
            "occurrences": occurrences,
            "contributed_amount": round(contributed, 2),
        })

    items = db.query(Item).filter(
        or_(
            Item.owner_id == user_id,
            Item.participants.any(User.id == user_id)
        )
    ).all()

    for item in items:
        # Los items archivados quedan fuera del presupuesto vigente: sus gastos ya
        # fueron absorbidos por el capital inicial registrado como ingreso puntual.
        if item.is_archived:
            continue

        participant_count = 1 + len({p.id for p in item.participants})
        pending_count = db.query(PendingInvitation).filter(PendingInvitation.item_id == item.id).count()
        participant_count += pending_count

        item_amounts: Dict[str, float] = {}
        expense_count = 0
        for expense in item.expenses:
            share = calculate_user_expense_share(expense, user_id, item, participant_count)
            if share:
                by_currency.setdefault(expense.currency, 0.0)
                by_currency[expense.currency] -= share
                item_amounts.setdefault(expense.currency, 0.0)
                item_amounts[expense.currency] += share
                expense_count += 1

            # Deudas pendientes (informativas, ya reflejadas en by_currency vía "share"):
            # lo que otros me deben cuando yo pagué de más, o lo que debo cuando pagó otro.
            if item.item_type == "shared" and not expense.is_settled:
                if expense.paid_by == user_id and share < expense.amount:
                    owed_to_me.setdefault(expense.currency, 0.0)
                    owed_to_me[expense.currency] += expense.amount - share
                elif expense.paid_by != user_id and share > 0:
                    i_owe.setdefault(expense.currency, 0.0)
                    i_owe[expense.currency] += share

        if item_amounts:
            item_details.append({
                "item_id": item.id,
                "item_name": item.name,
                "item_type": item.item_type,
                "role": "owner" if item.owner_id == user_id else "participant",
                "expense_count": expense_count,
                "amounts": {c: round(a, 2) for c, a in item_amounts.items()},
            })

    return {
        "by_currency": {c: round(a, 2) for c, a in by_currency.items()},
        "owed_to_me": {c: round(a, 2) for c, a in owed_to_me.items()},
        "i_owe": {c: round(a, 2) for c, a in i_owe.items()},
        "detail": {
            "incomes": income_details,
            "items": item_details,
        },
    }

def build_summary_payload(expenses: List[Expense], db: Session) -> Dict[str, List[Dict[str, float]]]:
    grouped: Dict[str, Dict[str, Dict[str, float]]] = {}
    for expense in expenses:
        currency = expense.currency or "soles"
        category = validate_category(expense.ai_category, db)
        grouped.setdefault(currency, {})
        grouped[currency].setdefault(category, {"total_amount": 0.0, "expense_count": 0})
        grouped[currency][category]["total_amount"] += float(expense.amount)
        grouped[currency][category]["expense_count"] += 1

    result: Dict[str, List[Dict[str, float]]] = {}
    for currency, stats in grouped.items():
        result[currency] = [
            {
                "category": category,
                "total_amount": round(values["total_amount"], 2),
                "expense_count": int(values["expense_count"])
            }
            for category, values in sorted(
                stats.items(),
                key=lambda item: item[1]["total_amount"],
                reverse=True
            )
        ]
    return result

def sync_summary_snapshot(item_id: str, current_user: User, expenses: List[Expense], db: Session) -> ItemSummary:
    categories_by_currency = build_summary_payload(expenses, db)
    categories_json = json.dumps(categories_by_currency, ensure_ascii=False)
    now = datetime.utcnow()

    summary = db.query(ItemSummary).filter(ItemSummary.item_id == item_id).first()
    if not summary:
        summary = ItemSummary(
            item_id=item_id,
            generated_by=current_user.id
        )
        db.add(summary)

    summary.generated_by = current_user.id
    summary.ai_model = "rules-v1"
    summary.categories_json = categories_json
    summary.expenses_processed = len(expenses)
    summary.generated_at = now
    summary.updated_at = now
    return summary

app = FastAPI(title="App Gastos API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============= AUTH ENDPOINTS =============

@app.post("/api/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user: UserCreate, db: Session = Depends(get_db)):
    # Verificar si el usuario ya existe
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Crear nuevo usuario
    hashed_password = get_password_hash(user.password)
    new_user = User(
        email=user.email,
        hashed_password=hashed_password,
        name=user.name
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Verificar si hay invitaciones pendientes para este email
    pending_invitations = db.query(PendingInvitation).filter(
        PendingInvitation.email == user.email
    ).all()

    # Agregar el usuario a los items con invitaciones pendientes
    for invitation in pending_invitations:
        item = db.query(Item).filter(Item.id == invitation.item_id).first()
        if item and new_user not in item.participants:
            item.participants.append(new_user)

        # Eliminar la invitación pendiente
        db.delete(invitation)

    db.commit()

    return new_user

@app.post("/api/auth/login", response_model=Token)
def login(user: UserLogin, db: Session = Depends(get_db)):
    # Verificar usuario
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Crear token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@app.get("/api/users", response_model=List[UserResponse])
def get_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    users = db.query(User).all()
    return users

# ============= ITEMS ENDPOINTS =============

@app.get("/api/items", response_model=List[ItemResponse])
def get_items(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Obtener items donde el usuario es owner O es participante
    items = db.query(Item).filter(
        or_(
            Item.owner_id == current_user.id,
            Item.participants.any(User.id == current_user.id)
        )
    ).order_by(Item.created_at.desc()).all()

    # Agregar owner_email a cada item
    result = []
    for item in items:
        item_dict = {
            "id": item.id,
            "name": item.name,
            "item_type": item.item_type,
            "owner_id": item.owner_id,
            "owner_email": item.owner.email if item.owner else None,
            "is_archived": item.is_archived,
            "is_recurring": item.is_recurring,
            "previous_item_id": item.previous_item_id,
            "next_item_id": item.next_item_id,
            "created_at": item.created_at
        }
        result.append(item_dict)

    return result

@app.post("/api/items", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(
    item: ItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_item = Item(
        name=item.name,
        item_type=item.item_type,
        owner_id=current_user.id,
        is_recurring=item.is_recurring
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@app.get("/api/items/{item_id}", response_model=ItemResponse)
def get_item(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Verificar que el usuario sea owner o participante
    if item.owner_id != current_user.id and current_user not in item.participants:
        raise HTTPException(status_code=403, detail="Not authorized to access this item")

    return item

@app.put("/api/items/{item_id}", response_model=ItemResponse)
def update_item(
    item_id: str,
    item_update: ItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Para archivar, permitir tanto al owner como a los participantes
    if item_update.is_archived is not None:
        # Verificar que el usuario sea owner o participante
        if item.owner_id != current_user.id and current_user not in item.participants:
            raise HTTPException(status_code=403, detail="Not authorized to update this item")
    else:
        # Para otros cambios, solo el owner
        if item.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Only the owner can update this item")

    if item_update.name is not None:
        item.name = item_update.name
    if item_update.item_type is not None:
        item.item_type = item_update.item_type
    if item_update.is_archived is not None:
        item.is_archived = item_update.is_archived
    if item_update.is_recurring is not None:
        item.is_recurring = item_update.is_recurring

    db.commit()
    db.refresh(item)
    return item

SPANISH_MONTHS = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"
]
# Alias de entrada: variantes ortográficas aceptadas al parsear el nombre actual
MONTH_ALIASES = {"septiembre": "setiembre"}

def next_month_name(name: str) -> str:
    """Dado un nombre de item tipo 'Agosto 2026 (pareja)', devuelve 'Setiembre 2026 (pareja)'."""
    match = re.match(r"^(\w+)\s+(\d{4})(.*)$", name.strip(), re.UNICODE)
    if not match:
        raise HTTPException(
            status_code=400,
            detail="No se pudo determinar el siguiente mes desde el nombre del item"
        )
    month_word, year_str, suffix = match.groups()
    month_key = MONTH_ALIASES.get(month_word.lower(), month_word.lower())
    if month_key not in SPANISH_MONTHS:
        raise HTTPException(
            status_code=400,
            detail="No se pudo determinar el siguiente mes desde el nombre del item"
        )
    month_index = SPANISH_MONTHS.index(month_key)
    year = int(year_str)
    next_index = (month_index + 1) % 12
    next_year = year + 1 if next_index == 0 else year
    next_month_word = SPANISH_MONTHS[next_index].capitalize()
    return f"{next_month_word} {next_year}{suffix}"

@app.post("/api/items/{item_id}/next-month", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
def create_next_month_item(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(Item).filter(Item.id == item_id).with_for_update().first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if item.owner_id != current_user.id and current_user not in item.participants:
        raise HTTPException(status_code=403, detail="Not authorized to update this item")

    if not item.is_recurring:
        raise HTTPException(status_code=400, detail="Este item no es mensual")

    if item.next_item_id:
        raise HTTPException(status_code=400, detail="Ya existe un siguiente mes para este item")

    new_name = next_month_name(item.name)

    new_item = Item(
        name=new_name,
        item_type=item.item_type,
        owner_id=item.owner_id,
        is_recurring=True,
        previous_item_id=item.id
    )
    db.add(new_item)
    db.flush()

    # Copiar participantes registrados
    for p in item.participants:
        new_item.participants.append(p)

    # Copiar invitaciones pendientes
    pending_invitations = db.query(PendingInvitation).filter(
        PendingInvitation.item_id == item.id
    ).all()
    for invitation in pending_invitations:
        db.add(PendingInvitation(item_id=new_item.id, email=invitation.email))

    # Copiar presupuesto de cada participante
    budgets = db.query(UserItemBudget).filter(UserItemBudget.item_id == item.id).all()
    for budget in budgets:
        db.add(UserItemBudget(
            user_id=budget.user_id,
            item_id=new_item.id,
            budget_soles=budget.budget_soles,
            budget_dolares=budget.budget_dolares,
            budget_reales=budget.budget_reales
        ))

    # Trasladar cuotas pendientes (aun no llegan a su total)
    pending_installments = db.query(Expense).filter(
        Expense.item_id == item.id,
        Expense.is_installment.is_(True),
        Expense.installment_number.isnot(None),
        Expense.installment_total.isnot(None),
        Expense.installment_number < Expense.installment_total
    ).all()
    for expense in pending_installments:
        db.add(Expense(
            item_id=new_item.id,
            amount=expense.amount,
            description=expense.description,
            payment_method=expense.payment_method,
            currency=expense.currency,
            paid_by=expense.paid_by,
            split_type=expense.split_type,
            assigned_to=expense.assigned_to,
            selected_participants=expense.selected_participants,
            date=datetime.utcnow(),
            is_installment=True,
            installment_number=expense.installment_number + 1,
            installment_total=expense.installment_total,
            installment_group_id=expense.installment_group_id,
            is_settled=False
        ))

    # Trasladar gastos recurrentes indefinidos (ej. Netflix, alquiler)
    recurring_expenses = db.query(Expense).filter(
        Expense.item_id == item.id,
        Expense.is_recurring.is_(True)
    ).all()
    for expense in recurring_expenses:
        db.add(Expense(
            item_id=new_item.id,
            amount=expense.amount,
            description=expense.description,
            payment_method=expense.payment_method,
            currency=expense.currency,
            paid_by=expense.paid_by,
            split_type=expense.split_type,
            assigned_to=expense.assigned_to,
            selected_participants=expense.selected_participants,
            date=datetime.utcnow(),
            is_recurring=True,
            is_settled=False
        ))

    item.next_item_id = new_item.id

    db.commit()
    db.refresh(new_item)
    return new_item

@app.delete("/api/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(Item).filter(
        Item.id == item_id,
        Item.owner_id == current_user.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Eliminar presupuestos personales del item antes de borrarlo
    db.query(UserItemBudget).filter(UserItemBudget.item_id == item_id).delete()

    # Desenlazar la cadena mensual antes de borrar (evita violar el FK)
    db.query(Item).filter(Item.previous_item_id == item_id).update({"previous_item_id": None})
    db.query(Item).filter(Item.next_item_id == item_id).update({"next_item_id": None})

    db.delete(item)
    db.commit()
    return None

# ============= USER ITEM BUDGET ENDPOINTS =============

@app.get("/api/items/{item_id}/budget", response_model=UserItemBudgetResponse)
def get_user_budget(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's budget for a specific item"""
    # Verificar que el item existe y el usuario tiene acceso
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Verificar acceso
    if item.item_type == "personal" and item.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    elif item.item_type == "shared":
        if item.owner_id != current_user.id and current_user not in item.participants:
            raise HTTPException(status_code=403, detail="Not authorized")

    # Buscar presupuesto del usuario para este item
    budget = db.query(UserItemBudget).filter(
        UserItemBudget.user_id == current_user.id,
        UserItemBudget.item_id == item_id
    ).first()

    # Si no existe, crear uno con valores por defecto
    if not budget:
        budget = UserItemBudget(
            user_id=current_user.id,
            item_id=item_id,
        )
        db.add(budget)
        db.commit()
        db.refresh(budget)

    return budget

@app.put("/api/items/{item_id}/budget", response_model=UserItemBudgetResponse)
def update_user_budget(
    item_id: str,
    budget_update: UserItemBudgetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's budget for a specific item"""
    # Verificar que el item existe y el usuario tiene acceso
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Verificar acceso
    if item.item_type == "personal" and item.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    elif item.item_type == "shared":
        if item.owner_id != current_user.id and current_user not in item.participants:
            raise HTTPException(status_code=403, detail="Not authorized")

    # Buscar o crear presupuesto
    budget = db.query(UserItemBudget).filter(
        UserItemBudget.user_id == current_user.id,
        UserItemBudget.item_id == item_id
    ).first()

    if not budget:
        budget = UserItemBudget(
            user_id=current_user.id,
            item_id=item_id
        )
        db.add(budget)

    # Actualizar campos
    budget.budget_soles = budget_update.budget_soles
    budget.budget_dolares = budget_update.budget_dolares
    budget.budget_reales = budget_update.budget_reales

    db.commit()
    db.refresh(budget)
    return budget

# ============= ITEM PARTICIPANTS ENDPOINTS =============

@app.get("/api/items/{item_id}/participants")
def get_item_participants(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verificar que el item pertenece al usuario o es participante
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if item.owner_id != current_user.id and current_user not in item.participants:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Incluir al owner y a todos los participantes
    all_participants = [item.owner] + item.participants
    # Remover duplicados si el owner también está en participants
    seen = set()
    unique_participants = []
    for participant in all_participants:
        if participant.id not in seen:
            seen.add(participant.id)
            unique_participants.append({
                "id": participant.id,
                "email": participant.email,
                "name": participant.name,
                "is_pending": False
            })

    # Agregar invitaciones pendientes
    pending_invitations = db.query(PendingInvitation).filter(
        PendingInvitation.item_id == item_id
    ).all()

    for invitation in pending_invitations:
        unique_participants.append({
            "id": invitation.id,
            "email": invitation.email,
            "name": None,
            "is_pending": True
        })

    return unique_participants

@app.post("/api/items/{item_id}/participants", status_code=status.HTTP_201_CREATED)
def add_item_participant(
    item_id: str,
    participant: ItemParticipantAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verificar que el item pertenece al usuario
    item = db.query(Item).filter(
        Item.id == item_id,
        Item.owner_id == current_user.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found or not authorized")

    # Verificar que no sea el email del owner
    if participant.email == current_user.email:
        raise HTTPException(status_code=400, detail="No puedes agregarte a ti mismo")

    # Buscar el usuario por email
    user_to_add = db.query(User).filter(User.email == participant.email).first()

    if user_to_add:
        # El usuario existe, agregarlo directamente
        # Verificar que no esté ya agregado
        if user_to_add in item.participants:
            raise HTTPException(status_code=400, detail="El usuario ya es participante de este item")

        # Agregar participante
        item.participants.append(user_to_add)
        db.commit()

        return {"id": user_to_add.id, "email": user_to_add.email, "name": user_to_add.name, "is_pending": False}
    else:
        # El usuario NO existe, crear invitación pendiente
        # Verificar que no haya ya una invitación pendiente
        existing_invitation = db.query(PendingInvitation).filter(
            PendingInvitation.item_id == item_id,
            PendingInvitation.email == participant.email
        ).first()

        if existing_invitation:
            raise HTTPException(status_code=400, detail="Ya existe una invitación pendiente para este email")

        # Crear invitación pendiente
        new_invitation = PendingInvitation(
            item_id=item_id,
            email=participant.email
        )
        db.add(new_invitation)
        db.commit()

        return {"id": new_invitation.id, "email": participant.email, "name": None, "is_pending": True}

@app.delete("/api/items/{item_id}/participants/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_item_participant(
    item_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verificar que el item pertenece al usuario
    item = db.query(Item).filter(
        Item.id == item_id,
        Item.owner_id == current_user.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found or not authorized")

    # Intentar eliminar como usuario registrado
    user_to_remove = db.query(User).filter(User.id == user_id).first()
    if user_to_remove and user_to_remove in item.participants:
        item.participants.remove(user_to_remove)
        db.commit()
        return None

    # Intentar eliminar como invitación pendiente
    pending_invitation = db.query(PendingInvitation).filter(
        PendingInvitation.id == user_id,
        PendingInvitation.item_id == item_id
    ).first()

    if pending_invitation:
        db.delete(pending_invitation)
        db.commit()
        return None

    raise HTTPException(status_code=404, detail="Participant or invitation not found")

# ============= EXPENSES ENDPOINTS =============

@app.get("/api/items/{item_id}/expenses", response_model=List[ExpenseResponse])
def get_expenses(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verificar que el item existe y el usuario tiene acceso
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Verificar que el usuario sea owner o participante
    if item.owner_id != current_user.id and current_user not in item.participants:
        raise HTTPException(status_code=403, detail="Not authorized to access this item")

    expenses = (
        db.query(Expense)
        .filter(Expense.item_id == item_id)
        .order_by(Expense.date.desc(), Expense.created_at.desc())
        .all()
    )
    return expenses

@app.post("/api/items/{item_id}/expenses", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    item_id: str,
    expense: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verificar que el item existe y el usuario tiene acceso
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Verificar que el usuario sea owner o participante
    if item.owner_id != current_user.id and current_user not in item.participants:
        raise HTTPException(status_code=403, detail="Not authorized to access this item")

    # Parse date string to datetime if provided
    from datetime import datetime as dt
    expense_date = None
    if expense.date:
        try:
            # Handle both ISO format with and without timezone
            expense_date = dt.fromisoformat(expense.date.replace('Z', '+00:00'))
        except ValueError:
            try:
                # Try parsing without timezone (from datetime-local input)
                expense_date = dt.strptime(expense.date, '%Y-%m-%dT%H:%M')
            except ValueError:
                expense_date = dt.now()

    # Determinar quién pagó (por defecto el usuario actual)
    paid_by_id = expense.paid_by if expense.paid_by else current_user.id

    # Convertir lista de participantes a string separado por comas
    selected_participants_str = None
    if expense.selected_participants:
        selected_participants_str = ','.join(expense.selected_participants)

    now = datetime.utcnow()
    auto_category = classify_expense_with_rules(expense.description, db)

    new_expense = Expense(
        item_id=item_id,
        amount=expense.amount,
        description=expense.description,
        payment_method=expense.payment_method,
        currency=expense.currency,
        paid_by=paid_by_id,
        split_type=expense.split_type,
        assigned_to=expense.assigned_to,
        selected_participants=selected_participants_str,
        date=expense_date,
        is_installment=expense.is_installment,
        installment_number=expense.installment_number,
        installment_total=expense.installment_total,
        installment_group_id=expense.installment_group_id,
        is_recurring=expense.is_recurring,
        is_settled=expense.is_settled,
        ai_category=auto_category,
        ai_confidence=0.35,
        ai_model="rules-v1",
        ai_classified_at=now,
    )
    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)

    return new_expense

@app.put("/api/items/{item_id}/expenses/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    item_id: str,
    expense_id: str,
    expense_update: ExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verificar que el item existe y el usuario tiene acceso
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Verificar que el usuario sea owner o participante
    if item.owner_id != current_user.id and current_user not in item.participants:
        raise HTTPException(status_code=403, detail="Not authorized to access this item")

    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.item_id == item_id
    ).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    recategorize_with_rules = False

    if expense_update.amount is not None:
        expense.amount = expense_update.amount
    if expense_update.description is not None:
        expense.description = expense_update.description
        recategorize_with_rules = True
    if expense_update.payment_method is not None:
        expense.payment_method = expense_update.payment_method
    if expense_update.currency is not None:
        expense.currency = expense_update.currency
    if expense_update.paid_by is not None:
        expense.paid_by = expense_update.paid_by
    if expense_update.split_type is not None:
        expense.split_type = expense_update.split_type
    if expense_update.assigned_to is not None:
        expense.assigned_to = expense_update.assigned_to
    if expense_update.selected_participants is not None:
        expense.selected_participants = ','.join(expense_update.selected_participants) if expense_update.selected_participants else None
    if expense_update.date is not None:
        from datetime import datetime as dt
        try:
            # Handle both ISO format with and without timezone
            expense.date = dt.fromisoformat(expense_update.date.replace('Z', '+00:00'))
        except ValueError:
            try:
                # Try parsing without timezone (from datetime-local input)
                expense.date = dt.strptime(expense_update.date, '%Y-%m-%dT%H:%M')
            except ValueError:
                expense.date = dt.now()
    if expense_update.is_installment is not None:
        expense.is_installment = expense_update.is_installment
    if expense_update.installment_number is not None:
        expense.installment_number = expense_update.installment_number
    if expense_update.installment_total is not None:
        expense.installment_total = expense_update.installment_total
    if expense_update.installment_group_id is not None:
        expense.installment_group_id = expense_update.installment_group_id
    if expense_update.is_recurring is not None:
        expense.is_recurring = expense_update.is_recurring
    if expense_update.is_settled is not None:
        expense.is_settled = expense_update.is_settled

    if recategorize_with_rules and expense.description:
        # Solo reaplicar reglas si la clasificación actual no viene de IA OpenAI.
        if not expense.ai_model or not expense.ai_model.startswith("gpt-"):
            expense.ai_category = classify_expense_with_rules(expense.description, db)
            expense.ai_confidence = 0.35
            expense.ai_model = "rules-v1"
            expense.ai_classified_at = datetime.utcnow()

    db.commit()
    db.refresh(expense)
    return expense

@app.patch("/api/items/{item_id}/expenses/{expense_id}/settled", response_model=ExpenseResponse)
def toggle_expense_settled(
    item_id: str,
    expense_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.owner_id != current_user.id and current_user not in item.participants:
        raise HTTPException(status_code=403, detail="Not authorized")
    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.item_id == item_id
    ).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    expense.is_settled = not expense.is_settled
    db.commit()
    db.refresh(expense)
    return expense

@app.patch("/api/items/{item_id}/expenses/{expense_id}/category", response_model=ExpenseResponse)
def set_expense_category(
    item_id: str,
    expense_id: str,
    payload: ExpenseCategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = ensure_item_access(item_id, current_user, db)
    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.item_id == item.id
    ).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    category = validate_category(payload.category, db)
    if category != payload.category.strip().lower():
        raise HTTPException(status_code=400, detail="Invalid category")

    expense.ai_category = category
    expense.ai_confidence = 1.0
    expense.ai_model = "manual"
    expense.ai_classified_at = datetime.utcnow()

    db.commit()
    db.refresh(expense)
    return expense

# ============= CATEGORIES ENDPOINTS =============

@app.get("/api/categories", response_model=List[CategoryResponse])
def get_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Category).order_by(Category.position).all()

@app.post("/api/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    category: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    normalized = category.name.strip().lower()
    if not normalized:
        raise HTTPException(status_code=400, detail="El nombre no puede estar vacío")

    existing = db.query(Category).filter(Category.name == normalized).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una categoría con ese nombre")

    max_position = db.query(Category).count()
    new_category = Category(
        name=normalized,
        keywords=category.keywords.strip() if category.keywords else None,
        position=max_position,
        is_default=False
    )
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    return new_category

@app.put("/api/categories/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: str,
    category_update: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_category = db.query(Category).filter(Category.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")

    if category_update.name is not None:
        normalized = category_update.name.strip().lower()
        if not normalized:
            raise HTTPException(status_code=400, detail="El nombre no puede estar vacío")
        if normalized != db_category.name:
            if db_category.is_default:
                raise HTTPException(status_code=400, detail="No se puede renombrar la categoría por defecto")
            existing = db.query(Category).filter(Category.name == normalized).first()
            if existing:
                raise HTTPException(status_code=400, detail="Ya existe una categoría con ese nombre")
            # Reasignar gastos históricos al nuevo nombre
            db.query(Expense).filter(Expense.ai_category == db_category.name).update(
                {"ai_category": normalized}
            )
            db_category.name = normalized

    if category_update.keywords is not None:
        db_category.keywords = category_update.keywords.strip() or None

    db.commit()
    db.refresh(db_category)
    return db_category

@app.delete("/api/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_category = db.query(Category).filter(Category.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")

    if db_category.is_default:
        raise HTTPException(status_code=400, detail="No se puede eliminar la categoría por defecto")

    # Reasignar gastos que usaban esta categoría a la categoría por defecto
    default_category = db.query(Category).filter(Category.is_default.is_(True)).first()
    default_name = default_category.name if default_category else "otros"
    db.query(Expense).filter(Expense.ai_category == db_category.name).update(
        {"ai_category": default_name}
    )

    db.delete(db_category)
    db.commit()
    return None

@app.delete("/api/items/{item_id}/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    item_id: str,
    expense_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verificar que el item existe y el usuario tiene acceso
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Verificar que el usuario sea owner o participante
    if item.owner_id != current_user.id and current_user not in item.participants:
        raise HTTPException(status_code=403, detail="Not authorized to access this item")

    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.item_id == item_id
    ).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    db.delete(expense)
    db.commit()
    return None

# ============= ITEM SUMMARY (AI) ENDPOINTS =============

@app.get("/api/items/{item_id}/summary", response_model=ItemSummaryResponse)
def get_item_summary(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ensure_item_access(item_id, current_user, db)
    expenses = (
        db.query(Expense)
        .filter(Expense.item_id == item_id)
        .order_by(Expense.date.desc(), Expense.created_at.desc())
        .all()
    )
    if not expenses:
        raise HTTPException(status_code=404, detail="Summary not generated yet")

    now = datetime.utcnow()
    for expense in expenses:
        if not expense.ai_category:
            expense.ai_category = classify_expense_with_rules(expense.description, db)
            expense.ai_confidence = 0.35
            expense.ai_model = "rules-v1"
            expense.ai_classified_at = now

    summary = sync_summary_snapshot(item_id, current_user, expenses, db)
    db.commit()
    return {
        "item_id": item_id,
        "generated_at": summary.generated_at,
        "ai_model": summary.ai_model,
        "expenses_processed": summary.expenses_processed,
        "categories_by_currency": json.loads(summary.categories_json)
    }

@app.post("/api/items/{item_id}/summary/generate", response_model=ItemSummaryResponse)
def generate_item_summary(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ensure_item_access(item_id, current_user, db)
    expenses = (
        db.query(Expense)
        .filter(Expense.item_id == item_id)
        .order_by(Expense.date.desc(), Expense.created_at.desc())
        .all()
    )
    if not expenses:
        raise HTTPException(status_code=400, detail="No expenses found for this item")

    now = datetime.utcnow()
    for expense in expenses:
        if not expense.ai_category:
            expense.ai_category = classify_expense_with_rules(expense.description, db)
            expense.ai_confidence = 0.35
            expense.ai_model = "rules-v1"
            expense.ai_classified_at = now

    summary = sync_summary_snapshot(item_id, current_user, expenses, db)
    db.commit()

    return {
        "item_id": item_id,
        "generated_at": summary.generated_at,
        "ai_model": summary.ai_model,
        "expenses_processed": summary.expenses_processed,
        "categories_by_currency": json.loads(summary.categories_json)
    }

# ============================================
# PERSONAL CAPITAL
# ============================================

@app.get("/api/capital", response_model=CapitalResponse)
def get_capital(
    convert: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """convert: 'soles' o 'dolares' para colapsar todas las monedas en una sola
    usando el tipo de cambio del día. Si se omite, devuelve cada moneda por separado."""
    capital = get_user_capital(current_user.id, db)
    incomes = db.query(UserIncome).filter(
        UserIncome.user_id == current_user.id
    ).order_by(UserIncome.created_at.desc()).all()

    if convert in ("soles", "dolares"):
        rates = get_exchange_rates_to_pen()
        capital = {
            "by_currency": convert_currency_dict(capital["by_currency"], convert, rates),
            "owed_to_me": convert_currency_dict(capital["owed_to_me"], convert, rates),
            "i_owe": convert_currency_dict(capital["i_owe"], convert, rates),
            "detail": capital["detail"],
        }

    return {**capital, "incomes": incomes}

@app.post("/api/capital/incomes", response_model=UserIncomeResponse, status_code=status.HTTP_201_CREATED)
def create_income(
    income: UserIncomeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if income.income_type not in ("periodic", "one_time"):
        raise HTTPException(status_code=400, detail="income_type debe ser 'periodic' u 'one_time'")

    if income.income_type == "periodic":
        if not income.day_of_month or not (1 <= income.day_of_month <= 31):
            raise HTTPException(status_code=400, detail="day_of_month es requerido (1-31) para ingresos periódicos")

    income_date = datetime.utcnow()
    if income.date:
        try:
            income_date = datetime.fromisoformat(income.date.replace('Z', '+00:00'))
        except ValueError:
            pass

    new_income = UserIncome(
        user_id=current_user.id,
        income_type=income.income_type,
        amount=income.amount,
        currency=income.currency,
        description=income.description,
        date=income_date,
        day_of_month=income.day_of_month if income.income_type == "periodic" else None
    )
    db.add(new_income)
    db.commit()
    db.refresh(new_income)
    return new_income

@app.put("/api/capital/incomes/{income_id}", response_model=UserIncomeResponse)
def update_income(
    income_id: str,
    income_update: UserIncomeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_income = db.query(UserIncome).filter(
        UserIncome.id == income_id,
        UserIncome.user_id == current_user.id
    ).first()
    if not db_income:
        raise HTTPException(status_code=404, detail="Income not found")

    if income_update.amount is not None:
        db_income.amount = income_update.amount
    if income_update.currency is not None:
        db_income.currency = income_update.currency
    if income_update.description is not None:
        db_income.description = income_update.description
    if income_update.day_of_month is not None:
        if not (1 <= income_update.day_of_month <= 31):
            raise HTTPException(status_code=400, detail="day_of_month debe estar entre 1 y 31")
        db_income.day_of_month = income_update.day_of_month
    if income_update.end_date is not None:
        try:
            db_income.end_date = datetime.fromisoformat(income_update.end_date.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="end_date inválida")

    db.commit()
    db.refresh(db_income)
    return db_income

@app.delete("/api/capital/incomes/{income_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_income(
    income_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_income = db.query(UserIncome).filter(
        UserIncome.id == income_id,
        UserIncome.user_id == current_user.id
    ).first()
    if not db_income:
        raise HTTPException(status_code=404, detail="Income not found")

    db.delete(db_income)
    db.commit()
    return None

@app.get("/")
def root():
    return {"message": "App Gastos API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
