from database import engine, Base
from models import User, Item, Expense, PendingInvitation
import sys

def init_database():
    try:
        print("Conectando a PostgreSQL...")
        
        # Crear todas las tablas
        Base.metadata.create_all(bind=engine)
        
        print("Base de datos inicializada exitosamente!")
        print("Todas las tablas creadas en PostgreSQL")
        
        # Verificar conexión
        from sqlalchemy import text
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            print(f"PostgreSQL version: {version}")
            
        print("\nConexion exitosa a PostgreSQL en Easypanel!")
        
    except Exception as e:
        print(f"Error al inicializar la base de datos: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    init_database()
