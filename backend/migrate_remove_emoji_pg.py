"""
Migración: Eliminar columna emoji de expense_templates (PostgreSQL)

Este script elimina la columna emoji de la tabla expense_templates.
"""

import os
from sqlalchemy import create_engine, text

# Obtener DATABASE_URL del entorno
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/app_gastos")

def migrate():
    print(f"Conectando a base de datos: {DATABASE_URL}")

    # Crear engine
    engine = create_engine(DATABASE_URL)

    try:
        with engine.connect() as conn:
            # PostgreSQL soporta DROP COLUMN directamente
            print("Eliminando columna 'emoji' de la tabla expense_templates...")

            # Verificar si la columna existe antes de eliminarla
            result = conn.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name='expense_templates' AND column_name='emoji'
            """))

            if result.fetchone():
                # La columna existe, eliminarla
                conn.execute(text("ALTER TABLE expense_templates DROP COLUMN emoji"))
                conn.commit()
                print("✅ Columna 'emoji' eliminada exitosamente!")
            else:
                print("ℹ️  La columna 'emoji' no existe, migración no necesaria.")

    except Exception as e:
        print(f"❌ Error durante la migración: {e}")
        raise

if __name__ == "__main__":
    migrate()
