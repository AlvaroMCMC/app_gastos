import sqlite3

conn = sqlite3.connect('app_gastos.db')
cursor = conn.cursor()

try:
    # Add is_archived column with default value False (0)
    cursor.execute("ALTER TABLE items ADD COLUMN is_archived INTEGER DEFAULT 0")
    print("Column 'is_archived' added successfully!")
except Exception as e:
    print(f"Error adding is_archived: {e}")
    print("(Column might already exist)")

conn.commit()
conn.close()

print("\nMigration completed!")
