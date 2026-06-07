"""
Migración: presupuesto multi-moneda
Convierte user_item_budgets de (budget + currency) → (budget_soles + budget_dolares + budget_reales)
Ejecutar UNA sola vez antes de desplegar el nuevo código.
"""
import os, sys
from sqlalchemy import create_engine, text

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: set DATABASE_URL env var before running")
    sys.exit(1)

engine = create_engine(DATABASE_URL)

steps = [
    # 1. Agregar nuevas columnas
    "ALTER TABLE user_item_budgets ADD COLUMN IF NOT EXISTS budget_soles FLOAT NOT NULL DEFAULT 0.0",
    "ALTER TABLE user_item_budgets ADD COLUMN IF NOT EXISTS budget_dolares FLOAT NOT NULL DEFAULT 0.0",
    "ALTER TABLE user_item_budgets ADD COLUMN IF NOT EXISTS budget_reales FLOAT NOT NULL DEFAULT 0.0",
    # 2. Migrar datos existentes
    "UPDATE user_item_budgets SET budget_soles = budget WHERE currency = 'soles'",
    "UPDATE user_item_budgets SET budget_dolares = budget WHERE currency = 'dolares'",
    "UPDATE user_item_budgets SET budget_reales = budget WHERE currency = 'reales'",
    # 3. Eliminar columnas antiguas
    "ALTER TABLE user_item_budgets DROP COLUMN IF EXISTS budget",
    "ALTER TABLE user_item_budgets DROP COLUMN IF EXISTS currency",
]

with engine.begin() as conn:
    for step in steps:
        print(f"  → {step[:70]}...")
        conn.execute(text(step))

print("\nMigración completada.")
