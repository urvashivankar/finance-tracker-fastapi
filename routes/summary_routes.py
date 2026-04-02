from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User, RoleEnum
from schemas import SummaryResponse
from utils.dependencies import get_current_user, require_role
from services import summary_service

router = APIRouter(prefix="/summary", tags=["Summary"])

@router.get("", response_model=SummaryResponse)
def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.Viewer, RoleEnum.Analyst, RoleEnum.Admin]))
):
    return summary_service.get_summary(db=db, current_user=current_user)
