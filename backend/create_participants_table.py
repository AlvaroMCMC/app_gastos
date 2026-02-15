import sqlite3

conn = sqlite3.connect('app_gastos.db')
cursor = conn.cursor()

try:
    # Create item_participants table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS item_participants (
            item_id VARCHAR NOT NULL,
            user_id VARCHAR NOT NULL,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (item_id, user_id),
            FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    conn.commit()
    print("Table 'item_participants' created successfully!")
except Exception as e:
    print(f"Error: {e}")

conn.close()

print("\nMigration completed!")
