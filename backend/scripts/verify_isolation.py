
from sqlmodel import Session, select
from app.database import engine
from app.models.company import Company
from app.models.user import User, UserRole
from app.models.org_structure import Branch
from app.api.v1.org_structure import read_branches

class MockUser:
    def __init__(self, id, role, company_id):
        self.id = id
        self.role = role
        self.company_id = company_id

def cleanup(session):
    print("Cleaning up test data...")
    session.exec(select(Branch).where(Branch.code.in_(["TEST-A", "TEST-B"]))).all()
    # cascade delete should handle it if we delete companies, but let's be careful.
    
def verify_isolation():
    with Session(engine) as session:
        print("--- Setting up Test Data ---")
        
        # 1. Create Companies
        comp_a = Company(name="Test Company A", domain="test-a.com")
        comp_b = Company(name="Test Company B", domain="test-b.com")
        session.add(comp_a)
        session.add(comp_b)
        session.commit()
        session.refresh(comp_a)
        session.refresh(comp_b)
        
        # 2. Create Branches
        br_a = Branch(name="Branch A", code="TEST-A", company_id=comp_a.id)
        br_b = Branch(name="Branch B", code="TEST-B", company_id=comp_b.id)
        session.add(br_a)
        session.add(br_b)
        session.commit()
        
        print(f"Created Company A ({comp_a.id}) with Branch A")
        print(f"Created Company B ({comp_b.id}) with Branch B")
        
        # 3. Create Mock Users
        admin_a = MockUser(id=1, role=UserRole.ADMIN, company_id=comp_a.id)
        admin_b = MockUser(id=2, role=UserRole.ADMIN, company_id=comp_b.id)
        super_admin = MockUser(id=3, role=UserRole.SUPER_ADMIN, company_id=None)
        
        print("\n--- Verifying Logic ---")
        
        # Test 1: Admin A reading branches (Should only see A)
        res_a = read_branches(session=session, current_user=admin_a, skip=0, limit=100)
        curr_ids_a = [b.code for b in res_a if b.code in ["TEST-A", "TEST-B"]]
        print(f"Admin A sees: {curr_ids_a}")
        assert "TEST-A" in curr_ids_a
        assert "TEST-B" not in curr_ids_a
        print("PASS: Admin A isolation")

        # Test 2: Admin B reading branches (Should only see B)
        res_b = read_branches(session=session, current_user=admin_b, skip=0, limit=100)
        curr_ids_b = [b.code for b in res_b if b.code in ["TEST-A", "TEST-B"]]
        print(f"Admin B sees: {curr_ids_b}")
        assert "TEST-B" in curr_ids_b
        assert "TEST-A" not in curr_ids_b
        print("PASS: Admin B isolation")

        # Test 3: Super Admin reading all (Should see both)
        res_sa = read_branches(session=session, current_user=super_admin, skip=0, limit=100)
        curr_ids_sa = [b.code for b in res_sa if b.code in ["TEST-A", "TEST-B"]]
        print(f"Super Admin sees: {curr_ids_sa}")
        assert "TEST-A" in curr_ids_sa
        assert "TEST-B" in curr_ids_sa
        print("PASS: Super Admin view all")

        # Test 4: Super Admin filtering for A (Should only see A)
        res_sa_filt = read_branches(session=session, current_user=super_admin, skip=0, limit=100, company_id=comp_a.id)
        curr_ids_sa_filt = [b.code for b in res_sa_filt if b.code in ["TEST-A", "TEST-B"]]
        print(f"Super Admin (Filter A) sees: {curr_ids_sa_filt}")
        assert "TEST-A" in curr_ids_sa_filt
        assert "TEST-B" not in curr_ids_sa_filt
        print("PASS: Super Admin filter")
        
        # Cleanup
        session.delete(br_a)
        session.delete(br_b)
        session.delete(comp_a)
        session.delete(comp_b)
        session.commit()
        print("\n--- Cleanup Complete ---")
        print("ALL TESTS PASSED")

if __name__ == "__main__":
    try:
        verify_isolation()
    except Exception as e:
        print(f"TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
