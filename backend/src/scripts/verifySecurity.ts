/**
 * Security regression harness.
 *
 *   npm run verify:security
 *
 * Re-runs the attacks from the security assessment against the current code.
 * Every check must FAIL to exploit. Offline by design — no database or network
 * is required, so this is safe to wire into CI as a gate.
 *
 * Exits non-zero if any control has regressed.
 */
import { execFileSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

let passed = 0;
let failed = 0;

const check = (name: string, condition: boolean, detail = ''): void => {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

const section = (title: string) => console.log(`\n${title}`);

/**
 * Boot-guard checks spawn a plain `node` child, which cannot load .ts — point
 * it at the compiled output. Run `npm run build` first.
 */
const COMPILED_ENV = path.join(__dirname, '../../dist/config/env.js');
if (!fs.existsSync(COMPILED_ENV)) {
  console.error('dist/config/env.js not found. Run `npm run build` before `npm run verify:security`.');
  process.exit(1);
}

/** Run a snippet in a child process with a specific env; return thrown message or ''. */
const bootWith = (envOverrides: Record<string, string>): string => {
  const script = `
    try { require(${JSON.stringify(COMPILED_ENV)}); console.log('BOOTED'); }
    catch (e) { console.log('THREW:' + e.message); }
  `;
  try {
    const out = execFileSync(process.execPath, ['-e', script], {
      env: { ...process.env, ...envOverrides },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return out.trim();
  } catch (err: any) {
    return `THREW:${err.message}`;
  }
};

async function main(): Promise<void> {
  console.log('NexoraHub — security regression checks\n' + '='.repeat(60));

  // ─── C-4: secret validation at boot ────────────────────────────────────────
  section('C-4  JWT secret hygiene');
  check(
    'Placeholder JWT_SECRET is refused at boot',
    bootWith({ JWT_SECRET: 'super_secret_jwt_key_change_me_in_production' }).includes('THREW')
  );
  check(
    'Short JWT_SECRET is refused at boot',
    bootWith({ JWT_SECRET: 'tooshort' }).includes('THREW')
  );
  check(
    'A strong JWT_SECRET boots normally',
    bootWith({ JWT_SECRET: crypto.randomBytes(48).toString('base64url') }).includes('BOOTED')
  );
  check(
    'Production without JWT_ADMIN_SECRET is refused',
    bootWith({
      NODE_ENV: 'production',
      JWT_SECRET: crypto.randomBytes(48).toString('base64url'),
      JWT_ADMIN_SECRET: '',
      DB_TRUST_SERVER_CERTIFICATE: 'false',
    }).includes('THREW')
  );
  check(
    'Production with DB_TRUST_SERVER_CERTIFICATE=true is refused',
    bootWith({
      NODE_ENV: 'production',
      JWT_SECRET: crypto.randomBytes(48).toString('base64url'),
      JWT_ADMIN_SECRET: crypto.randomBytes(48).toString('base64url'),
      DB_TRUST_SERVER_CERTIFICATE: 'true',
    }).includes('THREW')
  );

  const { env } = await import('../config/env');

  check(
    'Rate limit cannot be disabled via .env (capped)',
    (() => {
      const out = execFileSync(
        process.execPath,
        ['-e', `const {env}=require(${JSON.stringify(COMPILED_ENV)});console.log(env.RATE_LIMIT_MAX)`],
        { env: { ...process.env, RATE_LIMIT_MAX: '999999' }, encoding: 'utf8' }
      ).trim();
      return Number(out) <= 1000;
    })(),
    'RATE_LIMIT_MAX must be clamped'
  );
  check('Admin and customer signing keys differ', env.JWT_SECRET !== env.JWT_ADMIN_SECRET);

  // ─── C-4 / token realm separation ──────────────────────────────────────────
  section('C-4  Token realm separation & forgery');

  const customerToken = jwt.sign(
    { userId: 1, email: 'c@x.io', roles: ['Customer'], permissions: [], sessionId: 'sess-1', typ: 'customer' },
    env.JWT_SECRET,
    { expiresIn: '15m', issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE_CUSTOMER }
  );
  const adminToken = jwt.sign(
    { userId: 2, email: 'a@x.io', roles: ['Super Admin'], permissions: [], typ: 'admin' },
    env.JWT_ADMIN_SECRET,
    { expiresIn: '15m', issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE_ADMIN }
  );

  const verifyAs = (token: string, secret: string, audience: string): boolean => {
    try {
      jwt.verify(token, secret, { issuer: env.JWT_ISSUER, audience, algorithms: ['HS256'] });
      return true;
    } catch {
      return false;
    }
  };

  check(
    'Customer token REJECTED by the admin realm',
    !verifyAs(customerToken, env.JWT_ADMIN_SECRET, env.JWT_AUDIENCE_ADMIN)
  );
  check(
    'Admin token REJECTED by the customer realm',
    !verifyAs(adminToken, env.JWT_SECRET, env.JWT_AUDIENCE_CUSTOMER)
  );
  check('Customer token accepted by its own realm', verifyAs(customerToken, env.JWT_SECRET, env.JWT_AUDIENCE_CUSTOMER));
  check('Admin token accepted by its own realm', verifyAs(adminToken, env.JWT_ADMIN_SECRET, env.JWT_AUDIENCE_ADMIN));

  const forged = jwt.sign(
    { userId: 1, roles: ['Super Admin'], typ: 'admin' },
    'super_secret_jwt_key_change_me_in_production',
    { expiresIn: '24h', issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE_ADMIN }
  );
  check(
    'Token forged with the old placeholder secret is rejected',
    !verifyAs(forged, env.JWT_ADMIN_SECRET, env.JWT_AUDIENCE_ADMIN)
  );

  const algNone = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url') +
    '.' + Buffer.from(JSON.stringify({ userId: 1, roles: ['Super Admin'], typ: 'admin' })).toString('base64url') + '.';
  check(
    'alg=none token is rejected (algorithms pinned)',
    !verifyAs(algNone, env.JWT_ADMIN_SECRET, env.JWT_AUDIENCE_ADMIN)
  );

  const noAud = jwt.sign({ userId: 1, roles: ['Super Admin'], typ: 'admin' }, env.JWT_ADMIN_SECRET, {
    expiresIn: '15m',
  });
  check(
    'Token without the pinned audience is rejected',
    !verifyAs(noAud, env.JWT_ADMIN_SECRET, env.JWT_AUDIENCE_ADMIN)
  );

  // ─── C-1: mass assignment ──────────────────────────────────────────────────
  section('C-1  Privilege escalation via role_id');
  const authServiceSrc = fs.readFileSync(path.join(__dirname, '../../src/services/auth.service.ts'), 'utf8');
  check(
    'AuthService.register no longer reads role_id from input',
    !/userData\.role_id/.test(authServiceSrc)
  );
  check(
    'AuthService.register resolves the Customer role server-side',
    /findRoleByName\(SELF_SERVICE_ROLE_NAME\)/.test(authServiceSrc)
  );
  const authControllerSrc = fs.readFileSync(path.join(__dirname, '../../src/controllers/auth.controller.ts'), 'utf8');
  check(
    'Controller forwards a field whitelist, not req.body',
    !/register\(req\.body\)/.test(authControllerSrc)
  );
  const userRoutesSrc = fs.readFileSync(path.join(__dirname, '../../src/routes/user.routes.ts'), 'utf8');
  check(
    'Role mutation restricted to Super Admin',
    /\/:id\/role[\s\S]*authorizeRole\(\['Super Admin'\]\)/.test(userRoutesSrc)
  );

  // ─── M-1: credential projection ────────────────────────────────────────────
  section('M-1  Password hash never projected into responses');
  const userRepoSrc = fs.readFileSync(path.join(__dirname, '../../src/repositories/user.repository.ts'), 'utf8');
  check('createUser no longer uses OUTPUT inserted.*', !/OUTPUT inserted\.\*/.test(userRepoSrc));
  check(
    'A safe projection constant exists and excludes password_hash',
    /SAFE_USER_PROJECTION/.test(userRepoSrc) &&
      !/SAFE_USER_PROJECTION\s*=\s*`[^`]*password_hash/.test(userRepoSrc)
  );

  // ─── C-3: default admin ────────────────────────────────────────────────────
  section('C-3  Default administrator account');
  const seedSrc = fs.readFileSync(path.join(__dirname, '../../database/seed.sql'), 'utf8');
  check('seed.sql no longer INSERTs admin@ecommerce.com', !/INSERT INTO Users[\s\S]{0,400}admin@ecommerce\.com/i.test(seedSrc));
  check('seed.sql actively disables any legacy default admin', /status = 'Banned'/.test(seedSrc));
  check(
    'A manual bootstrap script exists',
    fs.existsSync(path.join(__dirname, '../../src/scripts/bootstrapAdmin.ts'))
  );

  // ─── C-2: payment gateway ──────────────────────────────────────────────────
  section('C-2  Payment verification');
  const gatewaySrc = fs.readFileSync(
    path.join(__dirname, '../../src/modules/payments/gateways/simulated.gateway.ts'),
    'utf8'
  );
  check(
    'Simulator is refused in production',
    /IS_PRODUCTION[\s\S]{0,200}FATAL/.test(gatewaySrc)
  );
  check(
    'Simulator no longer approves on a bare client-supplied id',
    !/success\s*=\s*!!\(paymentData\.gatewayPaymentId/.test(gatewaySrc)
  );
  check('Razorpay verification computes an HMAC', /createHmac\('sha256', env\.RAZORPAY_KEY_SECRET\)/.test(gatewaySrc));
  check('Signature comparison is constant-time', /timingSafeEqual/.test(gatewaySrc));

  const paymentSvcSrc = fs.readFileSync(
    path.join(__dirname, '../../src/modules/payments/payment.service.ts'),
    'utf8'
  );
  check('Verify rejects an already-paid order', /already been paid/.test(paymentSvcSrc));
  check('Verify enforces gateway-vs-order amount match', /Payment amount does not match/.test(paymentSvcSrc));
  check(
    'Settlement UPDATE re-asserts the unpaid precondition',
    /payment_status <> 'Paid'/.test(paymentSvcSrc)
  );

  // Prove the simulated gateway now rejects the original exploit payload.
  const { SimulatedGateway } = await import('../modules/payments/gateways/simulated.gateway');
  const sim = new SimulatedGateway();
  const exploit = await sim.verifyPayment({ gatewayPaymentId: 'x', orderId: '1' });
  check('Original exploit payload {gatewayPaymentId:"x"} is REJECTED', exploit.success === false);
  const intent = await sim.createPaymentIntent(42, 199.99, 'INR');
  const legit = await sim.verifyPayment({
    gatewayOrderId: intent.gatewayOrderId,
    amount: '199.99',
    signature: String((intent.gatewayData as any).signature),
  });
  check('A correctly signed simulated payment still verifies', legit.success === true);
  const tampered = await sim.verifyPayment({
    gatewayOrderId: intent.gatewayOrderId,
    amount: '1.00', // attacker lowers the amount
    signature: String((intent.gatewayData as any).signature),
  });
  check('Tampering with the amount invalidates the signature', tampered.success === false);

  // ─── H-1 / H-2: checkout integrity ─────────────────────────────────────────
  section('H-1/H-2  Checkout business logic');
  const checkoutSrc = fs.readFileSync(
    path.join(__dirname, '../../src/modules/checkout/checkout.service.ts'),
    'utf8'
  );
  check(
    'Point balance is verified inside the order transaction',
    /RewardPoints WITH \(UPDLOCK, ROWLOCK\)/.test(checkoutSrc)
  );
  check(
    'redeemPoints is no longer called post-commit in setImmediate',
    !/setImmediate[\s\S]{0,800}redeemPoints/.test(checkoutSrc)
  );
  check('Coupon is claimed with a single guarded UPDATE', /SET used_count = used_count \+ 1[\s\S]{0,400}OUTPUT inserted/.test(checkoutSrc));
  check('Per-customer coupon ledger is written', /INSERT INTO CouponRedemptions/.test(checkoutSrc));
  check('Inventory join is INNER (no null-stock bypass)', /INNER JOIN Inventory i WITH \(UPDLOCK, ROWLOCK\)/.test(checkoutSrc));
  check('Stock deduction asserts rowsAffected', /if \(!deduct\.rowsAffected\[0\]\)/.test(checkoutSrc));

  // security_hardening.sql, customer_schema.sql and variants_migration.sql were
  // consolidated into the single master schema.sql — see database/schema.sql.
  const schemaSrc = fs.readFileSync(path.join(__dirname, '../../database/schema.sql'), 'utf8');
  check('CouponRedemptions has a per-customer UNIQUE constraint', /UQ_CouponRedemptions_Coupon_User UNIQUE \(coupon_id, user_id\)/.test(schemaSrc));
  check('Orders.idempotency_key has a unique index', /UNIQUE INDEX\s+UQ_Orders_IdempotencyKey/.test(schemaSrc));

  // ─── H-3: session revocation ───────────────────────────────────────────────
  section('H-3  Session revocation');
  const custMwSrc = fs.readFileSync(
    path.join(__dirname, '../../src/common/middleware/customer.auth.middleware.ts'),
    'utf8'
  );
  check('Middleware consults the session registry', /sessionRegistry\.isSessionActive/.test(custMwSrc));
  check('Registry failure denies rather than allows', /Unable to verify your session/.test(custMwSrc));
  const authRepoSrc = fs.readFileSync(
    path.join(__dirname, '../../src/modules/authentication/customer.auth.repository.ts'),
    'utf8'
  );
  check('revokeSession invalidates the cache', /sessionRegistry\.invalidate\(sessionId\)/.test(authRepoSrc));
  check('revokeAllUserSessions invalidates the cache', /sessionRegistry\.invalidateUser\(userId\)/.test(authRepoSrc));
  check('Access-token lifetime is short', ['15m', '5m', '10m'].includes(env.JWT_EXPIRY));

  // ─── H-4: error disclosure ─────────────────────────────────────────────────
  section('H-4  Error response hygiene');
  const errSrc = fs.readFileSync(path.join(__dirname, '../../src/middlewares/error.middleware.ts'), 'utf8');
  check('Error object is never spread into the response', !/\.\.\.error/.test(errSrc));
  check('Stack traces are never serialised to the client', !/stack: error\.stack/.test(errSrc) && !/\{ stack/.test(errSrc));
  check('Non-ApiError messages are replaced with a generic string', /An unexpected error occurred/.test(errSrc));

  // ─── M-4: upload validation ────────────────────────────────────────────────
  section('M-4  Upload validation');
  const uploadSrc = fs.readFileSync(path.join(__dirname, '../../src/middleware/upload.ts'), 'utf8');
  check('Unanchored extension regex removed', !/allowedTypes\s*=\s*\/jpeg\|jpg/.test(uploadSrc));
  check('Extension allow-list is a fixed map', /ALLOWED_TYPES: Record<string, string>/.test(uploadSrc));
  check('Magic-byte verification exists', /MAGIC_BYTES/.test(uploadSrc) && /verifyUploadedImages/.test(uploadSrc));
  check('Stored filename is random, not client-derived', /crypto\.randomUUID\(\)/.test(uploadSrc));

  // ─── M-10 / auth messaging ─────────────────────────────────────────────────
  section('M-10  Login failure messaging');
  const custAuthSrc = fs.readFileSync(
    path.join(__dirname, '../../src/modules/authentication/customer.auth.service.ts'),
    'utf8'
  );
  check('Remaining-attempt count is no longer disclosed', !/attempt\(s\) remaining/.test(custAuthSrc));
  check('A single constant failure message is used', /GENERIC_LOGIN_FAILURE/.test(custAuthSrc));
  check('Email verification is enforced at login', /verify your email address before signing in/i.test(custAuthSrc));
  check('OTP comparison is constant-time', /constantTimeEquals\(record\.otp_hash/.test(custAuthSrc));
  check('OTP attempts are bounded', /MAX_OTP_ATTEMPTS/.test(custAuthSrc));

  // ─── Crypto primitives ─────────────────────────────────────────────────────
  section('Crypto primitives');
  const { generateOTP, constantTimeEquals, hashToken } = await import('../common/utils/crypto.util');
  const otps = Array.from({ length: 4000 }, () => generateOTP(6));
  check('OTP is always 6 digits', otps.every((o) => /^\d{6}$/.test(o)));
  check('OTP never has a leading zero (range-correct)', otps.every((o) => o[0] !== '0'));
  const uniqueRatio = new Set(otps).size / otps.length;
  check('OTP output is well distributed', uniqueRatio > 0.9, `unique ratio ${uniqueRatio.toFixed(3)}`);
  check('constantTimeEquals matches equal strings', constantTimeEquals('abc', 'abc'));
  check('constantTimeEquals rejects different strings', !constantTimeEquals('abc', 'abd'));
  check('constantTimeEquals handles length mismatch without throwing', !constantTimeEquals('a', 'abcdefgh'));
  check('hashToken is stable', hashToken('x') === hashToken('x'));

  // ─── M-12: log redaction ───────────────────────────────────────────────────
  section('M-12  Log redaction');
  const loggerSrc = fs.readFileSync(path.join(__dirname, '../../src/config/logger.ts'), 'utf8');
  check('Redaction format is applied', /redactFormat/.test(loggerSrc));
  check('Durable file transports configured', /winston\.transports\.File/.test(loggerSrc));
  check('Dedicated security log stream', /security\.log/.test(loggerSrc));
  const emailSrc = fs.readFileSync(path.join(__dirname, '../../src/shared/email/email.service.ts'), 'utf8');
  check('OTP email bodies are no longer logged', !/STUB\] BODY/.test(emailSrc));
  check('Email templates escape interpolated values', /escapeHtml\(firstName\)/.test(emailSrc));

  // ─── Configuration / headers ───────────────────────────────────────────────
  section('Security configuration');
  const appSrc = fs.readFileSync(path.join(__dirname, '../../src/app.ts'), 'utf8');
  check('HSTS configured', /hsts:/.test(appSrc));
  check('frameguard deny', /frameguard: \{ action: 'deny' \}/.test(appSrc));
  check('Referrer-Policy set', /referrerPolicy/.test(appSrc));
  check('CSP configured on API responses', /contentSecurityPolicy/.test(appSrc));
  check('Explicit JSON body limit', /express\.json\(\{ limit: '100kb' \}\)/.test(appSrc));
  check('trust proxy is a fixed hop count, not true', /app\.set\('trust proxy', 1\)/.test(appSrc));
  check('x-powered-by disabled', /disable\('x-powered-by'\)/.test(appSrc));
  check('Health endpoint no longer leaks NODE_ENV', !/environment: env\.NODE_ENV/.test(appSrc));
  check('Uploads served with nosniff + sandbox', /X-Content-Type-Options/.test(appSrc) && /sandbox/.test(appSrc));
  check('Per-request /uploads console.log removed', !/Static File Request/.test(appSrc));

  // ─── Dead code ─────────────────────────────────────────────────────────────
  section('L-1  Dead legacy stack removed');
  const legacy = [
    'src/routes/authRoutes.ts', 'src/routes/orderRoutes.ts', 'src/routes/cartRoutes.ts',
    'src/routes/addressRoutes.ts', 'src/routes/productRoutes.ts', 'src/routes/adminRoutes.ts',
    'src/services/orderService.ts', 'src/services/authService.ts', 'src/repositories/userRepository.ts',
  ];
  for (const rel of legacy) {
    check(`Removed ${rel}`, !fs.existsSync(path.join(__dirname, '../../', rel)));
  }

  // ─── Injection surface ─────────────────────────────────────────────────────
  section('A03  Injection surface');
  const srcRoot = path.join(__dirname, '..');
  const walk = (dir: string, acc: string[] = []): string[] => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, acc);
      else if (entry.name.endsWith('.ts')) acc.push(full);
    }
    return acc;
  };
  const files = walk(srcRoot);

  /**
   * Every interpolation permitted inside a SQL template literal. Each is
   * either built from a server-side allow-list or composed of hardcoded
   * column names — never raw request data. Anything not on this list is
   * reported so it can be reviewed deliberately.
   */
  const SAFE_SQL_INTERPOLATIONS = new Set([
    'where',            // built from a fixed conditions[] array
    'orderBy',          // resolved through validSort map
    'sortField',        // resolved through validSortFields map
    'sortOrder',        // ternary → 'ASC' | 'DESC'
    "updates.join(', ')",
    'SAFE_USER_PROJECTION',
    'SAFE_USER_OUTPUT',
    'this.cartQuery',   // a hardcoded SELECT prefix
    'groupIds',         // integers read from a prior query
    'dateFormat',       // resolved through SALES_DATE_GROUPING map
  ]);

  /**
   * Match real SQL statement structure, not a bare keyword. "Update" appears
   * in log lines and email subjects; requiring `UPDATE <table> SET` (and
   * equivalents) keeps this check free of prose false positives.
   */
  const SQL_STATEMENT = /\bSELECT\b[\s\S]*\bFROM\b|\bINSERT\s+INTO\b|\bUPDATE\b\s+\w+[\s\S]{0,80}\bSET\b|\bDELETE\s+FROM\b|\bMERGE\b[\s\S]{0,80}\bUSING\b/i;

  const offenders: string[] = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    // Consider only template literals that actually look like SQL statements.
    for (const literal of content.match(/`[^`]*`/g) ?? []) {
      if (!SQL_STATEMENT.test(literal)) continue;
      for (const [, expr] of literal.matchAll(/\$\{([^}]*)\}/g)) {
        const trimmed = expr.trim();
        if (!SAFE_SQL_INTERPOLATIONS.has(trimmed)) {
          offenders.push(`${path.relative(srcRoot, file)}: \${${trimmed}}`);
        }
      }
    }
  }
  check(
    'No unreviewed interpolation inside SQL statements',
    offenders.length === 0,
    offenders.join(' | ')
  );
  const dangerous = files.filter((f) =>
    /\beval\(|new Function\(|child_process|execSync\(/.test(fs.readFileSync(f, 'utf8'))
  ).map((f) => path.relative(srcRoot, f)).filter((f) => !f.includes('scripts'));
  check('No eval / dynamic Function / shell execution', dangerous.length === 0, dangerous.join(', '));

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log(`${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log('\nSECURITY REGRESSION DETECTED.');
    process.exit(1);
  }
  console.log('\nAll security controls verified.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Verification harness error:', err);
  process.exit(1);
});
