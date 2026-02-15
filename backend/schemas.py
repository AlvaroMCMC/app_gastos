from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

# User Schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

# Item Schemas
class ItemCreate(BaseModel):
    name: str
    item_type: str  # "personal" o "shared"

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    item_type: Optional[str] = None
    budget: Optional[float] = None
    budget_currency: Optional[str] = None
    is_archived: Optional[bool] = None

class ItemResponse(BaseModel):
    id: str
    name: str
    item_type: str
    owner_id: str
    owner_email: Optional[str] = None
    budget: float
    budget_currency: str
    is_archived: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ItemParticipantAdd(BaseModel):
    email: str

class ItemParticipantResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    is_pending: bool = False

# Expense Schemas
class ExpenseCreate(BaseModel):
    amount: float
    description: str
    payment_method: str  # "banco" o "efectivo"
    currency: str = "soles"  # "soles", "dolares", "reales"
    paid_by: Optional[str] = None  # ID del usuario que pagó (por defecto el current_user)
    split_type: str = "divided"  # "divided", "assigned", o "selected"
    assigned_to: Optional[str] = None  # ID del usuario al que se asigna (si split_type es "assigned")
    selected_participants: Optional[List[str]] = None  # IDs de participantes (si split_type es "selected")
    date: Optional[str] = None  # Accept date as string from frontend

class ExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    description: Optional[str] = None
    payment_method: Optional[str] = None
    currency: Optional[str] = None
    paid_by: Optional[str] = None
    split_type: Optional[str] = None
    assigned_to: Optional[str] = None
    selected_participants: Optional[List[str]] = None
    date: Optional[str] = None  # Accept date as string

class ExpenseResponse(BaseModel):
    id: str
    item_id: str
    amount: float
    description: str
    payment_method: str
    currency: str
    paid_by: str
    split_type: str
    assigned_to: Optional[str] = None
    selected_participants: Optional[str] = None  # Stored as comma-separated string
    date: datetime
    created_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.strftime('%Y-%m-%dT%H:%M:%S') if v else None
        }

# Expense Template Schemas
class ExpenseTemplateBase(BaseModel):
    name: str
    emoji: str
    position: int = 0

class ExpenseTemplateCreate(ExpenseTemplateBase):
    pass

class ExpenseTemplateUpdate(BaseModel):
    name: Optional[str] = None
    emoji: Optional[str] = None
    position: Optional[int] = None

class ExpenseTemplateResponse(ExpenseTemplateBase):
    id: str
    user_id: str
    created_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.strftime('%Y-%m-%dT%H:%M:%S') if v else None
        }
