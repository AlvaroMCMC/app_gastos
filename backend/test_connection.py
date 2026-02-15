import sys
import os

# Configurar encoding para Windows ANTES de importar psycopg2
os.environ['PGCLIENTENCODING'] = 'UTF8'
os.environ['PYTHONUTF8'] = '1'

import psycopg2
import psycopg2.extensions
psycopg2.extensions.register_type(psycopg2.extensions.UNICODE)
psycopg2.extensions.register_type(psycopg2.extensions.UNICODEARRAY)

try:
    print("Intentando conectar a PostgreSQL...")
    conn = psycopg2.connect(
        host="localhost",
        port=5432,
        database="app_gastos",
        user="postgres",
        password="postgres",
        options='-c client_encoding=UTF8'
    )
    print("¡Conexión exitosa!")
    conn.close()
except Exception as e:
    print(f"Error: {type(e).__name__}")
    print(f"Mensaje: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
