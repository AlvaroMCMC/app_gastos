import pg8000

try:
    print("Intentando conectar con pg8000...")
    conn = pg8000.connect(
        host="localhost",
        port=5432,
        database="app_gastos",
        user="postgres",
        password="postgres"
    )
    print("¡Conexión exitosa con pg8000!")
    cursor = conn.cursor()
    cursor.execute("SELECT version();")
    version = cursor.fetchone()
    print(f"PostgreSQL version: {version[0]}")
    conn.close()
except Exception as e:
    print(f"Error: {type(e).__name__}")
    print(f"Mensaje: {e}")
    import traceback
    traceback.print_exc()
