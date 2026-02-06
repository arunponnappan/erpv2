from typing import Optional, List, Dict
from datetime import datetime
import uuid
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, JSON, BigInteger, ForeignKey

class MondayBoard(SQLModel, table=True):
    __tablename__ = "monday_board_v3"
    id: int = Field(sa_column=Column(BigInteger(), primary_key=True))  # Monday's Board ID (BigInt)
    name: str
    state: str = "active"
    columns: Dict = Field(default={}, sa_column=Column(JSON))  # Snapshot of column definitions
    last_synced_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Sync Stats
    last_sync_item_count: int = Field(default=0)
    last_sync_size_bytes: int = Field(default=0, sa_column=Column(BigInteger()))
    last_sync_optimized_size_bytes: int = Field(default=0, sa_column=Column(BigInteger()))
    last_sync_original_size_bytes: int = Field(default=0, sa_column=Column(BigInteger()))
    
    # Relationships
    items: List["MondayItem"] = Relationship(back_populates="board")


class MondayItem(SQLModel, table=True):
    __tablename__ = "monday_item_v3"
    id: int = Field(sa_column=Column(BigInteger(), primary_key=True))  # Monday's Item ID
    board_id: int = Field(sa_column=Column(BigInteger(), ForeignKey("monday_board_v3.id")))
    name: str
    column_values: Dict = Field(default={}, sa_column=Column(JSON))  # Store mapped values {col_id: value}
    assets: Dict = Field(default={}, sa_column=Column(JSON))  # Store images/files {col_id: url}
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    board: MondayBoard = Relationship(back_populates="items")


class MondayBoardAccess(SQLModel, table=True):
    __tablename__ = "monday_board_access_v3"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True) 
    board_id: int = Field(sa_column=Column(BigInteger(), ForeignKey("monday_board_v3.id")))
    granted_by: Optional[int] = Field(default=None, foreign_key="user.id")
    granted_at: datetime = Field(default_factory=datetime.utcnow)

class MondaySyncJob(SQLModel, table=True):
    __tablename__ = "monday_sync_job"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    board_id: int = Field(sa_column=Column(BigInteger(), index=True))
    status: str = Field(default="pending") # pending, running, complete, failed
    progress_message: str = Field(default="Queued...")
    logs: List[str] = Field(default=[], sa_column=Column(JSON))
    stats: Dict = Field(default={}, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    created_by: Optional[int] = Field(default=None, foreign_key="user.id")


class MondayBarcodeConfig(SQLModel, table=True):
    __tablename__ = "monday_barcode_config"
    id: Optional[int] = Field(default=None, primary_key=True)
    board_id: int = Field(sa_column=Column(BigInteger(), unique=True))
    barcode_column_id: str
    search_column_id: Optional[str] = None # Column to search against (defaults to Name if None)
    sort_column_id: Optional[str] = Field(default="name") # Default sort column
    sort_direction: str = Field(default="asc") # asc or desc
    display_column_ids: List[str] = Field(default=[], sa_column=Column(JSON))
    is_mobile_active: bool = Field(default=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

