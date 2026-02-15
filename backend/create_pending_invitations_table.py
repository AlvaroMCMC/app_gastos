import sqlite3

conn = sqlite3.connect('app_gastos.db')
cursor = conn.cursor()

try:
    # Create pending_invitations table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pending_invitations (
            id VARCHAR PRIMARY KEY,
            item_id VARCHAR NOT NULL,
            email VARCHAR NOT NULL,
            invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
        )
    """)
    conn.commit()
    print("Table 'pending_invitations' created successfully!")
except Exception as e:
    print(f"Error: {e}")

conn.close()

print("\nMigration completed!")
