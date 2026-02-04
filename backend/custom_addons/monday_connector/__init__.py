from .routes import router
from .models import MondayBoard, MondayItem
from .migrate import migrate_monday_schema

# Auto-migrate schema on load
migrate_monday_schema()
