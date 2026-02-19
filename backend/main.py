from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import or_, text
from datetime import timedelta
from typing import List

from database import engine, get_db, Base
from models import User, Item, Expense, PendingInvitation, ExpenseTemplate, UserItemBudget
from schemas import (
    UserCreate, UserLogin, UserResponse, Token,
    ItemCreate, ItemUpdate, ItemResponse,
    ExpenseCreate, ExpenseUpdate, ExpenseResponse,
    ItemParticipantAdd, ItemParticipantResponse,
    ExpenseTemplateCreate, ExpenseTemplateUpdate, ExpenseTemplateResponse,
    UserItemBudgetUpdate, UserItemBudgetResponse
)
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES
)

# Crear tablas
Base.metadata.create_all(bind=engine)

# Migración: Eliminar columna emoji de expense_templates si existe
try:
    with engine.connect() as conn:
        # Verificar si la columna emoji existe
        result = conn.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name='expense_templates' AND column_name='emoji'
        """))

        if result.fetchone():
            print("🔄 Migrando: Eliminando columna 'emoji' de expense_templates...")
            conn.execute(text("ALTER TABLE expense_templates DROP COLUMN emoji"))
            conn.commit()
            print("✅ Migración completada!")
except Exception as e:
    print(f"⚠️  Migración: {e}")

# Migración: Eliminar columnas budget de items (ahora es personal por usuario)
try:
    with engine.connect() as conn:
        # Verificar si la columna budget existe
        result = conn.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name='items' AND column_name='budget'
        """))

        if result.fetchone():
            print("🔄 Migrando: Eliminando columnas 'budget' de items...")
            conn.execute(text("ALTER TABLE items DROP COLUMN budget"))
            conn.execute(text("ALTER TABLE items DROP COLUMN budget_currency"))
            conn.commit()
            print("✅ Migración completada!")
except Exception as e:
    print(f"⚠️  Migración: {e}")

# Migración: Agregar ON DELETE CASCADE al FK de user_item_budgets
try:
    with engine.connect() as conn:
        # Verificar si la tabla existe
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
            # Verificar si ya tiene CASCADE
            cascade_check = conn.execute(text(f"""
                SELECT delete_rule
                FROM information_schema.referential_constraints
                WHERE constraint_name='{constraint_name}'
            """))
            rule = cascade_check.fetchone()
            if rule and rule[0] != 'CASCADE':
                print("🔄 Migrando: Agregando ON DELETE CASCADE a user_item_budgets...")
                conn.execute(text(f"ALTER TABLE user_item_budgets DROP CONSTRAINT {constraint_name}"))
                conn.execute(text("""
                    ALTER TABLE user_item_budgets
                    ADD CONSTRAINT user_item_budgets_item_id_fkey
                    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
                """))
                conn.commit()
                print("✅ Migración completada!")
except Exception as e:
    print(f"⚠️  Migración cascade: {e}")

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
    ).all()

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
        owner_id=current_user.id
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

    db.commit()
    db.refresh(item)
    return item

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
            budget=0.0,
            currency="soles"
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
    budget.budget = budget_update.budget
    budget.currency = budget_update.currency

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

    expenses = db.query(Expense).filter(Expense.item_id == item_id).all()
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
        except:
            try:
                # Try parsing without timezone (from datetime-local input)
                expense_date = dt.strptime(expense.date, '%Y-%m-%dT%H:%M')
            except:
                expense_date = dt.now()

    # Determinar quién pagó (por defecto el usuario actual)
    paid_by_id = expense.paid_by if expense.paid_by else current_user.id

    # Convertir lista de participantes a string separado por comas
    selected_participants_str = None
    if expense.selected_participants:
        selected_participants_str = ','.join(expense.selected_participants)

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
        date=expense_date
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

    if expense_update.amount is not None:
        expense.amount = expense_update.amount
    if expense_update.description is not None:
        expense.description = expense_update.description
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
        except:
            try:
                # Try parsing without timezone (from datetime-local input)
                expense.date = dt.strptime(expense_update.date, '%Y-%m-%dT%H:%M')
            except:
                expense.date = dt.now()

    db.commit()
    db.refresh(expense)
    return expense

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

