import pg8000

try:
    print("Conectando a PostgreSQL 13...")
    conn = pg8000.connect(
        host="localhost",
        port=5432,
        database="app_gastos",
        user="postgres",
        password="postgres"
    )
    print("¡CONEXIÓN EXITOSA CON POSTGRESQL 13!")
    cursor = conn.cursor()
    cursor.execute("SELECT version();")
    version = cursor.fetchone()
    print(f"Version: {version[0][:50]}...")
    conn.close()
except Exception as e:
    print(f"Error: {type(e).__name__}")
    import traceback
    traceback.print_exc()
