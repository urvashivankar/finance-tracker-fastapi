#  FinanceFlow | Elite Tracking System

A production-grade, full-stack financial dashboard designed to demonstrate professional engineering standards in **Python**, **FastAPI**, **CORS**, **JWT Security**, and **Clean Architecture**.

---

##  Project Architecture & Design

The system follows a rigorous **Separation of Concerns** (SoC) model to ensure high maintainability and testability:

- **`main.py`**: High-level application initialization, middleware (CORS) configuration, and router aggregation.
- **`routes/`**: Modular API endpoints handling HTTP requests and role-based validation.
- **`services/`**: Pure business logic layer. Handles complex arithmetic, filtering, and data aggregation away from the HTTP controllers.
- **`models.py`**: Precise SQLAlchemy ORM mappings for **MySQL** persistence.
- **`schemas.py`**: Pydantic DTO (Data Transfer Object) layer for strict request/response validation.
- **`utils/`**: Reusable security dependencies for JWT decoding and RBAC (Role-Based Access Control) enforcement.
- **`frontend/`**: A modern, decoupled client using Vanilla JS and CSS Grid/Flexbox with a premium glassmorphic aesthetic.

---

##  Premium Capabilities

### 1. Robust RBAC (Role-Based Access Control)
The system enforces strict permission boundaries at the **API layer**:
- **Admin**: Full authority. Can create, view, search, and delete any transaction.
- **Analyst**: Shared visibility. Access to all filters and analytics, but restricted from adding/deleting data.
- **Viewer**: Read-only oversight. Full visibility into history, but blocked from all editing or filtering logic.

### 2. High-Performance APIs
- **Streaming Export**: Transaction CSVs are generated via **Python Generators**, allowing for memory-efficient data streaming over the network.
- **Intelligent Pagination**: Prevents frontend lag by serving data in indexed blocks (`skip`/`limit`).
- **Deep Search**: Database-level substring searching using `ilike` patterns.

### 3. State-of-the-Art UX
- **Glassmorphism Design**: A sleek, dark-violet theme with frosted-glass containers.
- **Custom Select Components**: Replaced chunky native browser dropdowns with smooth, themed selection menus.
- **Dynamic Role Sync**: The UI programmatically adapts its visibility based on real roles fetched from the backend `/users/me` profile endpoint.

---

##  Local Installation & Launch

### Prerequisites
- Python 3.10+
- MySQL Server (locally running or cloud-based)

### 1. Environment Setup
Install the necessary Python packages:
```bash
pip install -r requirements.txt
```

### 2. Database Configuration
Create a `.ENV` file in the root directory (based on `.env.example`):
```env
DATABASE_URL=mysql+pymysql://<user>:<pass>@localhost/finance_db
SECRET_KEY=yoursecretkeyhere
ALGORITHM=HS256
```

### 3. Start the Ecosystem
Launch the FastAPI backend:
```bash
uvicorn main:app --reload
```

