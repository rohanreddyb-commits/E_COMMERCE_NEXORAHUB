# Enterprise Security Assessment — NexoraHub E‑Commerce Platform

**Assessment date:** 2026-07-31
**Commit reviewed:** `2b51fd0` + uncommitted working tree
**Scope:** `backend/` (Node/Express/MSSQL), `Frontend/` (admin, Next 16), `Frontend_Node/` (customer, Next 15), database schema, seeds, environment configuration, dependencies
**Method:** Static source review, architecture/threat modelling, control-flow tracing of every mounted route. No dynamic testing or exploitation was performed against a running instance — findings marked *"requires verification"* have not been confirmed at runtime.

---

## 1. Executive Summary

The platform is a two-tier commerce system: a legacy/admin API surface (`/api/*`) and a newer, well-structured customer API (`/api/v1/customer/*`). The customer V1 modules are, on the whole, **competently built** — SQL is parameterised throughout, passwords use bcrypt cost 12, OTPs are hashed with DB-side expiry, refresh tokens are rotated and hashed, account lockout exists, and ownership checks are applied consistently across cart, orders, addresses, reviews, returns, support and notifications.

That quality does not extend to the older admin API surface or to the money-handling paths. Four **Critical** issues make this system unsafe to deploy as-is:

1. **Anyone on the internet can create a Super Admin account** by adding one field to the public registration request. This is a complete, unauthenticated compromise of the platform.
2. **Payment verification is a no-op.** The default payment gateway approves any request, so a customer can mark their own orders as paid without paying.
3. **A default administrator account with publicly documented credentials is re-seeded on every server boot.**
4. **The active `.env` still carries the placeholder JWT secret** shipped in `.env.example`, and that one secret signs both admin and customer tokens.

Beyond those, the checkout flow grants loyalty-point discounts without verifying the customer actually holds the points, and access tokens cannot be revoked (logout is cosmetic for up to 24 hours).

**No SQL injection was found.** No XSS sinks were found in either frontend. No secrets are committed to git history. These are genuine strengths and reflect real care in the data-access layer.

---

## 2. Risk Score

| Severity | Count |
|---|---|
| Critical | 4 |
| High | 4 |
| Medium | 13 |
| Low / Informational | 11 |
| **Total** | **32** |

**Aggregate risk: CRITICAL.** Two independent paths lead to full administrative takeover with no authentication required, and two lead to unpaid fulfilment of goods.

## 3. Overall Security Rating

# 38 / 100

| Domain | Score | Notes |
|---|---|---|
| Injection defence (SQLi/NoSQLi/cmd) | 92 | Parameterised throughout; ORDER BY allow-listed |
| Cryptography & password handling | 55 | bcrypt 12 + SHA-256 OTP hashing are correct; placeholder JWT secret destroys the benefit |
| Authentication | 45 | Strong customer flow; admin flow has no validation, no lockout, no rate limiting |
| Authorization / access control | 25 | Ownership checks are good; one unauthenticated privilege-escalation path is fatal |
| Business logic integrity | 30 | Payment bypass, free point redemption, coupon race |
| API security & input validation | 70 | express-validator is applied thoroughly on V1; absent on admin routes |
| Configuration & headers | 55 | Helmet defaults good on API; no CSP on either frontend; weak `.env` |
| Secrets management | 40 | Nothing leaked to git, but live secrets are placeholders |
| Logging & monitoring | 30 | Audit table exists and is used; transport is console-only, no alerting |
| Dependency hygiene | 65 | Next.js is patched; multer 1.x is EOL |

---

## 4. OWASP Top 10 (2021) Compliance

| # | Category | Status | Evidence |
|---|---|---|---|
| A01 | Broken Access Control | ❌ **FAIL** | C‑1 (role_id mass assignment), M‑8 |
| A02 | Cryptographic Failures | ❌ **FAIL** | C‑4 (placeholder JWT secret), M‑13 |
| A03 | Injection | ✅ **PASS** | All queries parameterised; sort fields allow-listed |
| A04 | Insecure Design | ❌ **FAIL** | C‑2, H‑1, H‑2, M‑5, M‑6 |
| A05 | Security Misconfiguration | ⚠️ **PARTIAL** | H‑4, M‑3, M‑9, M‑13 |
| A06 | Vulnerable/Outdated Components | ⚠️ **PARTIAL** | M‑11 (multer 1.x EOL) |
| A07 | Identification & Auth Failures | ❌ **FAIL** | C‑3, H‑3, M‑3, M‑7 |
| A08 | Software & Data Integrity | ⚠️ **PARTIAL** | C‑2 (unverified payment callbacks), M‑6 |
| A09 | Logging & Monitoring Failures | ❌ **FAIL** | M‑12 |
| A10 | SSRF | ✅ **PASS** | No outbound HTTP driven by user input anywhere in the codebase |

---

## 5. Vulnerability Matrix

| ID | Severity | Title | CWE | OWASP | Component |
|---|---|---|---|---|---|
| C‑1 | Critical | Unauthenticated privilege escalation via `role_id` mass assignment | CWE‑915 / CWE‑269 | A01 | Backend auth |
| C‑2 | Critical | Payment verification accepts any client-supplied value | CWE‑345 / CWE‑602 | A04/A08 | Payments |
| C‑3 | Critical | Default admin credentials re-seeded on every boot | CWE‑1392 | A07 | Database seed |
| C‑4 | Critical | Placeholder JWT secret in active config; shared across realms | CWE‑321 | A02 | Config |
| H‑1 | High | Loyalty-point discount applied without balance verification | CWE‑840 | A04 | Checkout |
| H‑2 | High | No per-user coupon limit; usage check races the increment | CWE‑837 / CWE‑362 | A04 | Checkout |
| H‑3 | High | Access tokens not revocable; logout ineffective for 24h | CWE‑613 | A07 | Auth middleware |
| H‑4 | High | Internal error messages and stack traces returned to clients | CWE‑209 | A05 | Error handler |
| M‑1 | Medium | Password hash returned in API responses | CWE‑200 | A02 | User repo |
| M‑2 | Medium | Hardcoded default password for admin-created users | CWE‑798 | A07 | User controller |
| M‑3 | Medium | Rate limiting effectively disabled; no admin login throttling | CWE‑307 | A07 | Config/routes |
| M‑4 | Medium | File-upload validation by extension/MIME string only | CWE‑434 | A04 | Upload middleware |
| M‑5 | Medium | Orders accepted for products with no inventory row | CWE‑754 | A04 | Checkout |
| M‑6 | Medium | Idempotency key has no unique constraint | CWE‑362 | A04 | Schema/checkout |
| M‑7 | Medium | Email verification never enforced at login | CWE‑287 | A07 | Auth service |
| M‑8 | Medium | Admin can escalate any user to Super Admin | CWE‑269 | A01 | User controller |
| M‑9 | Medium | Tokens in `localStorage`; no CSP on either frontend | CWE‑922 | A05 | Frontends |
| M‑10 | Medium | Login response discloses remaining-attempt count | CWE‑204 | A07 | Auth service |
| M‑11 | Medium | multer 1.x is EOL with open DoS advisories | CWE‑1104 | A06 | Dependencies |
| M‑12 | Medium | Console-only logging; OTP bodies logged at debug level | CWE‑532 / CWE‑778 | A09 | Logger/email |
| M‑13 | Medium | `sa` DB account, 4-char password, TLS validation disabled | CWE‑521 | A02/A05 | Config |
| L‑1..L‑11 | Low/Info | See §5.4 | — | — | Various |

---

### 5.1 CRITICAL FINDINGS

---

#### C‑1 — Unauthenticated privilege escalation via `role_id` mass assignment

**Severity:** Critical **CWE:** CWE‑915 (Mass Assignment), CWE‑269 (Improper Privilege Management) **OWASP:** A01:2021

