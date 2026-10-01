# NexoraHub — Full-Stack E-Commerce Platform

A production-hardened e-commerce platform with three independent applications: a customer storefront, an admin console, and a shared REST API backed by SQL Server.

| App | Role | Tech | Port |
|---|---|---|---|
| [`backend/`](backend) | REST API for both frontends | Node.js, Express, TypeScript, MSSQL | **5000** |
| [`Frontend/`](Frontend) | Admin console (staff-only) | Next.js 16, React 19 | **3000** |
| [`Frontend_Node/`](Frontend_Node) | Customer storefront | Next.js 15, React 19 | **3001** |

Each app runs on a **fixed, distinct port** so all three can run side by side on one machine without collisions.

---

## Table of Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
  - [1. Database (SQL Server)](#1-database-sql-server)
  - [2. Backend](#2-backend)
  - [3. Admin Frontend](#3-admin-frontend)
  - [4. Customer Frontend](#4-customer-frontend)
- [Environment Variables](#environment-variables)
- [Database Schema & Seeding](#database-schema--seeding)
- [Creating the First Admin Account](#creating-the-first-admin-account)
- [API Overview](#api-overview)
- [Project Structure](#project-structure)
- [Security](#security)
- [Available Scripts](#available-scripts)
- [Troubleshooting](#troubleshooting)

---

## Architecture

```
┌─────────────────────┐        ┌──────────────────────┐
│   Frontend (admin)  │        │ Frontend_Node (shop)  │
│   Next.js — :3000    │        │  Next.js — :3001       │
└──────────┬───────────┘        └───────────┬────────────┘
           │  legacy /api/*                 │  /api/v1/customer/*
           │  (JWT: JWT_ADMIN_SECRET)        │  (JWT: JWT_SECRET)
           └───────────────┬─────────────────┘
                           ▼
                 ┌────────────────────┐
                 │      backend        │
                 │  Express — :5000     │
                 └──────────┬───────────┘
                            ▼
                 ┌────────────────────┐
                 │  SQL Server (MSSQL) │
                 │   NexoraHub_DB       │
                 └────────────────────┘
```

The backend serves **two independent, cryptographically isolated API trees** from one process:

- **`/api/*`** — the legacy/admin surface. Consumed only by the admin console (`Frontend/`). Tokens are signed with `JWT_ADMIN_SECRET` and carry `audience: nexora:admin`.
- **`/api/v1/customer/*`** — the customer surface. Consumed only by the storefront (`Frontend_Node/`). Tokens are signed with `JWT_SECRET` and carry `audience: nexora:customer`.

A token minted for one tree is cryptographically rejected by the other — an admin token cannot be replayed against customer endpoints and vice versa, even though both realms share the same `Users` table.

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| [Node.js](https://nodejs.org) | ≥ 18 | Required by all three apps |
| [Microsoft SQL Server](https://www.microsoft.com/sql-server) | 2019+ | Local instance, Docker container, or Azure SQL all work |
| npm | ≥ 9 | Ships with Node.js |

You do **not** need to create the database or any tables by hand — the backend does this automatically on first boot (see [Database Schema & Seeding](#database-schema--seeding)).

---

## Quick Start

Open **three terminals**, one per app.

```bash
# Terminal 1 — Backend (API on :5000)
cd backend
cp .env.example .env          # then edit DB_* and generate JWT secrets — see below
npm install
npm run dev

# Terminal 2 — Admin console (on :3000)
cd Frontend
cp .env.example .env
npm install
npm run dev

# Terminal 3 — Customer storefront (on :3001)
cd Frontend_Node
cp .env.example .env
npm install
npm run dev
```

Then:
1. Visit **http://localhost:3001** — browse the storefront, register a customer account, add items to cart, check out (simulated payment gateway by default).
2. Provision your first admin account (one-time, see [below](#creating-the-first-admin-account)), then visit **http://localhost:3000** and sign in.

The first backend boot will create the `NexoraHub_DB` database, every table, and a small demo product catalog automatically — there is nothing else to run.

---

## Detailed Setup

### 1. Database (SQL Server)

Make sure a SQL Server instance is reachable. Any of these work:

- **Local install** (Windows: SQL Server Developer/Express edition)
- **Docker:**
  ```bash
  docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=<YourStr0ngPassword!>" \
    -p 1433:1433 --name nexorahub-sql -d mcr.microsoft.com/mssql/server:2022-latest
  ```
- **Cloud** (Azure SQL, etc.) — just point `DB_SERVER`/`DB_PORT` at it.

You do not need to create a database, run a migration tool, or execute any `.sql` file by hand. The backend's `initDb.ts` runs `database/schema.sql` then `database/seed.sql` automatically every time it starts, and **both files are fully idempotent** — safe to run on an empty server, a partially set-up one, or one that's already fully migrated. See [Database Schema & Seeding](#database-schema--seeding) for exactly what that creates.

### 2. Backend

```bash
cd backend
cp .env.example .env
```

Open `.env` and fill in at minimum:

```bash
DB_USER=sa
DB_PASSWORD=<your SQL Server password>
DB_SERVER=localhost
DB_DATABASE=NexoraHub_DB
```

Generate two independent JWT signing secrets (the app will not boot without real ones — a placeholder or short secret is rejected):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Run that twice and paste the results into `JWT_SECRET` and `JWT_ADMIN_SECRET` respectively — **they must be different values**.

```bash
npm install
npm run dev      # nodemon, auto-restarts on file changes — http://localhost:5000
# or
npm run build && npm start   # compiled, production-style run
```

On success you'll see:
```
Successfully connected to MSSQL Server connection pool.
Migration schema.sql completed successfully.
Migration seed.sql completed successfully.
Server successfully running on port 5000 in development mode.
```

Verify: `curl http://localhost:5000/api/health` → `{"success":true,"status":"healthy",...}`

### 3. Admin Frontend

```bash
cd Frontend
cp .env.example .env
npm install
npm run dev      # http://localhost:3000
```

`Frontend/.env` only needs one variable, and the default already matches the backend:
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Sign-in requires an admin account — see [Creating the First Admin Account](#creating-the-first-admin-account) if you haven't provisioned one yet.

### 4. Customer Frontend

```bash
cd Frontend_Node
cp .env.example .env
npm install
npm run dev      # http://localhost:3001
```

Same single variable, same default:
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

No account is required to browse; registration and checkout work immediately against the seeded demo catalog.

---

## Environment Variables

Every app ships a committed **`.env.example`** (the template, always safe to read) and expects a git-ignored **`.env`** (your real local values, never committed). Copy one to the other and edit.

### `backend/.env`

| Variable | Required | Default | Notes |
|---|---|---|---|
| `PORT` | No | `5000` | Backend listens here. Both frontends' `NEXT_PUBLIC_API_URL` must point at this port. |
| `NODE_ENV` | No | `development` | `production` enables stricter boot-time checks (see [Security](#security)). |
| `LOG_LEVEL` | No | `info` | `error`\|`warn`\|`info`\|`http`\|`debug`. |
| `CORS_ORIGIN` | No | `http://localhost:3000,http://localhost:3001` | Comma-separated browser origins allowed to call the API. Must list **both** frontend ports. |
| `RATE_LIMIT_MAX` | No | `100` | Requests per IP per window. Hard-capped at 1000 — cannot be used to disable rate limiting. |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` (15 min) | |
| `DB_USER` | **Yes** | — | SQL Server login. |
| `DB_PASSWORD` | **Yes** | — | SQL Server password. |
| `DB_SERVER` | **Yes** | — | e.g. `localhost`. |
| `DB_DATABASE` | **Yes** | — | Database name; created automatically if missing. |
| `DB_PORT` | No | `1433` | |
| `DB_TRUST_SERVER_CERTIFICATE` | No | `true` (dev) | **Must be `false` in production** — the app refuses to boot otherwise. |
| `JWT_SECRET` | **Yes** | — | Signs customer tokens. 32+ random bytes; placeholder/weak values are rejected at boot. |
| `JWT_ADMIN_SECRET` | **Yes** in production | — | Signs admin tokens. Must differ from `JWT_SECRET`. |
| `JWT_EXPIRY` | No | `15m` | Access-token lifetime. |
| `JWT_ISSUER` | No | `nexora-api` | |
| `RUN_MIGRATIONS` | No | `false` | In production, schema/seed files only run when this is explicitly `true` for one deploy. Always runs in development. |
| `EMAIL_*` | No | unset → stub mode | If unset, OTP/notification emails are logged instead of sent. Set `EMAIL_HOST`/`EMAIL_USER`/`EMAIL_PASS` to send real email. |
| `PAYMENT_GATEWAY` | No | `simulated` | `simulated` \| `razorpay`. **`simulated` is refused at boot in production.** |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Only if using Razorpay | — | |
| `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` | Only for the bootstrap script | — | Never read at server boot — see below. |

Full inline documentation lives in [`backend/.env.example`](backend/.env.example).

### `Frontend/.env` (admin console)

| Variable | Required | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:5000/api` |

### `Frontend_Node/.env` (customer storefront)

| Variable | Required | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:5000/api` |

Both frontend variables are `NEXT_PUBLIC_*`, meaning they're baked into the browser bundle — they're not secrets, just the backend's address.

> **Port note:** the dev/start scripts pass `-p 3000` / `-p 3001` explicitly in each frontend's `package.json`, so the port is fixed regardless of environment variables. If you deploy behind a platform that injects its own `PORT` (Render, Railway, Vercel, etc.), override that app's start command for that environment instead of editing `.env`.

---

## Database Schema & Seeding

All SQL lives in [`backend/database/`](backend/database):

| File | Runs automatically? | Purpose |
|---|---|---|
| [`schema.sql`](backend/database/schema.sql) | ✅ Yes, every boot | The single, authoritative schema. Creates the database itself if missing, then every table — catalog, orders, customer accounts, sessions, loyalty, wishlist, cart, notifications, returns, support tickets, referrals, search, product variants — plus every index, constraint, and trigger. |
| [`seed.sql`](backend/database/seed.sql) | ✅ Yes, every boot | Seeds the five system roles (`Super Admin`, `Admin`, `Customer`, `Support`, `Inventory Manager`) and a small idempotent demo catalog (brands, categories, products, inventory, two coupons). |
| [`sample_data.sql`](backend/database/sample_data.sql) | ❌ No — manual only | Optional: adds three demo customers with a couple of orders/reviews, for admin-dashboard screenshots. Run by hand: `sqlcmd -S localhost -d NexoraHub_DB -i backend/database/sample_data.sql`. Demo login for all three: any of the seeded emails + password `DemoPassword123`. |

**Why this is safe to run unattended on any machine:** every statement in `schema.sql` and `seed.sql` is idempotent — guarded by `IF OBJECT_ID(...) IS NULL`, a `sys.columns` check, or a natural-key lookup (slug/SKU/coupon code) rather than a hardcoded ID. Running them against an empty SQL Server, a partially-migrated database left over from an older clone, or an already-fully-set-up database all converge to the same end state with **zero errors and zero data loss**. Nothing in the automatic path ever deletes a row.

No administrator account is ever seeded automatically — see the next section.

---

## Creating the First Admin Account

For security, **no admin account is created by the seed script.** A hardcoded admin credential shipped in a public repo is a permanent, known password on every clone — instead, provision your own once:

```bash
cd backend
BOOTSTRAP_ADMIN_EMAIL="you@example.com" \
BOOTSTRAP_ADMIN_PASSWORD="Str0ng-Unique-Password-2026!" \
npm run bootstrap:admin
```

Requirements enforced by the script:
- Password ≥ 12 characters, with uppercase, lowercase, and a digit.
- Refuses to run twice for the same email (idempotent — safe to re-run).
- The password is never echoed or logged anywhere.

This creates a `Super Admin` user you can sign in with at **http://localhost:3000**. Every subsequent staff account should be created from the admin console itself (`Users` page → requires Super Admin), not by re-running this script.

---

## API Overview

Base URL: `http://localhost:5000`

### Health check
```
GET /api/health
```

### Admin API (`/api/*`) — consumed only by `Frontend/`
Requires a `Bearer` token signed with `JWT_ADMIN_SECRET`.

| Path | Purpose |
|---|---|
| `/api/auth` | Admin login/register/me |
| `/api/products` | Product CRUD (+ variants, images) |
| `/api/categories`, `/api/brands` | Catalog taxonomy |
| `/api/orders` | Admin order management |
| `/api/inventory` | Stock adjustment & history |
| `/api/customers` | Customer list & status management |
| `/api/reviews` | Review moderation |
| `/api/analytics` | Dashboard metrics & sales data |
| `/api/users` | Staff account management (Super Admin only) |
| `/api/coupons` | Coupon CRUD |

### Customer API (`/api/v1/customer/*`) — consumed only by `Frontend_Node/`
Requires a `Bearer` token signed with `JWT_SECRET` (most routes; browsing/search work anonymously).

| Path | Purpose |
|---|---|
| `/auth` | Register, login, refresh, OTP verification, password reset, sessions |
| `/profile` | Profile + avatar |
| `/addresses` | Shipping/billing addresses |
| `/wishlist`, `/cart` | Wishlist & cart |
| `/checkout` | Order preview & placement |
| `/orders` | Order history, cancellation, tracking |
| `/payments` | Payment initiation & verification |
| `/products`, `/search`, `/recommendations` | Public catalog browsing |
| `/coupons` | Coupon validation |
| `/reviews` | Customer-authored reviews |
| `/notifications` | In-app notifications |
| `/returns`, `/support` | Returns & support tickets |
| `/loyalty`, `/referrals` | Reward points & referral program |

Every response follows the same envelope:
```json
{ "success": true, "statusCode": 200, "message": "...", "data": { }, "requestId": "..." }
```

---

## Project Structure

```
E_Commerce_website/
├── backend/                     Express API (port 5000)
│   ├── database/
│   │   ├── schema.sql            ← run automatically, every boot
│   │   ├── seed.sql              ← run automatically, every boot
│   │   └── sample_data.sql       ← manual/optional demo data
│   ├── src/
│   │   ├── app.ts                Express app: middleware, routes, boot sequence
│   │   ├── config/               env.ts (validated config), logger.ts
│   │   ├── database/             db.ts (connection pool), initDb.ts (migration runner)
│   │   ├── core/routes/          v1.router.ts — mounts the customer API tree
│   │   ├── modules/              Customer-facing feature modules (one folder per domain:
│   │   │                         auth, cart, checkout, orders, payments, products, ...)
│   │   ├── controllers|routes|services|repositories/   Admin-facing feature code
│   │   ├── middlewares/          authenticate, authorizeRole, error handling
│   │   ├── shared/                email, audit log, session registry, background jobs
│   │   └── scripts/               bootstrapAdmin.ts, verifySecurity.ts
│   ├── .env.example
│   └── package.json
│
├── Frontend/                    Admin console — Next.js 16 (port 3000)
│   ├── src/
│   │   ├── app/                   Pages: products, orders, customers, coupons, staff, ...
│   │   ├── components/            UI component library
│   │   ├── context/               AuthContext
│   │   └── utils/api.ts           Fetch client (Bearer token from localStorage)
│   ├── .env.example
│   └── package.json
│
├── Frontend_Node/               Customer storefront — Next.js 15 (port 3001)
│   ├── src/
│   │   ├── app/                   Pages: home, products, cart, checkout, account, ...
│   │   ├── components/            UI component library
│   │   ├── lib/                   apiClient.ts (fetch client + auto token refresh), config.ts
│   │   └── store/                 Zustand stores (cart, wishlist)
│   ├── .env.example
│   └── package.json
│
└── Docx/                         Project documentation
```

---

## Security

This project has been through a full audit-and-remediation pass. Highlights relevant to running it yourself:

- **Two independent JWT signing keys** — admin and customer tokens are cryptographically isolated (`JWT_SECRET` vs `JWT_ADMIN_SECRET`); one can never be replayed as the other.
- **No default admin credential** — see [Creating the First Admin Account](#creating-the-first-admin-account).
- **Boot-time secret validation** — the app refuses to start with a placeholder or short JWT secret, or with `DB_TRUST_SERVER_CERTIFICATE=true` in production.
- **Payment verification is signature-based**, not a trust-the-client callback; the simulated gateway is refused in production.
- **Rate limiting, account lockout, and CSP/security headers** are on by default on both the API and both frontends.
- **`npm run verify:security`** (in `backend/`) runs a 90+ check automated regression suite against the codebase — run it after touching anything in auth, checkout, or payments.

Full detail: [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md) (findings) and [`SECURITY_REMEDIATION.md`](SECURITY_REMEDIATION.md) (fixes applied, with live-exploit verification).

---

## Available Scripts

### `backend/`
| Script | Purpose |
|---|---|
| `npm run dev` | Start with nodemon (auto-restart on change) |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Run the compiled build (`dist/app.js`) |
| `npm run typecheck` | Type-check without emitting |
| `npm run bootstrap:admin` | One-time first-admin provisioning (see above) |
| `npm run verify:security` | Run the automated security regression suite |
| `npm run audit:security` | `npm audit` at high-severity threshold |

### `Frontend/` and `Frontend_Node/`
| Script | Purpose |
|---|---|
| `npm run dev` | Start Next.js dev server on the app's fixed port |
| `npm run build` | Production build |
| `npm start` | Serve the production build on the app's fixed port |
| `npm run lint` | ESLint |

---

## Troubleshooting

**Backend can't connect to SQL Server.**
Confirm the instance is running and reachable (`sqlcmd -S localhost -U sa -P '<password>'`), and that `DB_USER`/`DB_PASSWORD`/`DB_SERVER`/`DB_PORT` in `backend/.env` are correct. The backend retries 5 times with a 5-second backoff before giving up.

**"Configuration Error: JWT_SECRET is set to a known placeholder value."**
You copied `.env.example` but didn't generate real secrets. Run the `node -e "console.log(require('crypto')...)"` command from [step 2](#2-backend) twice and paste the two different results into `JWT_SECRET` and `JWT_ADMIN_SECRET`.

**Frontend requests fail with a CORS error.**
`backend/.env`'s `CORS_ORIGIN` must include the exact origin the browser is calling from, including port — e.g. `http://localhost:3000,http://localhost:3001`. Restart the backend after editing `.env`.

**A frontend starts on the wrong port / port already in use.**
Both frontends pin their port explicitly in `package.json` (`-p 3000` / `-p 3001`). If something else on your machine already occupies that port, stop it, or run `next dev -p <other-port>` directly and update the other app's/backend's config to match.

**Login fails with "Invalid email or password" right after registering.**
Customer accounts require email verification before login (an OTP is generated on registration). In development with no `EMAIL_*` configured, the OTP is logged by the backend (stub mode) rather than emailed — check the backend console output.

**I want a completely clean database to test from scratch.**
Drop `NexoraHub_DB` and restart the backend — `schema.sql` and `seed.sql` will recreate everything automatically:
```sql
ALTER DATABASE NexoraHub_DB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
DROP DATABASE NexoraHub_DB;
```
