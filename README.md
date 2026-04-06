# Finance Data Processing and Access Control Backend

A RESTful API for managing personal finances. This project allows users to track income, expenses, categories, and account balances with secure role-based access control.

---

## Roles & Permissions

- **ADMIN** → Full access (users, transactions, categories)
- **ANALYST** → Read-only access and insights
- **VIEWER** → View transactions only

---

## Features

### User Management

- Create, update, delete, and view users (Admin only)
- Role-based permissions (Admin, Analyst, Viewer)
- User status management (active/inactive)

---

### Transaction Management

- Create, update, delete, and view transactions
- Supports income & expense tracking
- Prevents negative balances
- Validates transaction data (amount, type, category)

---

### Category Management

- Create, update, delete categories
- Supports income & expense types
- Ensures unique category names per user

---

### Real-Time Balance Tracking

- Automatically updates balance on:
  - Transaction creation
  - Transaction update
  - Transaction deletion
- Uses database transactions for concurrency safety

---

### Security & Access Control

- JWT-based authentication
- Role-Based Access Control (RBAC)
- Protected API endpoints

---

### Performance Optimizations

- Indexed columns:
  - `user_id`
  - `category_id`
  - `transaction_date`
- Optimized PostgreSQL relational design

---

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT
- **Security**: Bcrypt
- **Testing**: Postman

---

## Setup & Installation

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/DHARANI-0101/zorvyn-fintech.git
cd zorvyn-fintech
```

---

### 2️⃣ Install Dependencies

```bash
npm install
```

---

### 3️⃣ Configure Environment Variables

Create a `.env` file:

```env
PG_USER=your_postgres_user
PG_PASSWORD=your_postgres_password
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=fintech
JWT_SECRET=your_jwt_secret
PORT=5000
```

---

### 4️⃣ Setup Database

Run the following SQL:

```sql
-- ROLES
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO roles (name) VALUES ('ADMIN'), ('ANALYST'), ('VIEWER');

-- USERS
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role_id INT REFERENCES roles(id),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CATEGORIES
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('income', 'expense')) NOT NULL,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, created_by)
);

-- TRANSACTIONS
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) CHECK (amount > 0),
    type VARCHAR(20) CHECK (type IN ('income', 'expense')),
    category_id INT REFERENCES categories(id),
    note TEXT,
    transaction_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- BALANCES
CREATE TABLE balances (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    current_balance NUMERIC(14,2) DEFAULT 0
);

-- INDEXES
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_category ON transactions(category_id);
```

---

### 5️⃣ Start the Server

```bash
npm start
```

Server runs at:

```
http://localhost:5000
```

---

## Authentication

### ➤ Login

```
POST /auth/login
```

**Request**

```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Response**

```json
{
  "message": "Login successful",
  "token": "JWT_TOKEN"
}
```

Use token in headers:

```
Authorization: Bearer JWT_TOKEN
```

---

## User APIs (Admin Only)

| Method | Endpoint            | Description    |
| ------ | ------------------- | -------------- |
| POST   | `/users`            | Create user    |
| GET    | `/users`            | Get all users  |
| GET    | `/users/:id`        | Get user by ID |
| PUT    | `/users/:id`        | Update user    |
| PATCH  | `/users/:id/status` | Update status  |

---

## Category APIs

| Method | Endpoint          | Description     |
| ------ | ----------------- | --------------- |
| POST   | `/categories`     | Create category |
| GET    | `/categories`     | Get categories  |
| PUT    | `/categories/:id` | Update category |
| DELETE | `/categories/:id` | Delete category |

---

## Transaction APIs

| Method | Endpoint            | Description        |
| ------ | ------------------- | ------------------ |
| POST   | `/transactions`     | Create transaction |
| GET    | `/transactions`     | Get transactions   |
| PUT    | `/transactions/:id` | Update transaction |
| PATCH  | `/transactions/:id` | Partial update     |
| DELETE | `/transactions/:id` | Delete transaction |

### Filters

```
?type=income
?category_id=1
?startDate=2025-01-01&endDate=2025-01-31
```

---

## Dashboard API

```
GET /dashboard
```

### Response (User)

```json
{
  "role": "USER",
  "totalIncome": 10000,
  "totalExpense": 4000,
  "netBalance": 6000
}
```

### Response (Admin / Analyst)

```json
{
  "role": "ADMIN",
  "totalIncome": 10000,
  "totalExpense": 4000,
  "netBalance": 6000,
  "categoryWise": [],
  "monthlyTrends": [],
  "weeklyTrends": [],
  "recentActivity": []
}
```

---

## Role-Based Access

| Role    | Permissions      |
| ------- | ---------------- |
| ADMIN   | Full access      |
| ANALYST | Read + analytics |
| VIEWER  | Dashboard only   |

---

## Business Logic

### Balance Handling

- Income → Adds balance
- Expense → Deducts balance
- Update → Recalculates balance
- Delete → Reverts balance

---

### Security

- Passwords hashed using bcrypt
- JWT authentication
- Protected routes

---

### Data Integrity

- DB transactions prevent race conditions
- Foreign key validation
- Duplicate prevention

---

## Rate Limiting

- Login: **10 requests / 15 mins**
- API: **100 requests / 15 mins**

---

## Assumptions & Trade-offs

### Assumptions

- Each user has a **single balance record**, maintained in the `balances` table.
- Transactions are always linked to a **valid category** and a **valid user**.
- Categories are **user-specific** (same category name can exist for different users).
- Only **ADMIN** users can create, update, or delete critical data (users, categories, transactions).
- **ANALYST** and **VIEWER** roles are restricted to read-only operations.
- All financial operations assume **positive transaction amounts**.
- The system assumes **trusted server-side validation** (client input is always validated on backend).
- JWT tokens are assumed to be **securely stored and transmitted** by the client.

---

### Trade-offs

#### 1. Real-Time Balance vs Derived Balance

- **Chosen**: Store `current_balance` in a separate table
- **Trade-off**:
  - ✅ Faster reads (no need to sum all transactions)
  - ❌ Requires careful updates during create/update/delete

---

#### 2. Soft Delete vs Hard Delete

- **Chosen**: Soft delete (`is_deleted` flag)
- **Trade-off**:
  - ✅ Data recovery & audit support
  - ❌ Slightly more complex queries (need filtering)

---

#### 3. Role-Based Access at API Layer

- **Chosen**: Middleware-based RBAC
- **Trade-off**:
  - ✅ Clean and centralized access control
  - ❌ Requires strict discipline across all routes

---

#### 4. Transaction Safety vs Performance

- **Chosen**: Database transactions (`BEGIN`, `COMMIT`, `ROLLBACK`)
- **Trade-off**:
  - ✅ Prevents race conditions and ensures consistency
  - ❌ Slight overhead on high-frequency operations

---

#### 5. Precomputed Dashboard vs On-Demand Queries

- **Chosen**: On-demand aggregation queries
- **Trade-off**:
  - ✅ Always accurate real-time insights
  - ❌ Slower than cached/precomputed analytics

---

#### 6. JWT Stateless Auth vs Session-Based Auth

- **Chosen**: JWT authentication
- **Trade-off**:
  - ✅ Scalable and stateless
  - ❌ Token revocation is harder without additional mechanisms

---

#### 7. Strict Validation vs Flexibility

- **Chosen**: Strong validation rules
- **Trade-off**:
  - ✅ Ensures data integrity
  - ❌ Less flexible for edge/custom cases

---

## Summary

The system prioritizes:

- **Data consistency**
- **Security**
- **Scalability**

over:

- Raw performance optimizations
- Simplicity in some areas (like balance handling)
