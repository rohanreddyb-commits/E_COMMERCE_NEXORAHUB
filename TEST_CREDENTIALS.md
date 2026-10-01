# NexoraHub E-Commerce — QA Test Credentials

This document provides all pre-configured test account credentials for QA engineers and external testers.

> **Note:** All test accounts are connected to the live **Azure SQL Database** (`NexoraHub_DB`).

---

## 🌐 Application URLs

| Application | Role | Local Development URL | Deployed Cloud URL (Staging) |
|---|---|---|---|
| **Admin Console** | Staff & Administration | `http://localhost:3000` | `https://admin-test.vercel.app` |
| **Customer Storefront** | Storefront & Checkout | `http://localhost:3001` | `https://shop-test.vercel.app` |
| **Backend REST API** | Express Service | `http://localhost:5000/api` | `https://api-test.onrender.com/api` |

---

## 👑 1. Admin Console Test Accounts (`http://localhost:3000`)

### Super Admin (Platform Owner)
* **Email:** `admin@nexorahub.com`
* **Password:** `AdminPassword123!`
* **Permissions:** Full system access, staff account management, role assignment, system logs, catalog CRUD, analytics.
* **OTP Required:** No (pre-verified).

### Staff Admin (Catalog & Order Manager)
* **Email:** `john.doe@example.test`
* **Password:** `DemoPassword123`
* **Permissions:** Manage catalog (products, categories, brands), process customer orders, view revenue analytics, create coupon codes.
* **OTP Required:** No (pre-verified).

---

## 🛍️ 2. Customer Storefront Test Accounts (`http://localhost:3001`)

All customer test accounts come pre-loaded with shipping addresses, order histories, and wishlist/cart items.

### Primary Test Customer
* **Email:** `john.doe@example.test`
* **Password:** `DemoPassword123`
* **Name:** John Doe (Seattle, WA)
* **Status:** Verified Active Customer
* **Testing Scope:** Browsing, adding to cart, checkout with coupons, order cancellation, writing product reviews.

### Secondary Test Customer
* **Email:** `jane.smith@example.test`
* **Password:** `DemoPassword123`
* **Name:** Jane Smith (Austin, TX)
* **Status:** Verified Active Customer
* **Testing Scope:** Order tracking, returns processing, support ticket submission.

### Additional Pre-Seeded Test Customers
| Customer Name | Email | Password | City, State |
|---|---|---|---|
| **Alice Johnson** | `alice.johnson@example.test` | `DemoPassword123` | Chicago, IL |
| **Marcus Vance** | `marcus.vance@example.test` | `DemoPassword123` | San Francisco, CA |
| **Elena Rostova** | `elena.rostova@example.test` | `DemoPassword123` | New York, NY |
| **Liam O'Connor** | `liam.oconnor@example.test` | `DemoPassword123` | Boston, MA |
| **Sophia Chen** | `sophia.chen@example.test` | `DemoPassword123` | Palo Alto, CA |

---

## 💳 3. Test Payment Credentials (Simulated Gateway)

When testing checkout on the Customer Storefront (`http://localhost:3001`):

- **Payment Gateway:** `Simulated Gateway`
- **Card Number:** Any 16-digit dummy card number (e.g. `4111 1111 1111 1111`)
- **Expiry Date:** Any future date (e.g. `12/28`)
- **CVV:** Any 3 digits (e.g. `123`)
- **OTP for Payment Verification:** `123456` (or auto-approved in simulated mode)

---

## 🎟️ 4. Test Discount Coupons

Use these coupon codes during customer checkout:

| Coupon Code | Discount | Minimum Order | Usage Limit |
|---|---|---|---|
| `WELCOME10` | 10% Off | ₹500 | 1 per user |
| `SUMMER50` | ₹50 Flat Off | ₹1,000 | Multi-use |

---

## 🛠️ 5. Provisioning New Accounts

To create a new custom Admin or Customer account programmatically:

```powershell
# In backend/ directory:
cd c:\E_Commerce_website\backend
$env:BOOTSTRAP_ADMIN_EMAIL="tester.newadmin@nexorahub.com"
$env:BOOTSTRAP_ADMIN_PASSWORD="TestPassword123!"
npm run bootstrap:admin



Hi Deekshith
```