# ============================================
# EXPENSE TEMPLATES
# ============================================

# Plantillas predefinidas (default para nuevos usuarios)
DEFAULT_TEMPLATES = [
    {"name": "Comida afuera", "position": 0},
    {"name": "Transporte", "position": 1},
    {"name": "Ropa", "position": 2},
    {"name": "Farmacia", "position": 3},
    {"name": "Supermercado", "position": 4},
    {"name": "Entretenimiento", "position": 5},
]

@app.get("/api/expense-templates", response_model=List[ExpenseTemplateResponse])
def get_user_expense_templates(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Obtener plantillas de gastos del usuario. Si no tiene, crear las predefinidas."""

    templates = db.query(ExpenseTemplate).filter(
        ExpenseTemplate.user_id == current_user.id
    ).order_by(ExpenseTemplate.position).all()

    # Si el usuario no tiene plantillas, crear las predefinidas
    if not templates:
        for template_data in DEFAULT_TEMPLATES:
            new_template = ExpenseTemplate(
                user_id=current_user.id,
                **template_data
            )
            db.add(new_template)
        db.commit()

        # Recargar las plantillas creadas
        templates = db.query(ExpenseTemplate).filter(
            ExpenseTemplate.user_id == current_user.id
        ).order_by(ExpenseTemplate.position).all()

    return templates

@app.post("/api/expense-templates", response_model=ExpenseTemplateResponse)
def create_expense_template(
    template: ExpenseTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear nueva plantilla de gasto (máximo 8 por usuario)."""

    # Verificar que no exceda el máximo de 8
    template_count = db.query(ExpenseTemplate).filter(
        ExpenseTemplate.user_id == current_user.id
    ).count()

    if template_count >= 8:
        raise HTTPException(status_code=400, detail="Máximo 8 plantillas permitidas")

    new_template = ExpenseTemplate(
        user_id=current_user.id,
        name=template.name,
        position=template.position
    )
    db.add(new_template)
    db.commit()
    db.refresh(new_template)

    return new_template

@app.put("/api/expense-templates/{template_id}", response_model=ExpenseTemplateResponse)
def update_expense_template(
    template_id: str,
    template: ExpenseTemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar plantilla de gasto."""

    db_template = db.query(ExpenseTemplate).filter(
        ExpenseTemplate.id == template_id,
        ExpenseTemplate.user_id == current_user.id
    ).first()

    if not db_template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")

    # Actualizar solo los campos proporcionados
    if template.name is not None:
        db_template.name = template.name
    if template.position is not None:
        db_template.position = template.position

    db.commit()
    db.refresh(db_template)

    return db_template

@app.delete("/api/expense-templates/{template_id}")
def delete_expense_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Eliminar plantilla de gasto."""

    db_template = db.query(ExpenseTemplate).filter(
        ExpenseTemplate.id == template_id,
        ExpenseTemplate.user_id == current_user.id
    ).first()

    if not db_template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")

    db.delete(db_template)
    db.commit()

    return {"message": "Plantilla eliminada"}

@app.post("/api/expense-templates/reorder")
def reorder_expense_templates(
    template_ids: List[str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reordenar plantillas de gastos."""

    for index, template_id in enumerate(template_ids):
        db_template = db.query(ExpenseTemplate).filter(
            ExpenseTemplate.id == template_id,
            ExpenseTemplate.user_id == current_user.id
        ).first()

        if db_template:
            db_template.position = index

    db.commit()

    return {"message": "Plantillas reordenadas"}

@app.get("/")
def root():
    return {"message": "App Gastos API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
