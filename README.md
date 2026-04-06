# Personal Finance Management API

A RESTful API for managing personal finances. This project allows users to track income, expenses, categories, and account balances. The API supports role-based access control (Admin, Analyst, Viewer) and ensures data integrity for transactions.

---

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Setup & Installation](#setup--installation)
- [Database Design](#database-design)
- [API Endpoints](#api-endpoints)
- [Authentication & Authorization](#authentication--authorization)
- [Assumptions & Trade-offs](#assumptions--trade-offs)
- [Postman Collection](#postman-collection)
- [Folder Structure](#folder-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- User management with roles: **Admin**, **Analyst**, **Viewer**
- Add, update, delete, and view **transactions**
- Manage **categories** of income and expenses
- Real-time balance calculation and validation
- Role-based access control
- Validation for transaction amounts, type, and categories
- PostgreSQL database with indexes for performance

---

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Testing**: Postman
- **Environment Variables**: `.env`

---

## Setup & Installation

1. **Clone the repository**

```bash
git clone https://github.com/<your-username>/personal-finance-api.git
cd personal-finance-api
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the root directory:

```env
PG_USER=your_postgres_user
PG_PASSWORD=your_postgres_password
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=personal_finance
JWT_SECRET=your_jwt_secret
PORT=5000
```

4. **Setup Database**

```bash
psql -U <your_user> -d <your_database> -f db_setup.sql
```

5. **Start the server**

```bash
npm start
```

Server will run at `http://localhost:5000`.

---

## Database Design

The database has 5 tables:

- **roles** – Stores user roles: Admin, Analyst, Viewer
- **users** – Stores user credentials and role references
- **categories** – Stores income/expense categories per user
- **transactions** – Records all user transactions
- **balances** – Tracks user’s current balance

Indexes are added on `transactions` for performance on `user_id`, `category_id`, and `transaction_date`.

---

## API Endpoints

### Auth

- `POST /auth/register` – Register a new user
- `POST /auth/login` – Login and get JWT token

### Transactions

- `GET /transactions` – Get all transactions (role-based)
- `POST /transactions` – Create a new transaction
- `PATCH /transactions/:id` – Update a transaction
- `DELETE /transactions/:id` – Delete a transaction

### Categories

- `GET /categories` – List categories
- `POST /categories` – Create a new category
- `PATCH /categories/:id` – Update category
- `DELETE /categories/:id` – Delete category

---

## Authentication & Authorization

- Uses JWT tokens in `Authorization` header
- Role-based access control:
  - **Admin** – Full access
  - **Analyst** – Read and insights access
  - **Viewer** – Read-only access

---

## Assumptions & Trade-offs

- Transactions cannot cause negative balance
- Category names are unique per user
- Only one balance per user
- Chose PostgreSQL for relational consistency and transaction support
- Using `numeric` for amounts to prevent floating-point errors

---

## Postman Collection

- Import the provided `postman_collection.json` to test all endpoints with sample requests.

---

## Folder Structure

```
fintech/
├── config/
│   └── db.js
├── controllers/
├── middleware/
├── models/
├── routes/
├── utils/
├── .env
├── package.json
├── server.js
└── README.md
```

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License.
