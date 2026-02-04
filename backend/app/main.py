from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlmodel import Session, select

from app.core.config import settings
from app.api.v1 import auth, users, companies, org_structure, rbac

from app.database import create_db_and_tables, engine, get_session
from app.models.user import User, UserRole
from app.models.company import Company
from app.models.org_structure import Branch, Designation, JobRole
from app.models.marketplace import MarketplaceApp
from app.core.security import get_password_hash
from app.core.module_loader import load_addons

# Seeding Logic
def init_db():
    create_db_and_tables()
    with Session(engine) as session:
        # Seed Company
        company = session.exec(select(Company).where(Company.is_default == True)).first()
        if not company:
            company = Company(name="My Company", domain="example.com", is_default=True)
            session.add(company)
            session.commit()
            session.refresh(company)
            
            # Seed Default Branch
            branch = Branch(name="Headquarters", code="HQ", company_id=company.id)
            session.add(branch)
            session.commit()
        
        # Seed Super Admin
        user = session.exec(
            select(User).where(User.email == settings.FIRST_SUPER_ADMIN_EMAIL)
        ).first()
        if not user:
            user = User(
                email=settings.FIRST_SUPER_ADMIN_EMAIL,
                hashed_password=get_password_hash(settings.FIRST_SUPER_ADMIN_PASSWORD),
                role=UserRole.SUPER_ADMIN,
                full_name="Initial Super Admin",
                username="admin",
                company_id=company.id # Link admin to default company
            )
            session.add(user)
            session.add(user)
            session.commit()

        # NOTE: Monday.com seeding is now handled by module_loader via custom_addons/monday_connector

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    load_addons(app)
    yield
    # Shutdown

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://frontend.abuamarllc.com",
        "https://backend.abuamarllc.com",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

from fastapi.staticfiles import StaticFiles
import os

# Create static directory if not exists
# Create static directory if not exists
os.makedirs("static/uploads", exist_ok=True)
os.makedirs("assets", exist_ok=True) # Ensure assets dir exists

# MOUNT STATIC ASSETS
# This allows serving downloaded Monday files from /api/v1/assets
# REMOVED: Redundant non-CORS mount. We use the CORS-enabled mount at /assets at the end of file.
# app.mount(f"{settings.API_V1_STR}/assets", StaticFiles(directory="assets"), name="assets")

app.include_router(auth.router, prefix=settings.API_V1_STR + "/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
# HR Router is now loaded via module_loader
app.include_router(companies.router, prefix=f"{settings.API_V1_STR}/companies", tags=["companies"])
# Employees router is loaded via module_loader through /api/v1/hr
app.include_router(org_structure.router, prefix=f"{settings.API_V1_STR}/org", tags=["org"])
app.include_router(rbac.router, prefix=settings.API_V1_STR, tags=["rbac"])
from app.api.v1 import marketplace
app.include_router(marketplace.router, prefix=f"{settings.API_V1_STR}/marketplace", tags=["marketplace"])

# Monday Connector is loaded via module_loader through /api/v1/integrations/monday

# Load Extraction Tools
# Load Extraction Tools
try:
    print("ATTEMPTING TO LOAD TOOLS ROUTER...", flush=True)
    from app.routers.tools import router as tools_router
    # tools_router has prefix="/tools", so we mount at API_V1_STR
    app.include_router(tools_router, prefix=settings.API_V1_STR)
    print("MANUAL LOAD: Loaded tools router", flush=True)
except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"FAILED TO LOAD TOOLS ROUTER: {e}", flush=True)

# Mount Static Files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Mount Assets (Monday Images)
# Mount Assets (Monday Images)
os.makedirs("assets", exist_ok=True)

from starlette.responses import Response

class CORSStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        response.headers["Access-Control-Allow-Origin"] = "*"
        return response

app.mount("/assets", CORSStaticFiles(directory="assets"), name="assets")

@app.get("/")
def read_root():
    return {"message": "Welcome to Internal Company App API"}
