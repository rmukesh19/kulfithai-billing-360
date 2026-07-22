# Billing360 Enterprise ERP & GST Billing Engine
Production-Ready Node.js + Express.js + MySQL Backend Suite with JWT-Based RBAC.

---

## 🌟 Architectural Features

1. **Normalized MySQL Relational Tables**: Built with triggers, indexes, cascade updates, and primary/foreign key strict mappings.
2. **Double-Entry Ledger Tracking**: Customer and supplier accounting transactions post debits/credits concurrently against invoice creation.
3. **Automated HSN & GST Calculator**: Precision calculation of CGST, SGST, IGST tax buckets.
4. **JWT-Armed Role-Based Access Control (RBAC)**: Supports roles like `SuperAdmin`, `Admin`, `Manager`, and `Cashier` with granular endpoint locks.
5. **Auto-Numbering Pipeline**: Real-time generation of custom chronological series based on financial year and distinct branches.
6. **Thread-Safe Inventory deducts**: Utilizes `FOR UPDATE` transaction locks to prevent concurrency issues during hot-item POS checkout.

---

## 📁 System Folder Structure
Located at `/billing360-backend`:

```text
billing360-backend/
├── src/
│   ├── config/
│   │   └── database.ts        # DoublePool connection (MySQL + Resilient Memory Fallback)
│   ├── middleware/
│   │   ├── auth.ts            # JWT Verifier and RBAC Roles guard
│   │   ├── errorHandler.ts    # Central Express Global Error Interceptor
│   │   └── logger.ts          # Request logs, execution timestamps & DB audit logger
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── billingController.ts
│   │   ├── gstController.ts
│   │   ├── inventoryController.ts
│   │   └── dashboardController.ts
│   ├── routes/
│   │   ├── api.ts             # REST route aggregator
│   │   ├── authRoutes.ts
│   │   ├── billingRoutes.ts
│   │   ├── gstRoutes.ts
│   │   └── inventoryRoutes.ts
│   ├── models/
│   │   └── schema.sql         # Relational tables, schemas, indexes, and master constraints
│   └── index.ts               # Express primary server entry block
├── .env.example               # Standard environment flags
├── package.json               # Backend compilation dependencies
├── tsconfig.json              # Compiler regulations
└── postman_collection.json    # Complete suite of REST testing endpoints
```

---

## 🚀 Setting Up the Backend

### 1. Requirements
Ensure your server environment has the following installed:
* **Node.js**: v18.x or v20.x+
* **MySQL**: Server 8.0+

### 2. Prepare Environment File
Copy the configuration template:
```bash
cp .env.example .env
```
Update `.env` parameters with your target MySQL credentials, JWT secure keys, and mail configurations.

### 3. Initialize Relational Database
Log into your MySQL shell and load the normalized tables schema:
```bash
mysql -u root -p < src/models/schema.sql
```
This builds your tables, adds optimized search indexes, and bootstraps the initial SuperAdmin account with password `admin123`.

### 4. Install Dependencies
```bash
npm install
```

### 5. Launch the Server

* **Development (Auto-reload Watch mode)**:
  ```bash
  npm run dev
  ```
* **Production Build & Dist Launch**:
  ```bash
  npm run build
  npm run start
  ```

---

## 🎯 Central Endpoints Registry

### 1. User Authentication Module
* **POST** `/api/auth/register` - SignUp employee account
* **POST** `/api/auth/login` - Authenticate account, receive active JWT
* **GET** `/api/auth/profile` - Verify profile payload

### 2. Checkout / Tax Billing Module
* **POST** `/api/billing/create` - Process items checkout, calculate CGST/SGST, adjust stock, insert ledger credits.
* **GET** `/api/billing/list` - Query paginated invoices (filters: customer, status)
* **GET** `/api/billing/:id/pdf` - Print HTML TAX invoice copy

### 3. Inventory Control
* **GET** `/api/inventory/stock-list` - Query warehouse stock (filters: lowStockOnly, barcode scan)
* **POST** `/api/inventory/adjust` - Replenish/reduce product stock levels with notes
* **POST** `/api/inventory/transfer` - Shift units between branches safely

### 4. GSTR Tax Filing Module
* **GET** `/api/gst/gstr1` - Outward sales B2B vs B2C tax rate mappings
* **GET** `/api/gst/gstr2` - Supplier inward tax matching GSTR-2 formats
* **GET** `/api/gst/gstr3b` - Calculated CGST/SGST offset results
* **GET** `/api/gst/hsn-summary` - Aggregate values grouped by catalog HSN code

---

## 🛡️ Production Deployment Guide

### Option A: PM2 Process Manager
PM2 handles automatic system startup orchestration and clustering:

```bash
# Install PM2 globally
npm install pm2 -g

# Feed build compiler output
npm run build

# Start clusters
pm2 start dist/index.js --name "billing360-api" -i max

# Freeze execution states
pm2 save
pm2 startup
```

### Option B: Containerized Docker Deployment
Build robust container images containing clean Node.js environments:

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 5000
CMD ["npm", "run", "start"]
```

```bash
# Build & Run Container Orchestrator
docker build -t billing360-api:latest .
docker run -d --name billing360-prod -p 5000:5000 --env-file .env billing360-api:latest
```
