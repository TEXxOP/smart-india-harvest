from typing import Optional
from sqlmodel import Field, SQLModel
from datetime import datetime

class FarmProfile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)  # Simple string ID for now
    land_size: float
    land_unit: str  # Beegha, Acre, Hectare
    soil_type: Optional[str] = None
    previous_crop: Optional[str] = None
    harvest_date: Optional[str] = None
    current_status: str  # 'Empty', 'Growing'
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CropRecommendation(SQLModel):
    crop_name: str
    reason: str
    confidence: float
