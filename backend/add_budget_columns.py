import sqlite3

conn = sqlite3.connect('app_gastos.db')
cursor = conn.cursor()

try:
    # Add budget column with default value 0.0
    cursor.execute("ALTER TABLE items ADD COLUMN budget REAL DEFAULT 0.0")
    print("Column 'budget' added successfully!")
except Exception as e:
    print(f"Error adding budget: {e}")
    print("(Column might already exist)")

try:
    # Add budget_currency column with default value 'soles'
    cursor.execute("ALTER TABLE items ADD COLUMN budget_currency VARCHAR DEFAULT 'soles'")
    print("Column 'budget_currency' added successfully!")
except Exception as e:
    print(f"Error adding budget_currency: {e}")
    print("(Column might already exist)")

conn.commit()
conn.close()

print("\nMigration completed!")
