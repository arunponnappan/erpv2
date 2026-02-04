from typing import Optional, List, Dict
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship, Column, JSON

class MondayBoard(SQLModel, table=True):
    id: int = Field(primary_key=True)  # Monday's Board ID (BigInt)
    name: str
    state: str = "active"
    columns: Dict = Field(default={}, sa_column=Column(JSON))  # Snapshot of column definitions
    last_synced_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    items: List["MondayItem"] = Relationship(back_populates="board")


class MondayItem(SQLModel, table=True):
    id: int = Field(primary_key=True)  # Monday's Item ID
    board_id: int = Field(foreign_key="mondayboard.id")
    name: str
    column_values: Dict = Field(default={}, sa_column=Column(JSON))  # Store mapped values {col_id: value}
    assets: Dict = Field(default={}, sa_column=Column(JSON))  # Store images/files {col_id: url}
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    board: MondayBoard = Relationship(back_populates="items")