**Affected files**
- [backend/src/services/auth.service.ts:53‑74](backend/src/services/auth.service.ts#L53-L74) — line **60** is the defect
- [backend/src/controllers/auth.controller.ts:36‑42](backend/src/controllers/auth.controller.ts#L36-L42)
- [backend/src/routes/auth.routes.ts:11](backend/src/routes/auth.routes.ts#L11)
- [backend/src/app.ts:84](backend/src/app.ts#L84)
- [backend/database/seed.sql:5‑24](backend/database/seed.sql#L5-L24) — establishes `role_id = 1` as *Super Admin*

**Vulnerable code**

```ts
// backend/src/routes/auth.routes.ts:11 — public, no auth, no validation middleware
router.post('/register', asyncHandler(authController.register));

// backend/src/controllers/auth.controller.ts:36
register = async (req: Request, res: Response) => {
  const user = await this.authService.register(req.body);   // whole body forwarded
  ...
};

// backend/src/services/auth.service.ts:53
async register(userData: any) {
  ...
  const roleId = userData.role_id || 3;   // ← client controls the role
  const newUser = await this.userRepository.createUser({...}, roleId);
```

`seed.sql` inserts roles in a fixed order into an `IDENTITY(1,1)` column, so the mapping is deterministic:

| role_id | name |
|---|---|
| 1 | **Super Admin** |
| 2 | Admin |
| 3 | Customer |
| 4 | Support |

**Why it is vulnerable**
`req.body` is passed unfiltered into the service, which reads `role_id` from it and hands it straight to `UserRepository.createUser()`, which inserts it into `UserRoles`. The route has no authentication, no authorisation, and — unlike the customer registration endpoint — no `express-validator` chain. The parallel customer endpoint (`/api/v1/customer/auth/register`) correctly hardcodes `CUSTOMER_ROLE_ID = 3`; this one does not.

**Real-world attack scenario**

```http
POST /api/auth/register HTTP/1.1
Content-Type: application/json

{"first_name":"a","last_name":"b","email":"attacker@evil.tld",
 "password":"x","role_id":1}
```

Then:

```http
POST /api/auth/login   {"email":"attacker@evil.tld","password":"x"}
```

The login handler reads roles from the database, finds `Super Admin`, and issues a JWT carrying `roles: [{name:'Super Admin'}]`. Every route guarded by `authorizeRole(['Admin','Super Admin'])` now accepts it: `/api/users`, `/api/customers`, `/api/orders/admin/all`, `/api/inventory`, `/api/analytics`, `/api/products`, `/api/coupons`.

**Business impact**
Total platform compromise from an unauthenticated position. The attacker can exfiltrate the full customer database (names, emails, phone numbers, addresses, order history — a reportable GDPR/DPDP breach), alter prices, mint unlimited coupons, change order fulfilment status, and grant themselves durable persistence by creating further admin accounts. Recovery requires assuming every admin action since deployment is untrusted.

**Remediation**

```ts
// backend/src/services/auth.service.ts
const CUSTOMER_ROLE_ID = 3;

async register(userData: RegisterDto) {   // typed DTO, not `any`
  const existingUser = await this.userRepository.findByEmail(userData.email);
  if (existingUser) throw new ApiError(409, 'User with this email already exists');

  const password_hash = await bcrypt.hash(userData.password, 12);

  // Role is never client-controlled. Staff accounts are created only via
  // POST /api/users, which is behind authenticate + authorizeRole(['Super Admin']).
  const newUser = await this.userRepository.createUser(
    {
      first_name: userData.first_name,
      last_name:  userData.last_name,
      email:      userData.email,
      password_hash,
      phone:      userData.phone,
    },
    CUSTOMER_ROLE_ID,
  );

  const { password_hash: _omit, ...safeUser } = newUser;   // see M‑1
  return safeUser;
}
```

Add a validation chain to the route, mirroring `customer.auth.validators.ts`:

```ts
router.post('/register',
  authRateLimiter,
  registerValidation,
  validateRequest,
  asyncHandler(authController.register));
```

> **Post-remediation action:** audit `UserRoles` for unexpected `role_id IN (1,2,4)` grants and every row in `AuditLogs` attributable to them.

---

#### C‑2 — Payment verification accepts any client-supplied value

**Severity:** Critical **CWE:** CWE‑345 (Insufficient Verification of Data Authenticity), CWE‑602 (Client-Side Enforcement of Server-Side Security) **OWASP:** A04:2021 / A08:2021

**Affected files**
- [backend/src/modules/payments/gateways/simulated.gateway.ts:28‑39](backend/src/modules/payments/gateways/simulated.gateway.ts#L28-L39) and **:73‑77**
- [backend/src/modules/payments/payment.service.ts:47‑110](backend/src/modules/payments/payment.service.ts#L47-L110)
- [backend/src/modules/payments/payment.controller.ts:19‑22](backend/src/modules/payments/payment.controller.ts#L19-L22)

**Vulnerable code**

```ts
// simulated.gateway.ts:73 — the factory DEFAULTS to the simulator
export function getPaymentGateway(): IPaymentGateway {
  const gateway = process.env.PAYMENT_GATEWAY || 'simulated';
  if (gateway === 'razorpay') return new RazorpayGateway();
  return new SimulatedGateway();          // ← production default
}

// simulated.gateway.ts:28
async verifyPayment(paymentData: Record<string, string>) {
  const success = !!(paymentData.gatewayPaymentId || paymentData.razorpay_payment_id);
  return { success, gatewayTransactionId: paymentData.gatewayPaymentId ?? ..., ... };
}

// payment.controller.ts:19 — req.body is forwarded verbatim as paymentData
const data = await this.service.verifyPayment(
  req.customer!.userId, Number(req.body.orderId), req.body);
```

**Why it is vulnerable**
Three compounding failures:

1. `getPaymentGateway()` falls back to the simulator whenever `PAYMENT_GATEWAY` is unset. There is no environment guard preventing this in production — the only protection is a code comment.
2. The simulator returns `success: true` for any request containing a non-empty `gatewayPaymentId`, a value the client supplies.
3. `verifyPayment()` never re-checks the order's `payment_status`, never compares the gateway-reported amount against `order.total_amount`, and never validates a signature. The `RazorpayGateway.verifyPayment` stub still carries `// TODO: verify HMAC signature` (line 61) and throws — so switching to Razorpay today breaks checkout rather than securing it.

**Real-world attack scenario**

```http
POST /api/v1/customer/payments/verify HTTP/1.1
Authorization: Bearer <ordinary customer token>
Content-Type: application/json

{"orderId": 4711, "gatewayPaymentId": "x"}
```

Response: `{"success":true,"orderStatus":"Confirmed","paymentStatus":"Paid"}`. The order enters the fulfilment queue and appears fully paid on the admin dashboard and in `Transactions`. Nothing distinguishes it from a genuine payment.

**Business impact**
Unlimited free merchandise, limited only by stock. Because `Transactions` records the fake payment as `Success`, financial reconciliation will not detect it until a manual gateway settlement comparison. Combined with the return flow (`RETURNABLE_ORDER_STATUSES = ['Delivered']`), an attacker who receives goods can also request refunds against a payment that never occurred.

**Remediation**

```ts
// gateways/index.ts
export function getPaymentGateway(): IPaymentGateway {
  const name = process.env.PAYMENT_GATEWAY;

  if (process.env.NODE_ENV === 'production' && (!name || name === 'simulated')) {
    throw new Error(
      'FATAL: the simulated payment gateway cannot be used in production. ' +
      'Set PAYMENT_GATEWAY to a real provider.');
  }
  if (name === 'razorpay') return new RazorpayGateway();
  return new SimulatedGateway();
}
```

```ts
// RazorpayGateway.verifyPayment — real signature verification
async verifyPayment(d: Record<string, string>): Promise<PaymentVerificationResult> {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = d;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return { success: false, status: 'Failed', gatewayTransactionId: '', amount: 0, rawResponse: d };
  }

  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  const ok = crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'), Buffer.from(razorpay_signature, 'hex'));
  if (!ok) return { success: false, status: 'Failed', ... };

  // Authoritative amount comes from the gateway, never from the client.
  const payment = await this.client.payments.fetch(razorpay_payment_id);
  return { success: payment.status === 'captured',
           amount: payment.amount / 100,
           gatewayTransactionId: razorpay_payment_id,
           status: 'Success', rawResponse: payment };
}
```

```ts
// payment.service.ts — server-side invariants
if (order.payment_status === 'Paid') throw new ApiError(400, 'Order already paid.');

const verifyResult = await gateway.verifyPayment(paymentData);
if (verifyResult.success && Math.abs(verifyResult.amount - order.total_amount) > 0.01) {
  logger.error(`[Payment] Amount mismatch order=${orderId} ` +
               `expected=${order.total_amount} got=${verifyResult.amount}`);
  throw new ApiError(400, 'Payment amount mismatch.');
}
```

Prefer server-to-server **webhooks** over a client-initiated `/verify` call as the authoritative signal; treat the client call as a UI hint only.

---

#### C‑3 — Default administrator credentials re-seeded on every boot

**Severity:** Critical **CWE:** CWE‑1392 (Use of Default Credentials), CWE‑798 **OWASP:** A07:2021

**Affected files**
- [backend/database/seed.sql:27‑53](backend/database/seed.sql#L27-L53)
- [backend/src/database/initDb.ts:16‑47](backend/src/database/initDb.ts#L16-L47)
- [backend/src/app.ts:105](backend/src/app.ts#L105)

**Vulnerable code**

```sql
-- backend/database/seed.sql:27
-- Email: admin@ecommerce.com
-- Password: AdminPassword123 (hashed using bcrypt)
IF NOT EXISTS (SELECT * FROM Users WHERE email = 'admin@ecommerce.com')
BEGIN
    INSERT INTO Users (first_name, last_name, email, password_hash, ...)
    VALUES (N'Admin', ..., N'admin@ecommerce.com', ...);
    SELECT @RoleId = role_id FROM Roles WHERE name = 'Admin';
    INSERT INTO UserRoles (user_id, role_id) VALUES (@UserId, @RoleId);
END
```

**Why it is vulnerable**
`initializeDatabase()` runs `seed.sql` on **every** application start (`app.ts:105`). The credentials are written in a comment in a file committed to the repository. The `IF NOT EXISTS` guard keys on the email address, so deleting the account is a permanent fix — but *changing its password* is not enough if an operator later deletes and the app restarts. Critically, an operator who disables the account by deletion gets it silently recreated on the next deploy.

**Real-world attack scenario**
An attacker who reads this repository (or recognises the pattern from a fingerprinted deployment) submits `admin@ecommerce.com` / `AdminPassword123` to `POST /api/auth/login`. Note that this endpoint has **no rate limiter and no account lockout** (see M‑3) — the customer-side protections in `customer.auth.service.ts` do not apply to `services/auth.service.ts`.

**Business impact**
Identical to C‑1: full administrative control. This path additionally survives a fix to C‑1, so both must be remediated.

**Remediation**

Remove the seeded account entirely and provision the first administrator out-of-band:

```sql
-- backend/database/seed.sql — keep role seeding, delete the user block.
-- First admin is created by an operator-run bootstrap script, never by app boot.
```

```ts
// scripts/bootstrap-admin.ts — run once, manually, credentials from env
const email = required('BOOTSTRAP_ADMIN_EMAIL');
const password = required('BOOTSTRAP_ADMIN_PASSWORD');   // operator-supplied, one-time
if (await userRepo.findByEmail(email)) { logger.info('Admin exists; nothing to do.'); process.exit(0); }
await userRepo.createUser({ ..., password_hash: await bcrypt.hash(password, 12) }, SUPER_ADMIN_ROLE_ID);
```

Also gate migrations so they do not run automatically in production:

```ts
if (process.env.NODE_ENV === 'production' && process.env.RUN_MIGRATIONS !== 'true') {
  logger.info('Skipping auto-migration in production.');
  return;
}
```

> **Immediate action on any existing deployment:** delete or disable `admin@ecommerce.com` and review `AuditLogs` and `LoginHistory` for its activity.

---

#### C‑4 — Placeholder JWT secret in the active configuration; one secret for two trust realms

**Severity:** Critical **CWE:** CWE‑321 (Hard-Coded Cryptographic Key), CWE‑798 **OWASP:** A02:2021

**Affected files**
- `backend/.env` (untracked, present on disk) — verified to contain the literal placeholder from `.env.example`
- [backend/.env.example:20](backend/.env.example#L20)
- [backend/src/config/env.ts:41‑42](backend/src/config/env.ts#L41-L42)
- [backend/src/middlewares/auth.middleware.ts:24](backend/src/middlewares/auth.middleware.ts#L24) and [backend/src/common/middleware/customer.auth.middleware.ts:25](backend/src/common/middleware/customer.auth.middleware.ts#L25)

**Evidence**

```
# backend/.env  (live config)
JWT_SECRET=super_secret_jwt_key_change_me_in_production   # identical to .env.example:20
JWT_EXPIRY=24h                                            # .env.example recommends 15m
NODE_ENV=development
RATE_LIMIT_MAX=10000
```

```ts
// config/env.ts:41 — presence is checked, strength and non-defaultness are not
JWT_SECRET: process.env.JWT_SECRET as string,
JWT_EXPIRY: process.env.JWT_EXPIRY || "1h",
```

**Why it is vulnerable**

1. **Known key.** The secret is published in `.env.example`, which *is* committed. Anyone with repository access — or anyone who guesses that the placeholder was never rotated, a very common condition — can forge tokens.
2. **No realm separation.** The same key signs admin tokens (`services/auth.service.ts:32`) and customer tokens (`modules/authentication/customer.auth.service.ts:408`). There is no `aud`, `iss`, or token-type claim. The two middlewares distinguish realms only by which optional claims happen to be present (`customer.auth.middleware.ts:28` checks for `sessionId`). A forger simply includes whichever claims the target middleware inspects.
3. **No entropy floor.** `env.ts` validates only that the variable is non-empty.
4. **24-hour access tokens** amplify every token-theft scenario and interact with H‑3.

**Real-world attack scenario**

```js
jwt.sign(
  { userId: 1, email: 'x@x', roles: [{ name: 'Super Admin' }], permissions: ['*'] },
  'super_secret_jwt_key_change_me_in_production',
  { expiresIn: '24h' });
```

This token satisfies `authenticate` (`auth.middleware.ts:24`) and `authorizeRole(['Admin','Super Admin'])` (`rbac.middleware.ts:11-13`) for a user account that need not even exist — no database lookup occurs after signature verification.

**Business impact**
Authentication is decorative. Every access-control decision in the system rests on this key, and the key is public.

**Remediation**

```ts
// backend/src/config/env.ts
const FORBIDDEN_SECRETS = new Set([
  'super_secret_jwt_key_change_me_in_production',
  'secret', 'changeme', 'your_jwt_secret',
]);

const jwtSecret = process.env.JWT_SECRET as string;
if (FORBIDDEN_SECRETS.has(jwtSecret)) {
  throw new Error('Configuration Error: JWT_SECRET is a known placeholder. Generate a real one.');
}
if (Buffer.byteLength(jwtSecret, 'utf8') < 32) {
  throw new Error('Configuration Error: JWT_SECRET must be at least 32 bytes.');
}

export const env = {
  ...
  JWT_SECRET: jwtSecret,
  JWT_ADMIN_SECRET: required('JWT_ADMIN_SECRET'),   // separate key per realm
  JWT_EXPIRY: process.env.JWT_EXPIRY || '15m',
};
```

Add typed claims and verify them:

```ts
// customer token
jwt.sign({ ...payload, typ: 'customer' }, env.JWT_SECRET,
         { expiresIn: '15m', audience: 'nexora:customer', issuer: 'nexora-api' });

// customer middleware
const decoded = jwt.verify(token, env.JWT_SECRET, {
  audience: 'nexora:customer', issuer: 'nexora-api',
}) as CustomerAuthPayload;
if (decoded.typ !== 'customer') return next(new ApiError(401, 'Invalid token type.'));
```

Generate secrets with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. Rotating the secret invalidates all outstanding tokens — schedule accordingly.

---

### 5.2 HIGH FINDINGS

---

#### H‑1 — Loyalty-point discount applied without verifying the customer's balance

**Severity:** High **CWE:** CWE‑840 (Business Logic Errors) **OWASP:** A04:2021

**Affected file:** [backend/src/modules/checkout/checkout.service.ts](backend/src/modules/checkout/checkout.service.ts) — lines **260‑265** and **194‑227**

**Vulnerable code**

```ts
// checkout.service.ts:260 — inside calculateOrderTotals()
let pointsDiscount = 0;
if (pointsToRedeem && pointsToRedeem > 0) {
  const { POINT_VALUE_IN_RUPEES, MAX_REDEEM_PERCENT } = await import('...customer.constants');
  const maxDiscount = subtotal * MAX_REDEEM_PERCENT;
  pointsDiscount = Math.min(pointsToRedeem * POINT_VALUE_IN_RUPEES, maxDiscount);
}                                        // ← no balance lookup anywhere
```

```ts
// checkout.service.ts:194 — the ONLY balance check happens AFTER the order commits
setImmediate(async () => {
  try {
    await this.loyaltyService.awardOrderPoints(userId, orderId, totals.total);
    if (options.pointsToRedeem && options.pointsToRedeem > 0) {
      const loyaltyRepo = new (await import('../loyalty/loyalty.repository')).LoyaltyRepository();
      await loyaltyRepo.redeemPoints(userId, options.pointsToRedeem, ...);  // throws if short
    }
    ...
  } catch (err: any) {
    console.error('[Checkout Post-Order] Error:', err.message);   // ← swallowed
  }
});
```

**Why it is vulnerable**
`redeemPoints()` does enforce the balance (`loyalty.repository.ts:106` — `if (balance < points) throw`), but it runs inside `setImmediate`, *after* `runInTransaction` has already committed the discounted order. The rejection is caught and written to `console.error`. The order row keeps its reduced `total_amount`; nothing reverses it.

The `MAX_REDEEM_PERCENT = 0.2` cap in `customer.constants.ts:176` bounds the loss per order to 20% of subtotal, which is what keeps this High rather than Critical — but it is unbounded across orders.

**Real-world attack scenario**
A brand-new customer with a zero point balance:

```http
POST /api/v1/customer/checkout/place-order
Authorization: Bearer <customer token>

{"addressId":1,"paymentMethod":"COD","pointsToRedeem":999999999}
```

`pointsDiscount = min(999999999 × 0.25, subtotal × 0.2) = subtotal × 0.2`. The order commits with a 20% discount; the async redemption throws `Insufficient reward points balance.` into stdout and is discarded. Repeatable on every order, subject only to `CHECKOUT: 20 per hour` (`customer.constants.ts:213`).

**Business impact**
A permanent, self-service 20% discount available to every customer, invisible in the order data (the discount is indistinguishable from a legitimate redemption). At scale this is a direct and continuous margin loss with no anomaly signal.

**Remediation**

Move validation and redemption inside the order transaction:

```ts
// checkout.service.ts — inside runInTransaction, before computing totals
let verifiedPoints = 0;
if (options.pointsToRedeem && options.pointsToRedeem > 0) {
  const balanceRow = await transaction.request()
    .input('user_id', sql.Int, userId)
    .query(`SELECT points_balance FROM RewardPoints WITH (UPDLOCK, ROWLOCK)
            WHERE user_id = @user_id`);

  const balance = balanceRow.recordset[0]?.points_balance ?? 0;
  if (balance < options.pointsToRedeem) {
    throw new ApiError(400, `Insufficient reward points. Available: ${balance}.`);
  }
  verifiedPoints = options.pointsToRedeem;
}

const totals = await this.calculateOrderTotals(cartItems, options.couponCode, verifiedPoints);

if (verifiedPoints > 0) {
  await transaction.request()
    .input('user_id', sql.Int, userId).input('points', sql.Int, verifiedPoints)
    .query(`UPDATE RewardPoints SET points_balance = points_balance - @points,
            updated_at = GETDATE() WHERE user_id = @user_id AND points_balance >= @points`);
  // history row inserted on the same transaction
}
```

Apply the same balance check in `previewOrder()` so the UI cannot show an unattainable total. Separately, `setImmediate` blocks must never contain state-changing logic whose failure matters — restrict them to notifications and email.

---

#### H‑2 — No per-user coupon limit; global usage check races the increment

**Severity:** High **CWE:** CWE‑837 (Improper Enforcement of a Single Unique Action), CWE‑362 (Race Condition) **OWASP:** A04:2021

**Affected file:** [backend/src/modules/checkout/checkout.service.ts](backend/src/modules/checkout/checkout.service.ts) — lines **244‑252** vs **129‑139**

**Vulnerable code**

```ts
// :244 — validity read runs on a POOLED connection, OUTSIDE the transaction
const couponResult = await executeQuery(
  `SELECT * FROM Coupons WHERE code = @code AND is_active = 1 AND expiry_date > GETDATE()
     AND (usage_limit IS NULL OR used_count < usage_limit)
     AND (start_date IS NULL OR start_date <= GETDATE())`, ...);

// :129 — increment runs INSIDE the transaction, with no re-check
if (options.couponCode) {
  const couponResult = await transaction.request()...
    .query(`SELECT coupon_id FROM Coupons WHERE code = @code`);   // no validity predicate
  if (couponId) {
    await transaction.request()...
      .query(`UPDATE Coupons SET used_count = used_count + 1 WHERE coupon_id = @coupon_id`);
  }
}
```

**Why it is vulnerable**
Two distinct defects:

1. **No per-customer limit exists anywhere.** There is no `CouponRedemptions` table and no `WHERE user_id` check. `usage_limit` is a global counter only. A single customer may apply a "one per customer, 50% off" coupon to every order until the global cap is reached.
2. **TOCTOU.** The validity check (including `used_count < usage_limit`) executes on a separate connection before `runInTransaction` opens; the increment executes inside it without re-validating. N concurrent checkouts all read `used_count = limit − 1` and all proceed. The increment inside the transaction also does not filter on `used_count < usage_limit`, so it cannot fail closed.

**Real-world attack scenario**
An attacker fires 50 parallel `POST /api/v1/customer/checkout/place-order` requests carrying a coupon with `usage_limit = 1`. All 50 pass the pre-check and all 50 receive the discount; `used_count` finishes at 50. The `CHECKOUT` limiter (20/hour) bounds a single IP, but the window is per-IP and the requests are concurrent within it.

**Business impact**
Promotional budget overrun with no cap. High-value single-use codes (influencer, win-back, apology vouchers) can be amplified arbitrarily. Also enables voucher resale — one leaked code becomes an unlimited discount for a whole community.

**Remediation**

```sql
CREATE TABLE CouponRedemptions (
    redemption_id INT IDENTITY(1,1) PRIMARY KEY,
    coupon_id     INT NOT NULL,
    user_id       INT NOT NULL,
    order_id      INT NOT NULL,
    redeemed_at   DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT UQ_Coupon_User UNIQUE (coupon_id, user_id),   -- one per customer
    CONSTRAINT FK_CR_Coupon FOREIGN KEY (coupon_id) REFERENCES Coupons(coupon_id),
    CONSTRAINT FK_CR_User   FOREIGN KEY (user_id)   REFERENCES Users(user_id)
);
GO
ALTER TABLE Coupons ADD per_user_limit INT NOT NULL DEFAULT 1;
```

```ts
// Inside runInTransaction — atomic claim; 0 rows affected means the cap was hit.
const claim = await transaction.request()
  .input('code', sql.VarChar(50), options.couponCode)
  .query(`UPDATE Coupons WITH (UPDLOCK, ROWLOCK)
          SET used_count = used_count + 1
          OUTPUT inserted.coupon_id, inserted.discount_type,
                 inserted.discount_value, inserted.max_discount_amount,
                 inserted.min_order_amount
          WHERE code = @code AND is_active = 1
            AND expiry_date > GETDATE()
            AND (start_date IS NULL OR start_date <= GETDATE())
            AND (usage_limit IS NULL OR used_count < usage_limit)`);

if (!claim.recordset.length) throw new ApiError(400, 'Coupon is invalid, expired, or fully redeemed.');
const coupon = claim.recordset[0];

// The UNIQUE constraint enforces the per-user rule; a duplicate raises 2627/2601.
try {
  await transaction.request()
    .input('coupon_id', sql.Int, coupon.coupon_id)
    .input('user_id',   sql.Int, userId)
    .input('order_id',  sql.Int, orderId)
    .query(`INSERT INTO CouponRedemptions (coupon_id, user_id, order_id)
            VALUES (@coupon_id, @user_id, @order_id)`);
} catch (e: any) {
  if (e.number === 2627 || e.number === 2601) {
    throw new ApiError(400, 'You have already used this coupon.');
  }
  throw e;
}
```

---

#### H‑3 — Access tokens cannot be revoked; logout is ineffective for the token lifetime

**Severity:** High **CWE:** CWE‑613 (Insufficient Session Expiration) **OWASP:** A07:2021

**Affected files**
- [backend/src/common/middleware/customer.auth.middleware.ts:24‑42](backend/src/common/middleware/customer.auth.middleware.ts#L24-L42)
- [backend/src/modules/authentication/customer.auth.service.ts:223‑234](backend/src/modules/authentication/customer.auth.service.ts#L223-L234)
- [backend/src/modules/authentication/customer.auth.repository.ts:108‑126](backend/src/modules/authentication/customer.auth.repository.ts#L108-L126)
- `backend/.env` — `JWT_EXPIRY=24h`

**Vulnerable code**

```ts
// customer.auth.middleware.ts:25 — signature verification is the ONLY check
const decoded = jwt.verify(token, env.JWT_SECRET) as CustomerAuthPayload;
if (!decoded.userId || !decoded.sessionId) return next(new ApiError(401, 'Invalid token format.'));
req.customer = { ...decoded };
next();
// CustomerSessions.is_active is never consulted.
```

```ts
// customer.auth.service.ts:223
async logout(sessionId: string): Promise<void> {
  await this.authRepo.revokeSession(sessionId);   // flips is_active only
}
```

**Why it is vulnerable**
The infrastructure for revocation is fully built — `CustomerSessions` carries `session_id`, `is_active` and `expires_at`; `findSessionById()` (repository:67) already filters on both; and every access token embeds its `sessionId`. The middleware simply never calls it. Consequently:

- `POST /auth/logout` and `/auth/logout-all` do not end access. The refresh token dies; the access token lives on.
- `resetPassword()` calls `revokeAllUserSessions()` (`customer.auth.service.ts:326`) — but a session hijacker's access token keeps working after the victim resets their password.
- Deactivating a user (`PATCH /api/customers/:id/status`) does not lock them out either.

`JWT_EXPIRY=24h` in the live `.env` stretches every one of these windows to a full day. Note also that `generateTokenPair` reports `expiresIn: 15 * 60` (line 417) regardless of the configured expiry — the client is told 15 minutes while the token is valid for 24 hours.

**Real-world attack scenario**
An attacker steals a token (shared machine, XSS per M‑9, browser extension). The victim notices, logs out, and resets their password. The attacker retains full access — reading order history, addresses, phone number, placing orders against saved addresses — for up to 24 hours, and every documented remediation the victim can perform is ineffective.

**Business impact**
Account-takeover incidents cannot be contained. Support has no mechanism to terminate a compromised session, which is a serious gap for incident response and for regulatory expectations around breach containment.

**Remediation**

```ts
// customer.auth.middleware.ts
export const authenticateCustomer = async (req, res, next) => {
  ...
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      audience: 'nexora:customer', issuer: 'nexora-api',
    }) as CustomerAuthPayload;

    if (!decoded.userId || !decoded.sessionId) {
      return next(new ApiError(401, 'Invalid token format.'));
    }

    // Sessions are cached ~60s to keep this off the hot path on every request.
    const session = await sessionCache.get(decoded.sessionId,
      () => authRepo.findSessionById(decoded.sessionId));   // filters is_active + expires_at

    if (!session || session.user_id !== decoded.userId) {
      return next(new ApiError(401, 'Session has been revoked. Please sign in again.'));
    }

    req.customer = { ...decoded };
    next();
  } catch (error) { ... }
};
```

Set `JWT_EXPIRY=15m` to match `ACCESS_TOKEN_EXPIRY` and the advertised `expiresIn`, and invalidate the cache entry inside `revokeSession` / `revokeAllUserSessions`.

---

#### H‑4 — Internal error messages and stack traces returned to clients

**Severity:** High **CWE:** CWE‑209 (Information Exposure Through an Error Message) **OWASP:** A05:2021

**Affected file:** [backend/src/middlewares/error.middleware.ts:10‑24](backend/src/middlewares/error.middleware.ts#L10-L24), with [backend/src/utils/ApiError.ts:19‑23](backend/src/utils/ApiError.ts#L19-L23)

**Vulnerable code**

```ts
if (!(error instanceof ApiError)) {
  const statusCode = error.statusCode ? error.statusCode : 500;
  const message = error.message || 'Internal Server Error';   // ← raw internal message
  error = new ApiError(statusCode, message, error?.errors || [], err.stack);
}

const response = {
  ...error,                                                   // ← spreads own properties
  message: error.message,
  ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {}),
};
return res.status(error.statusCode).json(response);
```

**Why it is vulnerable**
Any exception that is not an `ApiError` — an `mssql` driver error, a `TypeError`, a JSON parse failure — has its raw `.message` copied into the client response and returned with the original status. Database errors from the `mssql` driver carry table names, column names, constraint names and sometimes fragments of the failing statement.

`NODE_ENV` defaults to `'development'` in `config/env.ts:35`, and the live `.env` sets it explicitly, so the `stack` branch is currently active — full filesystem paths and the internal call graph are returned to callers.

**Real-world attack scenario**
An attacker sends malformed input to any endpoint that reaches the database — for example an oversized string against a `VarChar(20)` column via `PATCH /api/v1/customer/profile`. The response contains an mssql message naming the table and column. Repeating this across endpoints reconstructs the schema, which is exactly the reconnaissance needed to make the most of any future injection or access-control flaw. Stack traces additionally reveal absolute paths and module layout.

**Business impact**
Substantially accelerates reconnaissance and lowers the cost of exploiting every other finding in this report.

**Remediation**

```ts
export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  const isOperational = err instanceof ApiError;
  const statusCode = isOperational ? err.statusCode : 500;

  logger.error(`[${req.requestId ?? '-'}] ${req.method} ${req.originalUrl} ` +
               `${statusCode} ${err.message}`, { stack: err.stack });

  res.status(statusCode).json({
    success: false,
    statusCode,
    // Only messages we authored are safe to surface.
    message: isOperational ? err.message : 'An unexpected error occurred.',
    errors: isOperational ? err.errors : [],
    requestId: req.requestId,       // the client quotes this to support
    timestamp: new Date().toISOString(),
  });
};
```

Never spread the error object. Never key production behaviour on `NODE_ENV` defaulting to development — make `env.ts` require an explicit `NODE_ENV`.

---

### 5.3 MEDIUM FINDINGS

---

**M‑1 — Password hash returned in API responses** · CWE‑200 · A02
[user.repository.ts:24‑38](backend/src/repositories/user.repository.ts#L24-L38) uses `OUTPUT inserted.*`, so `createUser()` returns the full row including `password_hash`. That object is serialised directly by [auth.service.ts:73](backend/src/services/auth.service.ts#L73) (reachable unauthenticated via `POST /api/auth/register`) and [user.controller.ts:58](backend/src/controllers/user.controller.ts#L58) (`POST /api/users`). Bcrypt hashes are not plaintext, but returning them enables offline cracking and confirms the hashing scheme and cost factor.
**Fix:** change to an explicit column list — `OUTPUT inserted.user_id, inserted.first_name, inserted.last_name, inserted.email, inserted.phone, inserted.status, inserted.created_at` — and add a response DTO so this cannot regress.

---

**M‑2 — Hardcoded default password for admin-created users** · CWE‑798 · A07
[user.controller.ts:47](backend/src/controllers/user.controller.ts#L47): `bcrypt.hash(userData.password || 'TempPassword123!', 10)`. Staff accounts created without an explicit password all share a known credential, and nothing forces a change at first login.
**Fix:** generate `crypto.randomBytes(32).toString('base64url')`, never return it, and send a one-time activation link. Add a `must_change_password` flag enforced by the auth middleware. Raise the cost factor to 12 to match `customer.auth.service.ts:58`.

---

**M‑3 — Rate limiting effectively disabled; no throttling or lockout on admin login** · CWE‑307 · A07
The live `.env` sets `RATE_LIMIT_MAX=10000` against a 15-minute window, neutralising the global limiter at [app.ts:57‑67](backend/src/app.ts#L57-L67). Separately, `POST /api/auth/login` ([auth.routes.ts:10](backend/src/routes/auth.routes.ts#L10)) has **no** dedicated limiter and `services/auth.service.ts:14‑51` implements **no** lockout — the `MAX_LOGIN_ATTEMPTS`/`ACCOUNT_LOCK_DURATION_MINUTES` protections exist only in the customer service. Admin passwords are therefore freely brute-forceable, which is what makes C‑3 practical.
**Fix:** restore `RATE_LIMIT_MAX=100`; apply `authRateLimiter` to the admin auth routes; port the `recordLoginAttempt` / `countRecentFailedAttempts` / `lockAccount` logic into `AuthService.login`. Since both realms share the `Users` table, the cleanest fix is to retire the duplicate admin auth service in favour of the customer one.

---

**M‑4 — File-upload validation relies on extension and MIME strings** · CWE‑434 · A04
[middleware/upload.ts:27‑37](backend/src/middleware/upload.ts#L27-L37):

```ts
const allowedTypes = /jpeg|jpg|png|webp|gif/;               // unanchored
const extname  = allowedTypes.test(path.extname(file.originalname).toLowerCase());
const mimetype = allowedTypes.test(file.mimetype);          // client-controlled header
```

The regex is unanchored, so `.phpjpg` or `.aspxpng` satisfy it; `file.mimetype` comes from the client's `Content-Type` part header; and file *content* is never inspected. Uploaded files are served publicly from `/uploads` ([app.ts:55](backend/src/app.ts#L55)). This is reachable by any authenticated customer through `POST /api/v1/customer/profile/avatar` ([profile.routes.ts:21](backend/src/modules/profile/profile.routes.ts#L21)).

Exploitation is limited today: Helmet sets `X-Content-Type-Options: nosniff`, Express serves unknown extensions as `application/octet-stream`, and `.svg`/`.html` are rejected — so a direct stored-XSS is not achievable. Severity is Medium as a defence-in-depth gap that becomes serious if the upload directory is ever fronted by a server with script handlers, or if the allow-list gains `svg`.

**Fix:** anchor the extension test, derive the stored extension from a server-side allow-list rather than from `originalname`, and validate magic bytes:

```ts
const ALLOWED = { '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png',
                  '.webp':'image/webp', '.gif':'image/gif' } as const;

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!(ext in ALLOWED) || ALLOWED[ext] !== file.mimetype) {
    return cb(new BadRequestError('Only JPEG, PNG, WebP and GIF images are allowed.'));
  }
  cb(null, true);
};

// After write: confirm the magic bytes and re-encode.
const { fileTypeFromFile } = await import('file-type');
const detected = await fileTypeFromFile(file.path);
if (!detected || !Object.values(ALLOWED).includes(detected.mime)) {
  await fs.promises.unlink(file.path);
  throw new BadRequestError('File content is not a valid image.');
}
await sharp(file.path).rotate().toFile(safeDestination);   // strips EXIF and any payload
```

Serve uploads from a separate origin or an object store with `Content-Disposition: attachment` and a restrictive CSP.

---

**M‑5 — Orders accepted for products with no inventory row** · CWE‑754 · A04
[checkout.service.ts:96‑124](backend/src/modules/checkout/checkout.service.ts#L96-L124): the stock query uses `LEFT JOIN Inventory`, so a product with no `Inventory` row yields `stock_quantity = null`. The guard `if (product.stock_quantity < item.quantity)` evaluates `null < 2` → `false` in JavaScript, so the check passes. The subsequent `UPDATE Inventory ... WHERE quantity >= @qty` affects zero rows, and `rowsAffected` is never inspected.
**Fix:** use `INNER JOIN Inventory`, add an explicit `if (product.stock_quantity == null) throw new ApiError(400, ...)`, and assert `result.rowsAffected[0] === 1` after each deduction so the transaction rolls back on a lost update.

---

**M‑6 — Idempotency key has no unique constraint** · CWE‑362 · A04
[checkout.service.ts:64‑77](backend/src/modules/checkout/checkout.service.ts#L64-L77) checks for an existing order with the same `x-idempotency-key` in a plain `SELECT` before the transaction opens, and [customer_schema.sql:187‑188](backend/database/customer_schema.sql#L187-L188) adds `idempotency_key VARCHAR(100) NULL` with no index. Two concurrent requests carrying the same key both find nothing and both create an order — precisely the double-charge the key exists to prevent.
**Fix:** `CREATE UNIQUE INDEX UQ_Orders_IdempotencyKey ON Orders(idempotency_key) WHERE idempotency_key IS NOT NULL;` and catch error 2627/2601 inside the transaction, re-reading and returning the winning order.

---

**M‑7 — Email verification is never enforced** · CWE‑287 · A07
Registration issues an OTP and `markEmailVerified` sets `is_email_verified` ([customer.auth.repository.ts:239‑248](backend/src/modules/authentication/customer.auth.repository.ts#L239-L248)), but `login()` ([customer.auth.service.ts:100‑193](backend/src/modules/authentication/customer.auth.service.ts#L100-L193)) checks only `user.status !== 'Active'`. Accounts on unverified — potentially someone else's — addresses can transact fully.
**Fix:** after the password check, `if (!user.is_email_verified) throw new ApiError(403, 'Please verify your email address before signing in.')`, with a resend endpoint. If unverified browsing is a deliberate product choice, gate checkout instead of login and document the decision.

---

**M‑8 — Admin can escalate any user, including themselves, to Super Admin** · CWE‑269 · A01
[user.routes.ts:10](backend/src/routes/user.routes.ts#L10) admits both `Super Admin` and `Admin`; [user.controller.ts:29‑37](backend/src/controllers/user.controller.ts#L29-L37) accepts any `roleId` with no validation and calls `updateUserRole`, which deletes and replaces the row. `POST /api/users` similarly accepts an arbitrary `roleId`.
**Fix:** restrict role-mutating routes to `authorizeRole(['Super Admin'])`; validate `roleId` against an allow-list; forbid self-modification (`if (userId === req.user.user_id) throw new ApiError(403, ...)`); write an `AuditLogs` entry with old and new role for every change.

---

**M‑9 — Tokens in `localStorage`; no Content-Security-Policy on either frontend** · CWE‑922 · A05
Both apps persist tokens in `localStorage` — [Frontend_Node/src/lib/tokenStorage.ts:16‑26](Frontend_Node/src/lib/tokenStorage.ts#L16-L26) and [Frontend/src/context/AuthContext.tsx:70‑71](Frontend/src/context/AuthContext.tsx#L70-L71) — making them readable by any script in the origin. Neither `next.config.ts` defines a `headers()` function, so no CSP, HSTS, `X-Frame-Options` or `Referrer-Policy` reaches the browser for the application pages (Helmet covers only API responses).

To be clear about what was *not* found: there are **no** `dangerouslySetInnerHTML` occurrences in either codebase and React escapes by default, so no XSS sink exists today. This is a defence-in-depth finding — it determines how bad a future XSS would be.

**Fix (preferred):** move refresh tokens to `HttpOnly; Secure; SameSite=Strict` cookies and keep only the short-lived access token in memory. **Minimum:** add security headers to both apps:

```ts
// next.config.ts
async headers() {
  return [{
    source: '/:path*',
    headers: [
      { key: 'Content-Security-Policy',
        value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
               "img-src 'self' data: https://images.unsplash.com https://cdn.pixabay.com " +
               "https://lh3.googleusercontent.com http://localhost:5000; " +
               "connect-src 'self' http://localhost:5000; frame-ancestors 'none'; " +
               "base-uri 'self'; form-action 'self'" },
      { key: 'X-Frame-Options',        value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy',     value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    ],
  }];
}
```

---

**M‑10 — Login response discloses the remaining-attempt count** · CWE‑204 · A07
[customer.auth.service.ts:138‑142](backend/src/modules/authentication/customer.auth.service.ts#L138-L142) returns `Invalid email or password. 3 attempt(s) remaining.` This is returned only for accounts that exist (a non-existent email throws at line 107 with the generic message), so the presence or absence of the counter is an account-existence oracle. It also lets an attacker pace a password-spray to stay just under the lockout threshold. `forgotPassword` is correctly written to avoid enumeration (line 241) — this undoes that.
**Fix:** return a constant `'Invalid email or password.'` on every failure and log the attempt count server-side only. Add a small constant-time delay so timing does not become the next oracle.

---

**M‑11 — multer 1.4.5‑lts.2 is end-of-life** · CWE‑1104 · A06
`package-lock.json` resolves multer to `1.4.5-lts.2`. The 1.x line is deprecated upstream and carries published denial-of-service advisories (malformed multipart requests and unhandled-error memory growth) addressed in the 2.x line. *Requires verification:* confirm exact advisory applicability with `npm audit` — several 1.4.5-lts patch releases backported fixes, and I could not verify which apply to `lts.2` from source alone.
**Fix:** `npm install multer@^2.0.2` and re-test upload paths; multer 2.x changes some error semantics. Add `npm audit --audit-level=high` to CI.

---

**M‑12 — Console-only logging; OTP contents logged; no security event monitoring** · CWE‑532 / CWE‑778 · A09
[config/logger.ts:31](backend/src/config/logger.ts#L31) configures `new winston.transports.Console()` as the sole transport — nothing is persisted, so there is no forensic record after a restart. [email.service.ts:44‑46](backend/src/shared/email/email.service.ts#L44-L46) writes the rendered email body — including password-reset and verification OTPs — via `logger.debug` when SMTP is unconfigured (the default). Admin logins are never recorded in `LoginHistory` (only the customer service calls `recordLoginAttempt`), and there is no alerting on lockouts, privilege changes, or repeated 401/403s.

The `AuditService` ([shared/audit/audit.service.ts](backend/src/shared/audit/audit.service.ts)) is well built and used consistently across customer modules — the gap is transport and coverage, not design.

**Fix:** add a durable transport with rotation (`winston-daily-rotate-file`) or ship to a SIEM; use JSON format in production (drop `colorize`); add a redaction formatter for `password`, `token`, `otp`, `refreshToken`, `authorization`; remove the OTP body log entirely; call `recordLoginAttempt` from the admin login path; alert on account lockouts, role changes, and admin authentication failures.

---

**M‑13 — Database uses `sa` with a 4-character password and disabled certificate validation** · CWE‑521 · A02/A05
The live `.env` sets `DB_USER=sa`, a `DB_PASSWORD` of 4 characters, and `DB_TRUST_SERVER_CERTIFICATE=true` (honoured at [config/env.ts:51](backend/src/config/env.ts#L51)). `sa` is the MSSQL super-user; `trustServerCertificate` disables TLS chain validation, so the encrypted connection is open to an active machine-in-the-middle. `.env.example:12‑17` recommends the same `sa` + `trustServerCertificate=true` pattern, propagating it to every new deployment.
**Fix:** create a least-privilege SQL login limited to `SELECT/INSERT/UPDATE/DELETE` on the application schema (no `db_owner`, no DDL — which requires moving migrations to a separate privileged credential); use a 32+ character generated password from a secret manager; set `DB_TRUST_SERVER_CERTIFICATE=false` with a properly issued certificate; update `.env.example` to model the secure configuration.

---

### 5.4 LOW & INFORMATIONAL

| ID | Finding | Location | Note |
|---|---|---|---|
| L‑1 | **Dead legacy stack, latent critical.** `authRoutes.ts`, `orderRoutes.ts`, `cartRoutes.ts`, `addressRoutes.ts`, `productRoutes.ts`, `adminRoutes.ts` and their services/repositories are not mounted in `app.ts` and reference columns that do not exist (`Users.name`, `Users.role_id`, `Products.stock_quantity`). **`OrderService.placeOrder` sets `orderStatus = "Paid"` with no payment whatsoever** ([services/orderService.ts:85](backend/src/services/orderService.ts#L85)). Harmless today; a critical vulnerability the moment anyone mounts these routers. | `backend/src/{routes,controllers,services,repositories}/` | **Delete the files.** |
| L‑2 | Legacy `/api/coupons/validate` (mounted) ignores `usage_limit`, `used_count`, `start_date` and `max_discount_amount`, so the quoted discount can exceed what checkout will grant. | [services/couponService.ts:5‑45](backend/src/services/couponService.ts#L5-L45) | Route it to `CustomerCouponService.validateCoupon`, which checks all four. |
| L‑3 | Email templates interpolate `firstName`, `orderNumber` and support `message` into HTML with no escaping. Registration validators constrain names to letters, but admin-authored support replies are unconstrained. | [shared/email/email.service.ts:135](backend/src/shared/email/email.service.ts#L135) and throughout | Escape all interpolations or use a templating engine with auto-escaping. |
| L‑4 | `generateOTP` uses `randomNumber % (max - min + 1)`, introducing a slight modulo bias. | [common/utils/crypto.util.ts:6‑13](backend/src/common/utils/crypto.util.ts#L6-L13) | Use rejection sampling. Impact is negligible against a 10-minute, rate-limited 6-digit OTP. |
| L‑5 | Every `/uploads` request is `console.log`-ged with the resolved absolute filesystem path. | [app.ts:50‑54](backend/src/app.ts#L50-L54) | Remove the middleware; it is debug instrumentation. |
| L‑6 | CORS accepts requests with no `Origin` header alongside `credentials: true`. | [app.ts:37‑44](backend/src/app.ts#L37-L44) | Low impact — auth is Bearer-token, not cookie-based. Revisit if M‑9's cookie migration lands. |
| L‑7 | `/api/health` returns `environment: env.NODE_ENV`. | [app.ts:74‑81](backend/src/app.ts#L74-L81) | Drop the field or require auth for the detailed variant. |
| L‑8 | `authorizeRole` throws `TypeError` → 500 (not 403) when a token carries no `roles` claim, because `req.user.roles.some()` is called unguarded. | [middlewares/rbac.middleware.ts:11](backend/src/middlewares/rbac.middleware.ts#L11) | `const roles = req.user.roles ?? [];` — fail closed with 403. |
| L‑9 | The 7-day return window is measured from `Orders.updated_at`, which any status change refreshes — so the window silently extends. | [modules/returns/customer.return.service.ts](backend/src/modules/returns/customer.return.service.ts) | Add a `delivered_at` column and measure from it. |
| L‑10 | `processReferralCode()` is never invoked — registration ignores referral codes entirely. Its self-referral guard is therefore untested. | [modules/referrals/customer.referral.service.ts:56](backend/src/modules/referrals/customer.referral.service.ts#L56) | Wire it up (with the guard) or remove it. |
| L‑11 | Uploaded filenames are `Date.now()` + `Math.round(Math.random()*1e9)` and served from an unauthenticated public directory, so avatars are guessable at scale. | [middleware/upload.ts:18‑24](backend/src/middleware/upload.ts#L18-L24) | Use `crypto.randomUUID()`. |
| L‑12 | `generateTokenPair` returns a hardcoded `expiresIn: 15 * 60` regardless of the configured `JWT_EXPIRY` (currently `24h`). | [customer.auth.service.ts:417](backend/src/modules/authentication/customer.auth.service.ts#L417) | Derive it from the configured value. |

---

## 6. Prioritised Remediation Plan

### Phase 0 — Block release (before any production exposure)

| # | Action | Finding | Effort |
|---|---|---|---|
| 1 | Hardcode the customer role in `AuthService.register`; add validation to the route | C‑1 | 1h |
| 2 | Rotate `JWT_SECRET` to 48 random bytes; add a placeholder/entropy check to `env.ts`; set `JWT_EXPIRY=15m` | C‑4 | 1h |
| 3 | Delete the seeded admin from `seed.sql`; remove the account from every existing database; add a manual bootstrap script | C‑3 | 3h |
| 4 | Make `getPaymentGateway()` throw when the simulator is selected in production | C‑2 (containment) | 1h |
| 5 | Restore `RATE_LIMIT_MAX=100`; apply `authRateLimiter` and lockout to admin login | M‑3 | 2h |
| 6 | Set `NODE_ENV=production`; stop returning internal messages and stacks | H‑4 | 2h |

*Phase 0 is roughly one engineer-day and closes both unauthenticated-takeover paths.*

### Phase 1 — Before processing real money (week 1)

| # | Action | Finding | Effort |
|---|---|---|---|
| 7 | Implement real Razorpay HMAC verification + gateway-authoritative amount check + webhooks | C‑2 | 3d |
| 8 | Move point validation and redemption inside the checkout transaction | H‑1 | 1d |
| 9 | Add `CouponRedemptions` with a unique constraint; make the coupon claim atomic | H‑2 | 1d |
| 10 | Validate sessions in `authenticateCustomer`; add a short-TTL session cache | H‑3 | 1d |
| 11 | Add a unique index on `Orders.idempotency_key` | M‑6 | 2h |
| 12 | `INNER JOIN Inventory`; assert `rowsAffected` on stock deduction | M‑5 | 3h |

### Phase 2 — Hardening (weeks 2‑3)

13. Strip `password_hash` from all responses (M‑1) · 14. Remove the default staff password (M‑2) · 15. Magic-byte validation and image re-encoding on upload (M‑4) · 16. Enforce email verification (M‑7) · 17. Restrict role mutation to Super Admin + audit (M‑8) · 18. CSP and security headers on both frontends (M‑9) · 19. Constant login-failure message (M‑10) · 20. Upgrade multer to 2.x (M‑11) · 21. Persistent logging with redaction + security alerting (M‑12) · 22. Least-privilege DB account, strong password, TLS validation (M‑13)

### Phase 3 — Cleanup and maturity (week 4+)

23. Delete the dead legacy stack (L‑1) · 24. Consolidate the two auth systems into one · 25. Clear the remaining Low findings · 26. Add integration tests for each finding above as regression guards · 27. Wire `npm audit` and a secret scanner into CI · 28. Commission an authenticated penetration test after Phase 2

---

## 7. Secure Coding Recommendations

1. **Never pass `req.body` into a service.** C‑1 exists solely because `register(req.body)` reached a function that reads `role_id`. Define an explicit DTO per endpoint and map fields by name.
2. **Type security-relevant inputs.** `async register(userData: any)` disabled the one tool that would have caught C‑1 at compile time. Enable `noImplicitAny` and ban `any` in service signatures.
3. **State changes belong inside the transaction.** H‑1 is a direct consequence of a balance check living in `setImmediate` after commit. Reserve fire-and-forget for notifications and email.
4. **Validate at the boundary, uniformly.** The V1 modules use `express-validator` consistently and are markedly stronger for it. The admin routes have none. Apply one standard everywhere.
5. **Fail closed.** `null < quantity` (M‑5), a missing `roles` claim (L‑8), and unchecked `rowsAffected` (M‑5) all fail open. Prefer explicit null checks and assertions over truthiness.
6. **Separate token realms.** Distinct signing keys, `aud`/`iss` claims, and an explicit `typ`, verified on every path.
7. **Keep one implementation per concern.** Two auth services, two order services, two coupon services — the weaker one is always the attack surface, and divergence is invisible in review.
8. **Preserve what already works.** Parameterised queries, allow-listed `ORDER BY`, bcrypt 12, hashed OTPs with DB-side expiry, rotated refresh tokens, and per-user ownership predicates in every V1 query are correct. Codify them as review requirements so they survive future changes.

---

## 8. Dependency Risk Summary

**Backend** (versions resolved from `package-lock.json`)

| Package | Installed | Assessment |
|---|---|---|
| multer | 1.4.5‑lts.2 | ⚠️ **EOL line with published DoS advisories.** Upgrade to `^2.0.2`. Verify with `npm audit`. |
| express | 4.22.2 | ✅ Current 4.x |
| jsonwebtoken | 9.0.3 | ✅ Current; algorithm confusion fixed in 9.x |
| bcrypt | 5.1.1 | ✅ Fine (cost 12 used in the customer path; 10 in the admin path — align them) |
| helmet | 7.2.0 | ✅ Current |
| mssql | 10.0.4 | ✅ Current |
| express-rate-limit | 7.5.1 | ✅ Current (misconfigured, not vulnerable — see M‑3) |
| winston / cors / compression / dotenv / node-cache / yup / express-validator | current | ✅ No known issues |
| node-cron 4.6.0, nodemailer 9.0.3, uuid 14.0.1 | current | ✅ No known issues. Version numbers sit ahead of my verified knowledge — confirm with `npm audit`. |

**Frontends**

| App | Next.js | Assessment |
|---|---|---|
| `Frontend_Node` (customer) | **15.5.20** | ✅ Patched. Above 15.2.3, so **CVE‑2025‑29927** (middleware authorisation bypass) does **not** apply. |
| `Frontend` (admin) | **16.1.6** | ✅ Current |

Both apps resolve React 19.2.x with no known advisories. Note the manifests understate reality — `Frontend_Node/package.json` declares `next: ^15.1.6` (a vulnerable version) while the lockfile resolves 15.5.20. **Raise the declared floor to `^15.2.3` or higher** so a fresh install without the lockfile cannot land on a vulnerable build.

**Supply chain:** lockfiles are committed for all three packages. No `postinstall` scripts, no git or tarball dependencies, no typosquat-suspicious names. Recommended additions: `npm ci` in CI, `npm audit --audit-level=high` as a gate, Dependabot or Renovate, and `--ignore-scripts` where feasible.

---

## 9. Authentication & Authorization Review

**Architecture.** Two independent authentication stacks share one `Users`/`Roles`/`UserRoles` schema and one signing key:

| | Admin (`/api/*`) | Customer (`/api/v1/customer/*`) |
|---|---|---|
| Service | `services/auth.service.ts` | `modules/authentication/customer.auth.service.ts` |
| Middleware | `middlewares/auth.middleware.ts` | `common/middleware/customer.auth.middleware.ts` |
| Guard | `authorizeRole` / `authorizePermission` (name-based) | Per-route `authenticateCustomer` |
| Token claims | `{ userId, roles[], permissions[] }` | `{ userId, email, firstName, lastName, roles[], permissions[], sessionId }` |
| Registration validation | **none** | full `express-validator` chain |
| Password policy | **none** | 8‑128 chars, upper + lower + digit |
| bcrypt cost | 10 | 12 |
| Lockout | **none** | 5 attempts / 30-minute lock |
| Rate limiting | global only (disabled in `.env`) | `authRateLimiter` 10/15min, `forgotPassword` 3/hour |
| Refresh tokens | **none** | rotated, SHA‑256 hashed, 7-day sessions |
| Password history | **none** | last 3 hashes compared on reset |

The customer stack is well designed. The admin stack — which protects far more — has none of its controls.

**Cross-realm token use.** I traced this specifically. A customer token *is* accepted by the admin `authenticate` middleware (same secret, `decoded.userId` satisfies line 26), but `authorizeRole(['Admin','Super Admin'])` then rejects it because `roles` is populated from the database as `['Customer']`. Conversely, an admin token lacks `sessionId` and is rejected at `customer.auth.middleware.ts:28`. **No practical cross-realm escalation exists via token reuse alone** — the escalation path is C‑1 (become an admin legitimately), not token confusion. The shared secret remains a Critical finding because it enables outright forgery (C‑4).

**Authorization coverage.** Every mounted admin route carries `authenticate` + `authorizeRole`. I found no missing guard, no debug endpoint, and no hidden route. Route ordering in `product.routes.ts` is handled correctly — the comments there show the author understood the `/:id` shadowing hazard.

**Ownership / IDOR.** Every customer V1 query I traced carries a `user_id` predicate: cart (`customer.cart.service.ts:60,75,84,95`), orders (`customer.order.service.ts:59,124,166`), addresses (`customer.address.repository.ts:92,100`), returns, support, notifications, reviews, payments, loyalty. `getTicketDetail` correctly authorises the ticket before loading its messages. **No IDOR was found.** This is the strongest area of the codebase.

**OTP and reset flow.** OTPs are SHA‑256 hashed at rest with expiry enforced in the SQL predicate (`customer.auth.repository.ts:168,191,231`) rather than in JavaScript — correct, and resistant to clock manipulation. Reset consumes a one-time token, blocks password reuse against the last 3 hashes, and revokes all sessions. The one gap is a per-OTP attempt counter; the 10/15min IP limiter is the only brake on a 6-digit guess, which is thin against a distributed attacker (**Low‑Medium**; add a `failed_attempts` column that invalidates the OTP after 5 tries).

---

## 10. API Security Review

- **Surface:** 11 admin route groups plus 18 customer V1 modules, mounted at `app.ts:84‑97`. Every one was enumerated and reviewed.
- **Input validation:** thorough on V1 (`express-validator` chains with `isInt({min:1})` on every path param and typed body validators); **absent** on the admin routes, which parse with bare `parseInt`/`parseFloat` and accept unvalidated bodies.
- **Request size:** `express.json()` and `express.urlencoded()` use the 100 kB default — adequate. Uploads are capped at 5 MB × 5 files.
- **Pagination:** `parsePaginationParams` (`common/utils/pagination.util.ts:40‑55`) clamps `limit` to a per-endpoint maximum and floors `page` at 1. **No pagination abuse vector.**
- **Search:** rate-limited at 50/min, parameterised, and `LIKE` patterns are bound as parameters. `autocomplete` requires ≥2 characters.
- **CORS:** origin allow-list from `CORS_ORIGIN`, with a documented no-Origin exemption (L‑6).
- **CSRF:** not applicable — all state-changing endpoints require a `Bearer` header, which browsers do not attach cross-origin. Becomes relevant if M‑9's cookie migration proceeds; add SameSite plus a token then.
- **Response leakage:** password hashes (M‑1), internal errors (H‑4), remaining-attempt counts (M‑10).
- **Unauthenticated endpoints (intentional and correct):** product catalogue, search, autocomplete, trending, product reviews, available coupons, `frequently-bought-together`, `/api/health`, and the auth entry points. Each was checked for data exposure; the product queries select only public columns.
- **No debug, internal, or undocumented endpoints were found.** The `/health` sub-route on the auth router is trivial.

---

## 11. Frontend Security Review

**Customer app (`Frontend_Node`)** — the stronger of the two.
`lib/apiClient.ts` is well built: single-flighted token refresh so concurrent 401s do not invalidate each other's rotated token, a typed `ApiError` carrying field-level validation errors, and a guarded non-JSON response path. `lib/config.ts` centralises the API base URL. No hardcoded secrets; `.env.example` and `.env.local` contain only `NEXT_PUBLIC_API_URL`, which is correctly public.

**Admin app (`Frontend`).**
`context/AuthContext.tsx` gates on `res.user.role === "Admin"` from `/auth/me` and redirects otherwise. This is a UX control, not a security boundary — correctly, the backend enforces authorisation independently. `utils/api.ts:39` logs every request URL to the browser console (noise, not a leak).

**Findings across both:** M‑9 (localStorage tokens, no CSP).

**Explicitly checked and clean:**
- No `dangerouslySetInnerHTML`, no `eval`, no `new Function`, no `innerHTML` assignment anywhere in either app.
- No markdown or rich-text renderer, so no stored-XSS sink for review or support content.
- No API keys or secrets in client code; only `NEXT_PUBLIC_*` variables are referenced.
- `next.config.ts` in the customer app restricts `images.remotePatterns` to three named hosts rather than a wildcard.
- Source maps are not explicitly enabled for production; Next.js defaults to omitting client source maps in `next build`.
- Client-side validation is mirrored server-side on every V1 endpoint, so bypassing the browser gains nothing.

---

## 12. Backend Security Review

**Strengths — these are genuinely well done and should be preserved:**
- **SQL injection: none found.** Every query across ~40 repositories and services uses `request.input()` parameter binding. Dynamic `ORDER BY` clauses are resolved through allow-list maps (`customer.product.service.ts:58‑63`, `search.service.ts:58‑63`, `customer.review.service.ts:13‑19`) — the one pattern that usually goes wrong, done right. Dynamic `SET` clauses build column names from hardcoded arrays, never from user keys (`customer.address.repository.ts:69‑85`). `variant.repository.ts:40` interpolates an `IN (...)` list, but the values are integers read from a prior query, not user input.
- **Transactions** are used correctly for checkout, cancellation, user creation, and point mutations, with `UPDLOCK, ROWLOCK` hints on inventory rows.
- **`AuditService`** is invoked consistently across authentication, profile, checkout, payments, orders, reviews, returns and support.
- **Layering** (routes → controller → service → repository) is clean and consistent in the V1 modules.
- **No command injection, SSRF, deserialisation, prototype-pollution, or path-traversal vectors** were found. There is no `eval`, no `child_process`, no user-controlled `require`, and no user-influenced outbound HTTP anywhere in the backend.

**Weaknesses:** the entire legacy/admin surface (validation, lockout, rate limiting, error handling, response shaping), plus the money-handling logic in checkout and payments.

**Duplication risk.** Two auth services, two order services, two product controllers, two coupon services, and two upload-consuming controllers coexist. C‑1 exists in exactly one of the two registration implementations. Consolidation is the highest-leverage structural fix available.

---

## 13. Infrastructure & Configuration Review

| Control | Status | Detail |
|---|---|---|
| Helmet | ✅ | Enabled at `app.ts:30` with defaults → CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` on API responses. `crossOriginResourcePolicy: 'cross-origin'` is a deliberate, appropriate relaxation for `/uploads`. |
| CORS | ⚠️ | Allow-list enforced; no-Origin requests permitted (L‑6). |
| CSP (frontends) | ❌ | Absent from both Next apps (M‑9). |
| HSTS | ⚠️ | Set by Helmet on API responses; meaningless until TLS terminates in front of the app. |
| Rate limiting | ❌ | Effectively disabled by `RATE_LIMIT_MAX=10000` (M‑3). |
| Request size limits | ✅ | 100 kB bodies, 5 MB × 5 uploads. |
| Compression | ✅ | Enabled. No CRIME/BREACH concern — no secrets are reflected into compressed responses. |
| `NODE_ENV` | ❌ | `development` in the live `.env`, and `env.ts:35` defaults to it (H‑4). |
| Secrets in git | ✅ | `.gitignore` covers `.env`; `git log --all --diff-filter=A` confirms only `.env.example` was ever committed. A pattern scan for AWS/Stripe/Google/Razorpay/PEM keys across tracked files returned nothing. |
| `dist/` in git | ✅ | Excluded. |
| Build config | ✅ | `tsc` with no unsafe flags; nothing dangerous in either `next.config.ts`. |
| Migrations | ⚠️ | Run automatically on every boot (`app.ts:105`), including `seed.sql` (C‑3). Idempotent, but should not be automatic in production. |
| TLS to database | ❌ | `encrypt: true` but `trustServerCertificate: true` (M‑13). |
| Containerisation / IaC | — | No Dockerfile, compose file, CI config, or deployment manifest exists. Deployment hardening (non-root user, read-only filesystem, secret injection, reverse proxy, WAF) is entirely unaddressed and must be designed before launch. |

---

## 14. Business Logic Security Review

| Flow | Status | Finding |
|---|---|---|
| **Price manipulation** | ✅ | Prices are always re-read from `Products` under `UPDLOCK` at checkout (`checkout.service.ts:92‑113`). Client-supplied prices are never trusted. Correctly implemented. |
| **Quantity manipulation** | ⚠️ | Bounded 1‑100 per line by validators and checked against stock — except when no `Inventory` row exists (M‑5). |
| **Cart tampering** | ✅ | Cart is server-side; every mutation verifies `item.user_id !== userId`. |
| **Coupon abuse** | ❌ | No per-user limit; usage check races the increment (H‑2). |
| **Points / discount abuse** | ❌ | Redemption unvalidated against balance (H‑1). |
| **Payment bypass** | ❌ | Simulated gateway approves anything (C‑2). |
| **Double spending / duplicate orders** | ⚠️ | Idempotency key is advisory only — no unique index (M‑6). |
| **Race conditions** | ⚠️ | Inventory is properly serialised with `UPDLOCK, ROWLOCK`; coupons and idempotency are not. |
| **Order tampering** | ✅ | Status transitions are server-controlled; `CANCELLABLE_ORDER_STATUSES` is enforced; customers cannot set status directly. |
| **Refund / return abuse** | ⚠️ | Ownership, order status, duplicate requests and refund amount are all validated correctly. The only gap is the return window measuring from `updated_at` (L‑9). |
| **Review manipulation** | ✅ | One review per user per product, verified-purchase flag derived server-side from delivered orders, self-voting blocked, edits reset status to `Pending`. Well done. |
| **Inventory manipulation** | ✅ | Adjustment endpoints require `Admin`/`Super Admin`/`Inventory Manager`. Cancellation restores stock inside the transaction. |
| **Loyalty tier gaming** | ✅ | Tier is derived from `lifetime_points` inside the awarding transaction; not client-settable. |
| **Referral abuse** | ✅ | Self-referral is blocked — though the function is never called (L‑10). |

---

## 15. Final Go / No-Go Recommendation

# ⛔ NO-GO FOR PRODUCTION

**Rationale.** Two independent, unauthenticated paths grant complete administrative control of the platform (C‑1, C‑3), and a third makes every token forgeable by anyone who has read the repository (C‑4). Two further defects let any customer obtain goods without paying (C‑2, H‑1). Deploying in this state should be expected to result in compromise and in a reportable breach of customer personal data.

**Conditions for GO:**

1. **All four Critical findings closed and independently verified.** C‑1, C‑3 and C‑4 are roughly one engineer-day combined; C‑2 requires a real gateway integration.
2. **All four High findings closed** (H‑1 through H‑4).
3. **Medium findings M‑1, M‑3, M‑5, M‑6, M‑9, M‑12, M‑13 closed** — these cover response hygiene, brute-force resistance, order integrity, browser hardening, incident-response capability, and database blast radius.
4. **Deployment infrastructure designed and hardened.** None currently exists: TLS termination, secret management, a non-root container, database network isolation, log aggregation, and backups.
5. **Regression tests** covering each Critical and High finding, in CI.
6. **A follow-up authenticated penetration test** against the remediated build, with particular attention to checkout and payment.

**Achievable timeline:** 3‑4 weeks with one focused engineer. **Phase 0 alone (about one day) eliminates both unauthenticated-takeover paths** and is worth doing immediately regardless of the wider schedule.

**Closing note for stakeholders.** The severity of these findings should not be read as a verdict on the codebase as a whole. The data-access layer is genuinely well built — no SQL injection across roughly 40 repositories, correct transaction and locking discipline, consistent ownership checks, sound OTP and refresh-token handling, and no XSS sinks in either frontend. The Critical findings are concentrated in the older admin surface and in the payment integration that was explicitly left as a stub. This is a fixable set of specific defects in an otherwise sound architecture, not a rewrite.

---

*Findings are based on static analysis of the codebase at the commit noted above. Items marked "requires verification" need runtime or tooling confirmation. This assessment does not substitute for dynamic penetration testing of a deployed instance.*
