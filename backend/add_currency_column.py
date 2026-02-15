import sqlite3

conn = sqlite3.connect('app_gastos.db')
cursor = conn.cursor()

try:
    # Add currency column with default value 'soles'
    cursor.execute("ALTER TABLE expenses ADD COLUMN currency VARCHAR DEFAULT 'soles'")
    conn.commit()
    print("Column 'currency' added successfully!")
except Exception as e:
    print(f"Error: {e}")
    print("(Column might already exist)")

conn.close()
