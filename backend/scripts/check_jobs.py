
import sys
import os

# Add backend directory to sys.path
sys.path.append(os.getcwd())

from sqlmodel import Session, select
from app.database import engine
from app.models.user import User
from app.models.company import Company
from custom_addons.monday_connector.models import MondaySyncJob, MondayBoard
from datetime import datetime

def check_jobs():
    with Session(engine) as session:
        # Check Jobs
        jobs = session.exec(select(MondaySyncJob).order_by(MondaySyncJob.created_at.desc()).limit(10)).all()
        print(f"--- Recent Sync Jobs (Top 10) ---")
        for job in jobs:
            print(f"ID: {job.id} | Board: {job.board_id} | Status: {job.status} | Created: {job.created_at}")

        # Check Boards
        boards = session.exec(select(MondayBoard)).all()
        print(f"\n--- Monday Boards ---")
        for b in boards:
            print(f"ID: {b.id} | Name: {b.name} | Items: {len(b.items)}")

if __name__ == "__main__":
    check_jobs()
