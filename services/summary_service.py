from sqlalchemy.orm import Session
from sqlalchemy import func
from models import Transaction, TransactionTypeEnum, User, RoleEnum
from schemas import SummaryResponse, CategorySummary, MonthlySummary

def get_summary(db: Session, current_user: User):
    query = db.query(Transaction)
        
    income_query = query.filter(Transaction.type == TransactionTypeEnum.Income)
    expense_query = query.filter(Transaction.type == TransactionTypeEnum.Expense)
    
    total_income = income_query.with_entities(func.sum(Transaction.amount)).scalar() or 0.0
    total_expense = expense_query.with_entities(func.sum(Transaction.amount)).scalar() or 0.0
    current_balance = total_income - total_expense
    
    category_data = query.with_entities(
        Transaction.category, func.sum(Transaction.amount).label("total")
    ).group_by(Transaction.category).all()
    
    category_summary = [CategorySummary(category=row[0], total=row[1]) for row in category_data if row[0] is not None]
    
    if db.bind.dialect.name == 'sqlite':
        month_expr = func.strftime('%Y-%m', Transaction.date)
    else:
        month_expr = func.date_format(Transaction.date, '%Y-%m')
        
    monthly_data = query.with_entities(
        month_expr.label('month'),
        func.sum(Transaction.amount).label('total')
    ).group_by('month').order_by('month').all()
    
    monthly_summary = [MonthlySummary(month=row[0], total=row[1]) for row in monthly_data if row[0] is not None]
    
    recent_transactions = query.order_by(Transaction.date.desc(), Transaction.id.desc()).limit(5).all()
    
    return SummaryResponse(
        total_income=total_income,
        total_expense=total_expense,
        current_balance=current_balance,
        category_summary=category_summary,
        monthly_summary=monthly_summary,
        recent_transactions=recent_transactions
    )
