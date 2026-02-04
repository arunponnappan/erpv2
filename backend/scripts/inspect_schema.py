from sqlalchemy import inspect
from app.database import engine

def inspect_fks():
    print("--- Inspecting Foreign Keys Referencing 'company' ---")
    inspector = inspect(engine)
    table_names = inspector.get_table_names()
    
    found = False
    for table_name in table_names:
        fks = inspector.get_foreign_keys(table_name)
        for fk in fks:
            if fk['referred_table'] == 'company':
                print(f"Table '{table_name}' has FK to 'company': {fk}")
                found = True
                
    if not found:
        print("No FKs found pointing to 'company' (This implies something is wrong with my check or the schema).")

if __name__ == "__main__":
    inspect_fks()
