import sqlite3

conn = sqlite3.connect('app_gastos.db')
cursor = conn.cursor()

try:
    # Add selected_participants column
    cursor.execute("ALTER TABLE expenses ADD COLUMN selected_participants TEXT")
    print("Column 'selected_participants' added successfully!")
except Exception as e:
    print(f"Error adding selected_participants: {e}")
    print("(Column might already exist)")

conn.commit()
conn.close()

print("\nMigration completed!")
