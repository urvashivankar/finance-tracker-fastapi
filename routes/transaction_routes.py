from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
import csv
from io import StringIO
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from database import get_db
from models import User, RoleEnum
from schemas import TransactionCreate, TransactionResponse, TransactionUpdate, PaginatedTransactionResponse
from utils.dependencies import get_current_user, require_role
from services import transaction_service

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.get("", response_model=PaginatedTransactionResponse)
def read_transactions(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    type: Optional[str] = None,
    category: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total, items = transaction_service.get_transactions(
        db=db,
        current_user=current_user,
        skip=skip,
        limit=limit,
        type_filter=type,
        category_filter=category,
        start_date=start_date,
        end_date=end_date,
        search_query=search
    )
    page = (skip // limit) + 1 if limit > 0 else 1
    return {"items": items, "total": total, "page": page, "size": limit}

@router.get("/export", response_class=StreamingResponse)
def export_transactions_csv(
    skip: int = 0,
    limit: int = 10000,
    search: Optional[str] = None,
    type: Optional[str] = None,
    category: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total, transactions = transaction_service.get_transactions(
        db=db, current_user=current_user, skip=skip, limit=limit,
        type_filter=type, category_filter=category, start_date=start_date, end_date=end_date, search_query=search
    )
    
    def iter_csv():
        file = StringIO()
        writer = csv.writer(file)
        writer.writerow(["ID", "Date", "Type", "Category", "Description", "Amount"])
        yield file.getvalue()
        file.seek(0)
        file.truncate(0)
        
        for tx in transactions:
            writer.writerow([tx.id, tx.date.strftime("%Y-%m-%d"), tx.type, tx.category, tx.description or "", tx.amount])
            yield file.getvalue()
            file.seek(0)
            file.truncate(0)

    response = StreamingResponse(iter_csv(), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=transactions_export.csv"
    return response

@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    transaction: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.Admin]))
):
    return transaction_service.create_transaction(db=db, transaction=transaction, user_id=current_user.id)

@router.put("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: int,
    transaction_update: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.Admin]))
):
    db_transaction = transaction_service.get_transaction_by_id(db, transaction_id, current_user)
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return transaction_service.update_transaction(db, db_transaction, transaction_update)

@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.Admin]))
):
    db_transaction = transaction_service.get_transaction_by_id(db, transaction_id, current_user)
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    transaction_service.delete_transaction(db, db_transaction)
    return None
