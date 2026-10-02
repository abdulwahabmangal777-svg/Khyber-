# Saudi Fleet & Workforce Management System — Backend API

An enterprise-grade, production-ready backend architecture for managing commercial transport fleets, heavy vehicles, driver rosters, and regulatory compliance across the Kingdom of Saudi Arabia (KSA).

Built with **Node.js, TypeScript, Express, PostgreSQL, Prisma ORM, JWT Authentication, and Redis**, with full support for bilingual Saudi plate numbers, 10-digit Iqama validation, MVPI Fahs inspections, Istimara registration tracking, insurance policies, maintenance work orders, fuel economics, and real-time 360° global search.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Prerequisites](#4-prerequisites)
5. [Environment Variables](#5-environment-variables)
6. [Database Setup & Migrations](#6-database-setup--migrations)
7. [Seeding Initial Data](#7-seeding-initial-data)
8. [Running the Application](#8-running-the-application)
9. [API Documentation & Swagger UI](#9-api-documentation--swagger-ui)
10. [Authentication & Authorization (RBAC)](#10-authentication--authorization-rbac)
11. [Expiry Alert Engine Workflow](#11-expiry-alert-engine-workflow)
12. [Background Jobs & Scheduled Compliance Checks](#12-background-jobs--scheduled-compliance-checks)
13. [Secure File Storage & Signed URLs](#13-secure-file-storage--signed-urls)
14. [Testing & Verification](#14-testing--verification)
15. [Production Deployment Guide](#15-production-deployment-guide)

---

## 1. Architecture Overview

```
                          ┌─────────────────────────────┐
                          │   Frontend Clients / Apps   │
                          │  (React / Next.js / Mobile) │
                          └──────────────┬──────────────┘
                                         │ HTTPS / Bearer JWT
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          API Gateway & Security Layer                       │
│  - Helmet Headers      - Rate Limiter (300 req/15m)  - Request Audit Logger │
│  - RBAC Guard          - Input Sanitization          - Lockout Protection   │
└────────────────────────────────────────┬────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Modular API Domain                              │
│  ├── /auth          ├── /vehicles       ├── /workers      ├── /search       │
│  ├── /maintenance   ├── /fuel           ├── /expenses     ├── /reports      │
│  ├── /expiry-alerts ├── /documents      ├── /files        ├── /audit-logs   │
└──────────────────────┬─────────────────┬───────────────────┬────────────────┘
                       │                 │                   │
                       ▼                 ▼                   ▼
      ┌─────────────────────────┐  ┌───────────┐  ┌───────────────────────┐
      │ PostgreSQL via Prisma   │  │   Redis   │  │ Private File Storage  │
      │ - Relational Constraints│  │ - Caching │  │ - S3 / Local Storage  │
      │ - Automated Indexes     │  │ - Queues  │  │ - 15MB Size Limits    │
      │ - Soft-delete Auditing  │  └───────────┘  │ - MIME Type Checking  │
      └─────────────────────────┘                 └───────────────────────┘
```

---

## 2. Tech Stack

- **Runtime**: Node.js v20+ LTS with TypeScript (strict mode enabled).
- **Framework**: Express.js with custom modular middleware and structured error handling.
- **Database & ORM**: PostgreSQL 16+ with Prisma ORM.
- **Authentication**: JWT access tokens (24h) + Refresh token rotation + Bcrypt password hashing + Brute-force lockout.
- **Documentation**: Swagger OpenAPI 3.0 interactive specification at `/api/docs` and `/api/docs/json`.
- **Validation**: Zod schema validation & Saudi-specific validators (10-digit Iqama, Plate mapping).
- **File Management**: Private encrypted storage with MIME verification and time-limited signed download URLs.
- **Containerization**: Multi-stage `Dockerfile` and `docker-compose.yml` (PostgreSQL + Redis + App).

---

## 3. Project Structure

```
├── prisma/
│   ├── schema.prisma          # PostgreSQL schema (Models, Indexes, Constraints)
│   └── seed.ts                # Database seeder with Saudi demo dataset
├── server/
│   ├── config/                # Environment variables and system settings
│   ├── common/                # Standardized response format, error handling, Saudi domain helpers
│   ├── roles/                 # Role-based access control (RBAC) & permission matrix
│   ├── auth/                  # JWT generation, verification, lockout & session service
│   ├── docs/                  # Swagger OpenAPI 3.0 specification
│   ├── db.ts                  # Database persistence engine & schema definitions
│   ├── expiry.ts              # Automated expiry alert computation engine
│   └── routes.ts              # REST API route controllers
├── tests/
│   └── backend.test.ts        # Comprehensive backend automated test suite (10 critical requirements)
├── Dockerfile                 # Production multi-stage container build
├── docker-compose.yml         # Full-stack composition (App, PostgreSQL, Redis)
├── .env.example               # Example environment variables
└── server.ts                  # Application entry point & Vite middleware setup
```

---

## 4. Prerequisites

- **Node.js**: `v20.x` or later.
- **npm**: `v10.x` or later.
- **Docker & Docker Compose** (optional for containerized deployment).
- **PostgreSQL 16+** (if running without Docker).

---

## 5. Environment Variables

Copy `.env.example` to `.env` and configure your credentials:

```bash
cp .env.example .env
```

| Variable | Description | Default / Example |
|---|---|---|
| `NODE_ENV` | Environment mode (`development` / `production`) | `production` |
| `PORT` | HTTP Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://fleet_user:pass@localhost:5432/saudi_fleet_db` |
| `JWT_SECRET` | Secret key for signing access tokens | `saudi_fleet_super_secure_jwt_secret_key_2026_x9910` |
| `JWT_REFRESH_SECRET` | Secret key for refresh tokens | `saudi_fleet_refresh_token_secret_key_2026_r9910` |
| `STORAGE_BUCKET` | S3 bucket name for document archival | `saudi-fleet-documents-prod` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |

---

## 6. Database Setup & Migrations

To apply schema migrations to your PostgreSQL database:

```bash
# Generate Prisma Client
npm run prisma:generate

# Push schema changes to PostgreSQL
npx prisma db push
```

---

## 7. Seeding Initial Data

Seed the database with pre-configured Saudi fleet records, worker profiles, and commercial registrations:

```bash
npm run prisma:seed
```

Default credentials created by seeder:
- **Super Administrator**: `admin` / `admin123` (`abdulwahabmangal777@gmail.com`)
- **Fleet Manager**: `manager` / `manager123` (`tariq@alburaq-transport.sa`)

---

## 8. Running the Application

### Local Development:
```bash
npm install
npm run dev
```

### Production Build & Launch:
```bash
npm run build
npm start
```

### Docker Compose (One-Click Stack):
```bash
docker-compose up -d --build
```

The server binds to `http://0.0.0.0:3000`.

---

## 9. API Documentation & Swagger UI

Interactive Swagger documentation is available out of the box:

- **Swagger UI Explorer**: `http://localhost:3000/api/docs`
- **OpenAPI 3.0 JSON Spec**: `http://localhost:3000/api/docs/json` (or `/api/openapi.json`)

---

## 10. Authentication & Authorization (RBAC)

### Login Endpoint:
`POST /api/auth/login`
```json
{
  "username": "admin",
  "password": "admin123"
}
```

### Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "ref_1772149...",
  "expiresIn": "24h",
  "user": {
    "id": "usr-1",
    "username": "admin",
    "email": "abdulwahabmangal777@gmail.com",
    "fullName": "Abdulwahab Mangal",
    "role": "SUPER_ADMIN",
    "department": "Fleet Operations",
    "status": "ACTIVE"
  }
}
```

Include the token in all subsequent requests:
```http
Authorization: Bearer <accessToken>
```

### Role Hierarchy:
- `SUPER_ADMIN`: Unrestricted global system access.
- `ADMIN`: Complete fleet, workforce, financial, and user management.
- `MANAGER` / `FLEET_MANAGER`: Vehicle operations, driver assignment, maintenance, fuel.
- `HR`: Workforce onboarding, Iqama tracking, contracts, passports.
- `ACCOUNTANT`: Expense logging, fuel analysis, financial reports.
- `VIEWER`: Read-only operational oversight.

---

## 11. Expiry Alert Engine Workflow

The alert engine continuously scans and classifies all documents:

| Days Remaining | Status Code | Alert Level | Action Required |
|---|---|---|---|
| `< 0 days` | `EXPIRED` | **CRITICAL** | Vehicle grounded / Urgent Iqama renewal |
| `0 to 7 days` | `EXPIRING_URGENT` | **HIGH** | Immediate renewal required |
| `8 to 15 days` | `EXPIRING_WARNING` | **MEDIUM** | Approaching deadline notification |
| `16 to 30 days` | `EXPIRING_SOON` | **LOW** | 30-day forward forecast |
| `> 30 days` | `VALID` | **NORMAL** | Fully compliant |

### Endpoints:
- `GET /api/expiry-alerts`: Full list with filters.
- `GET /api/expiry-alerts/expired`: Overdue documents.
- `GET /api/expiry-alerts/7-days`: Expiring within 7 days.
- `GET /api/expiry-alerts/30-days`: Expiring within 30 days.

---

## 12. Background Jobs & Scheduled Compliance Checks

The background alert cron job runs daily at `00:00:00 (Asia/Riyadh)`:
1. Calculates remaining days for every active vehicle and worker.
2. Creates or updates `ExpiryAlert` records without duplicate alert spam.
3. Automatically notifies responsible managers via system notifications and SMS/Email adapters.

---

## 13. Secure File Storage & Signed URLs

- **Private Upload**: `POST /api/files/upload` (accepts PDF, PNG, JPEG up to 15MB).
- **Time-Limited Signed URL**: `GET /api/files/:id/signed-url` (generates HMAC token valid for 15 minutes).
- **Download**: `GET /api/files/:id/download?signature=...` verifies signature before streaming private documents.

---

## 14. Testing & Verification

Run the automated backend test suite covering all 10 essential verification requirements:

```bash
npm test
```

### Test Coverage Checklist:
1. Search vehicle by exact Saudi plate (e.g. `7845 XYZ`)
2. Search worker by exact Iqama number (e.g. `1092837461`)
3. Detect expired registration
4. Detect insurance expiring within 7 days
5. Detect Iqama expiring within 30 days
6. Prevent unauthorized user from deleting vehicles
7. Prevent duplicate plate numbers
8. Prevent duplicate Iqama numbers
9. Verify audit log is created after update
10. Verify dashboard totals

---

## 15. Production Deployment Guide

1. Configure environment variables in `.env`.
2. Ensure PostgreSQL instance is reachable.
3. Build the production bundle: `npm run build`.
4. Run database migrations: `npx prisma db push`.
5. Launch the service with process manager (e.g., PM2 or Docker):
   ```bash
   pm2 start dist/server.cjs --name "saudi-fleet-backend" -i max
   ```
6. Setup Nginx reverse proxy with SSL certificate terminating on port `3000`.
