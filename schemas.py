from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date
from models import TransactionTypeEnum, RoleEnum

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str
    role: Optional[RoleEnum] = RoleEnum.Viewer

class UserResponse(UserBase):
    id: int
    role: RoleEnum

    class Config:
        from_attributes = True

class TransactionBase(BaseModel):
    amount: float = Field(gt=0, description="Amount must be positive")
    type: TransactionTypeEnum
    category: str
    date: date
    description: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0, description="Amount must be positive")
    type: Optional[TransactionTypeEnum] = None
    category: Optional[str] = None
    date: Optional[date] = None
    description: Optional[str] = None

class TransactionResponse(TransactionBase):
    id: int
    user_id: Optional[int] = None

    class Config:
        from_attributes = True

class PaginatedTransactionResponse(BaseModel):
    items: List[TransactionResponse]
    total: int
    page: int
    size: int

class Token(BaseModel):
    access_token: str
    token_type: str

class CategorySummary(BaseModel):
    category: str
    total: float

class MonthlySummary(BaseModel):
    month: str
    total: float

class SummaryResponse(BaseModel):
    total_income: float
    total_expense: float
    current_balance: float
    category_summary: List[CategorySummary]
    monthly_summary: List[MonthlySummary]
    recent_transactions: List[TransactionResponse]
