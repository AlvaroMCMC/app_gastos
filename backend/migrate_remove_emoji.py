"""
Migración: Eliminar columna emoji de expense_templates

Este script elimina la columna emoji de la tabla expense_templates.
"""

import sqlite3
import os

# Configuración
DATABASE_PATH = os.getenv("DATABASE_URL", "sqlite:///./app_gastos.db").replace("sqlite:///", "")

def migrate():
    print(f"Conectando a base de datos: {DATABASE_PATH}")

    # Conectar a la base de datos
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    try:
        # SQLite no soporta DROP COLUMN directamente, necesitamos recrear la tabla
        print("Creando tabla temporal sin columna emoji...")

        # 1. Crear tabla temporal con nuevo esquema
        cursor.execute("""
            CREATE TABLE expense_templates_new (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                position INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)

        # 2. Copiar datos (sin la columna emoji)
        print("Copiando datos existentes...")
        cursor.execute("""
            INSERT INTO expense_templates_new (id, user_id, name, position, created_at)
            SELECT id, user_id, name, position, created_at
            FROM expense_templates
        """)

        # 3. Eliminar tabla antigua
        print("Eliminando tabla antigua...")
        cursor.execute("DROP TABLE expense_templates")

        # 4. Renombrar tabla nueva
        print("Renombrando tabla nueva...")
        cursor.execute("ALTER TABLE expense_templates_new RENAME TO expense_templates")

        # Confirmar cambios
        conn.commit()
        print("✅ Migración completada exitosamente!")

    except Exception as e:
        print(f"❌ Error durante la migración: {e}")
        conn.rollback()
        raise

    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
