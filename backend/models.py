from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Boolean, Table
from sqlalchemy.orm import relationship
from database import Base
import datetime
import uuid

def generate_uuid():
    return str(uuid.uuid4())

# Tabla de asociación para items compartidos (many-to-many)
item_participants = Table(
    'item_participants',
    Base.metadata,
    Column('item_id', String, ForeignKey('items.id'), primary_key=True),
    Column('user_id', String, ForeignKey('users.id'), primary_key=True),
    Column('added_at', DateTime, default=datetime.datetime.utcnow)
)

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relaciones
    items = relationship("Item", back_populates="owner")
    expenses = relationship("Expense", back_populates="paid_by_user", foreign_keys="Expense.paid_by")
    shared_items = relationship("Item", secondary=item_participants, back_populates="participants")
    expense_templates = relationship("ExpenseTemplate", back_populates="user", cascade="all, delete-orphan")

class Item(Base):
    __tablename__ = "items"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    item_type = Column(String, nullable=False)  # "personal" o "shared"
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    is_archived = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relaciones
    owner = relationship("User", back_populates="items")
    expenses = relationship("Expense", back_populates="item", cascade="all, delete-orphan")
    participants = relationship("User", secondary=item_participants, back_populates="shared_items")

class PendingInvitation(Base):
    __tablename__ = "pending_invitations"

    id = Column(String, primary_key=True, default=generate_uuid)
    item_id = Column(String, ForeignKey("items.id"), nullable=False)
    email = Column(String, nullable=False)
    invited_at = Column(DateTime, default=datetime.datetime.utcnow)

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(String, primary_key=True, default=generate_uuid)
    item_id = Column(String, ForeignKey("items.id"), nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=False)
    payment_method = Column(String, nullable=False)  # "banco" o "efectivo"
    currency = Column(String, nullable=False, default="soles")  # "soles", "dolares", "reales"
    paid_by = Column(String, ForeignKey("users.id"), nullable=False)
    split_type = Column(String, nullable=False, default="divided")  # "divided", "assigned", o "selected"
    assigned_to = Column(String, ForeignKey("users.id"), nullable=True)  # Si es "assigned", a quién se asigna
    selected_participants = Column(String, nullable=True)  # Si es "selected", IDs separados por comas
    date = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relaciones
    item = relationship("Item", back_populates="expenses")
    paid_by_user = relationship("User", back_populates="expenses", foreign_keys=[paid_by])

class ExpenseTemplate(Base):
    __tablename__ = "expense_templates"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)  # "Comida afuera"
    position = Column(Integer, nullable=False, default=0)  # Orden de visualización
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relación con usuario
    user = relationship("User", back_populates="expense_templates")

class UserItemBudget(Base):
    __tablename__ = "user_item_budgets"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    item_id = Column(String, ForeignKey("items.id"), nullable=False)
    budget = Column(Float, nullable=False, default=0.0)
    currency = Column(String, nullable=False, default="soles")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relaciones
    user = relationship("User")
    item = relationship("Item")
