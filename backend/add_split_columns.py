import sqlite3

conn = sqlite3.connect('app_gastos.db')
cursor = conn.cursor()

try:
    # Add split_type column with default value 'divided'
    cursor.execute("ALTER TABLE expenses ADD COLUMN split_type VARCHAR DEFAULT 'divided'")
    print("Column 'split_type' added successfully!")
except Exception as e:
    print(f"Error adding split_type: {e}")
    print("(Column might already exist)")

try:
    # Add assigned_to column (nullable)
    cursor.execute("ALTER TABLE expenses ADD COLUMN assigned_to VARCHAR")
    print("Column 'assigned_to' added successfully!")
except Exception as e:
    print(f"Error adding assigned_to: {e}")
    print("(Column might already exist)")

conn.commit()
conn.close()

print("\nMigration completed!")
