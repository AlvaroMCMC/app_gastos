import pg8000

try:
    print("Conectando sin contraseña (trust)...")
    conn = pg8000.connect(
        host="localhost",
        port=5432,
        database="app_gastos",
        user="postgres",
        password=""  # Vacío para trust auth
    )
    print("¡CONEXIÓN EXITOSA!")
    cursor = conn.cursor()
    cursor.execute("SELECT version();")
    version = cursor.fetchone()
    print(f"PostgreSQL version: {version[0]}")
    conn.close()
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
