from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routes import user_routes, transaction_routes, summary_routes

# Initialize DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Finance Tracking System",
    description="A robust backend API for tracking income, expenses, and managing role-based financial summaries.",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user_routes.router)
app.include_router(transaction_routes.router)
app.include_router(summary_routes.router)

@app.get("/")
def root():
    return {"message": "Welcome to the Finance Tracking System API. Visit /docs for documentation."}
