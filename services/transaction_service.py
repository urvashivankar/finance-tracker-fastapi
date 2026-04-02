from sqlalchemy.orm import Session
from models import Transaction, User, RoleEnum
from schemas import TransactionCreate, TransactionUpdate
from datetime import date
from typing import Optional, List

def get_transactions(
    db: Session,
    current_user: User,
    skip: int = 0,
    limit: int = 10000,
    type_filter: Optional[str] = None,
    category_filter: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    search_query: Optional[str] = None,
) -> tuple[int, List[Transaction]]:
    query = db.query(Transaction)
    
    # Remove role-based restriction for shared visibility
    # if current_user.role == RoleEnum.Viewer:
    #     query = query.filter(Transaction.user_id == current_user.id)
    
    if type_filter:
        query = query.filter(Transaction.type == type_filter)
    if category_filter:
        query = query.filter(Transaction.category == category_filter)
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)
    if search_query:
        search_pattern = f"%{search_query}%"
        query = query.filter(Transaction.description.ilike(search_pattern))
        
    total = query.count()
    items = query.order_by(Transaction.date.desc()).offset(skip).limit(limit).all()
    return total, items

def create_transaction(db: Session, transaction: TransactionCreate, user_id: int):
    db_transaction = Transaction(**transaction.model_dump(), user_id=user_id)
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

def get_transaction_by_id(db: Session, transaction_id: int, current_user: User):
    query = db.query(Transaction).filter(Transaction.id == transaction_id)
    # Allowing shared read-access for Viewers
    # if current_user.role == RoleEnum.Viewer:
    #      query = query.filter(Transaction.user_id == current_user.id)
    return query.first()

def update_transaction(db: Session, db_transaction: Transaction, transaction_update: TransactionUpdate):
    update_data = transaction_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_transaction, key, value)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

def delete_transaction(db: Session, db_transaction: Transaction):
    db.delete(db_transaction)
    db.commit()
