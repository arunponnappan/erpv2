import sys
import os
from sqlmodel import Session, select, text

# Ensure we can import from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from app.models.company import Company
from app.models.hr import Employee, Department
from app.models.org_structure import Branch, Designation, JobRole
from app.models.rbac import Permission, Role, RolePermission
from app.models.user import User

def migrate_rbac():
    print("--- Starting RBAC Migration ---")
    
    # 1. Create Tables via SQLModel (Ensure Permission/Role tables exist)
    from sqlmodel import SQLModel
    SQLModel.metadata.create_all(engine)
    print("Created Role, Permission, RolePermission tables.")

    with Session(engine) as session:
        # 2. Add 'role_id' column to User if missing
        try:
            # Check if column exists
            session.exec(text("SELECT role_id FROM user LIMIT 1"))
        except Exception:
            print("Adding role_id column to User table...")
            # SQLite doesn't strictly enforce FK on ALTER TABLE in all versions/modes easily via raw SQL
            # We will add the column without FK constraint first, or recreate table.
            # Simpler approach for dev: Add column, FK constraint is enforced by app logic/SQLModel on new inserts.
            # Real fix for SQLite: Use Alembic or copy-table strategy. 
            # Temporary fix: Add integer column, ignore FK constraint at DB level for now? 
            # Actually, standard SQL: ALTER TABLE user ADD COLUMN role_id INTEGER REFERENCES role(id) works in newer SQLite.
            # If it fails, we just add INTEGER.
            try:
                session.exec(text("ALTER TABLE user ADD COLUMN role_id INTEGER REFERENCES role(id)"))
            except Exception as e:
                print(f"Standard ALTER failed ({e}), trying simple ADD COLUMN...")
                session.exec(text("ALTER TABLE user ADD COLUMN role_id INTEGER"))
            
            session.commit()
            print("Column added.")

        # 3. Seed Permissions
        permissions_list = [
            # User Module
            {"code": "user:read", "module": "users", "name": "View Users"},
            {"code": "user:create", "module": "users", "name": "Create Users"},
            {"code": "user:update", "module": "users", "name": "Edit Users"},
            {"code": "user:delete", "module": "users", "name": "Delete Users"},
            
            # HR Module
            {"code": "employee:read", "module": "hr", "name": "View Employees"},
            {"code": "employee:create", "module": "hr", "name": "Create Employees"},
            {"code": "employee:update", "module": "hr", "name": "Edit Employees"},
            {"code": "employee:delete", "module": "hr", "name": "Delete Employees"},
            
            # Org Module
            {"code": "org:manage", "module": "org", "name": "Manage Org Structure"},
            
            # System
            {"code": "system:config", "module": "system", "name": "System Configuration"},
        ]
        
        for p_data in permissions_list:
            existing = session.exec(select(Permission).where(Permission.code == p_data["code"])).first()
            if not existing:
                p = Permission(**p_data)
                session.add(p)
        
        # 4. Create Default System Roles (optional but good for testing)
        # Create 'Admin' role if not exists
        admin_role = session.exec(select(Role).where(Role.name == "System Admin")).first()
        if not admin_role:
            admin_role = Role(name="System Admin", description="Full Access", is_system_role=True)
            session.add(admin_role)
            session.commit() # Get ID
            session.refresh(admin_role)
            
            # Assign all permissions
            all_perms = session.exec(select(Permission)).all()
            for p in all_perms:
                 session.add(RolePermission(role_id=admin_role.id, permission_id=p.id))

        session.commit()
        print("Seeded Permissions and Default Role.")

    print("--- Migration Complete ---")

if __name__ == "__main__":
    migrate_rbac()
