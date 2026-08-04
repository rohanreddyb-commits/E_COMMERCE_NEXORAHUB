-- =======================================================================================
-- NexoraHub — Optional Demo Data (customers, addresses, orders, reviews)
--
-- NOT run automatically. This file is never referenced by
-- backend/src/database/initDb.ts — run it by hand only if you want a few
-- fake customers and orders for screenshots / admin-dashboard demos:
--
--     sqlcmd -S localhost -d NexoraHub_DB -i database/sample_data.sql
--
-- Safety contract (this matters — the previous version of this file did not
-- honour it):
--   - Every insert is idempotent, keyed by email/order_number, so re-running
--     this file is a no-op instead of a duplicate-data error.
--   - This file NEVER deletes anything. The old version started with
--     `DELETE FROM Users WHERE user_id <> 1` and similar statements, which
--     assumed a hardcoded admin at user_id=1 (no longer seeded) and would
--     wipe out real product, order and customer data on a machine that
--     already had any. That is exactly the "affects another computer"
--     failure mode — removed entirely.
--   - It only touches the three demo customers it creates (by email) and
--     their own orders/reviews. Every other row in the database — your real
--     catalog, your bootstrapped admin, any other customer — is untouched.
--
-- Demo login (all three): password `DemoPassword123`
-- =======================================================================================

USE NexoraHub_DB;
GO

-- --- Demo customers ---------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM Users WHERE email = 'john.doe@example.test')
BEGIN
    INSERT INTO Users (first_name, last_name, email, password_hash, phone, status, is_email_verified, created_at, updated_at)
    VALUES (N'John', N'Doe', N'john.doe@example.test',
            '$2b$12$Cf6ntfQFstAO4ps6TD/2bOfcDnDdL1AO5QELYylG0Dm2ftkqg4bbS',
            '206-555-0192', 'Active', 1, DATEADD(day, -30, GETDATE()), GETDATE());

    INSERT INTO UserRoles (user_id, role_id)
    SELECT u.user_id, r.role_id FROM Users u, Roles r
    WHERE u.email = 'john.doe@example.test' AND r.name = 'Customer';
END;

IF NOT EXISTS (SELECT 1 FROM Users WHERE email = 'jane.smith@example.test')
BEGIN
    INSERT INTO Users (first_name, last_name, email, password_hash, phone, status, is_email_verified, created_at, updated_at)
    VALUES (N'Jane', N'Smith', N'jane.smith@example.test',
            '$2b$12$Cf6ntfQFstAO4ps6TD/2bOfcDnDdL1AO5QELYylG0Dm2ftkqg4bbS',
            '512-555-0122', 'Active', 1, DATEADD(day, -20, GETDATE()), GETDATE());

    INSERT INTO UserRoles (user_id, role_id)
    SELECT u.user_id, r.role_id FROM Users u, Roles r
    WHERE u.email = 'jane.smith@example.test' AND r.name = 'Customer';
END;

IF NOT EXISTS (SELECT 1 FROM Users WHERE email = 'alice.johnson@example.test')
BEGIN
    INSERT INTO Users (first_name, last_name, email, password_hash, phone, status, is_email_verified, created_at, updated_at)
    VALUES (N'Alice', N'Johnson', N'alice.johnson@example.test',
            '$2b$12$Cf6ntfQFstAO4ps6TD/2bOfcDnDdL1AO5QELYylG0Dm2ftkqg4bbS',
            '312-555-0188', 'Active', 1, DATEADD(day, -10, GETDATE()), GETDATE());

    INSERT INTO UserRoles (user_id, role_id)
    SELECT u.user_id, r.role_id FROM Users u, Roles r
    WHERE u.email = 'alice.johnson@example.test' AND r.name = 'Customer';
END;
GO

-- --- Demo addresses (one shipping address per demo customer) ---------------------------
INSERT INTO Addresses (user_id, type, title, first_name, last_name, phone, street, city, state, postal_code, country, is_default)
SELECT u.user_id, 'Shipping', N'Home', u.first_name, u.last_name, u.phone, v.street, v.city, v.state, v.postal_code, N'USA', 1
FROM Users u
INNER JOIN (VALUES
    ('john.doe@example.test',    N'123 Main St',  N'Seattle', N'WA', '98101'),
    ('jane.smith@example.test',  N'789 Oak Ave',  N'Austin',  N'TX', '78701'),
    ('alice.johnson@example.test', N'456 Elm Rd', N'Chicago', N'IL', '60601')
) AS v(email, street, city, state, postal_code) ON u.email = v.email
WHERE NOT EXISTS (SELECT 1 FROM Addresses a WHERE a.user_id = u.user_id);
GO

-- --- Demo orders (only created if the demo customer has none yet) ---------------------
IF NOT EXISTS (SELECT 1 FROM Orders WHERE order_number = 'DEMO-ORD-0001')
INSERT INTO Orders (order_number, user_id, shipping_address_id, subtotal, shipping_fee, tax_amount, discount_amount, total_amount, coupon_id, order_status, payment_status, payment_method, created_at, updated_at)
SELECT 'DEMO-ORD-0001', u.user_id, a.address_id, 1548.99, 0.00, 0.00, 50.00, 1498.99, co.coupon_id, 'Shipped', 'Paid', 'Credit Card', DATEADD(day, -7, GETDATE()), GETDATE()
FROM Users u
JOIN Addresses a ON a.user_id = u.user_id
LEFT JOIN Coupons co ON co.code = 'SUMMER50'
WHERE u.email = 'john.doe@example.test';

IF NOT EXISTS (SELECT 1 FROM Orders WHERE order_number = 'DEMO-ORD-0002')
INSERT INTO Orders (order_number, user_id, shipping_address_id, subtotal, shipping_fee, tax_amount, discount_amount, total_amount, coupon_id, order_status, payment_status, payment_method, created_at, updated_at)
SELECT 'DEMO-ORD-0002', u.user_id, a.address_id, 89.99, 0.00, 0.00, 9.00, 80.99, co.coupon_id, 'Delivered', 'Paid', 'PayPal', DATEADD(day, -5, GETDATE()), GETDATE()
FROM Users u
JOIN Addresses a ON a.user_id = u.user_id
LEFT JOIN Coupons co ON co.code = 'WELCOME10'
WHERE u.email = 'jane.smith@example.test';

IF NOT EXISTS (SELECT 1 FROM Orders WHERE order_number = 'DEMO-ORD-0003')
INSERT INTO Orders (order_number, user_id, shipping_address_id, subtotal, shipping_fee, tax_amount, discount_amount, total_amount, coupon_id, order_status, payment_status, payment_method, created_at, updated_at)
SELECT 'DEMO-ORD-0003', u.user_id, a.address_id, 1199.00, 0.00, 0.00, 0.00, 1199.00, NULL, 'Pending', 'Pending', 'Credit Card', DATEADD(day, -2, GETDATE()), GETDATE()
FROM Users u
JOIN Addresses a ON a.user_id = u.user_id
WHERE u.email = 'alice.johnson@example.test';
GO

-- --- Demo order items --------------------------------------------------------------------
INSERT INTO OrderItems (order_id, product_id, product_name, sku, quantity, unit_price, total_price)
SELECT o.order_id, p.product_id, p.name, p.sku, v.quantity, p.price, p.price * v.quantity
FROM Orders o
INNER JOIN (VALUES
    ('DEMO-ORD-0001', 'SKU-AAPL-IPH15PM', 1),
    ('DEMO-ORD-0001', 'SKU-SONY-WH1000XM5', 1),
    ('DEMO-ORD-0002', 'SKU-NIKE-RUNAIR', 1),
    ('DEMO-ORD-0003', 'SKU-AAPL-IPH15PM', 1)
) AS v(order_number, sku, quantity) ON o.order_number = v.order_number
INNER JOIN Products p ON p.sku = v.sku
WHERE NOT EXISTS (SELECT 1 FROM OrderItems oi WHERE oi.order_id = o.order_id AND oi.product_id = p.product_id);
GO

-- --- Demo transactions --------------------------------------------------------------------
INSERT INTO Transactions (order_id, gateway_transaction_id, amount, payment_method, status, created_at)
SELECT o.order_id, v.txn_id, o.total_amount, o.payment_method, 'Success', o.created_at
FROM Orders o
INNER JOIN (VALUES ('DEMO-ORD-0001', 'TXN_DEMO_0001'), ('DEMO-ORD-0002', 'TXN_DEMO_0002')) AS v(order_number, txn_id)
    ON o.order_number = v.order_number
WHERE NOT EXISTS (SELECT 1 FROM Transactions t WHERE t.order_id = o.order_id);
GO

-- --- Demo reviews ---------------------------------------------------------------------
INSERT INTO Reviews (product_id, user_id, rating, title, comment, body, status, is_verified_purchase, created_at, updated_at)
SELECT p.product_id, u.user_id, v.rating, v.title, v.body, v.body, v.status, 1, DATEADD(day, -4, GETDATE()), GETDATE()
FROM (VALUES
    ('SKU-AAPL-IPH15PM',   'john.doe@example.test',    5, N'Best iPhone yet!',        N'Super premium feel with the titanium finish. The camera system is insane.', 'Approved'),
    ('SKU-SONY-WH1000XM5', 'jane.smith@example.test',  4, N'Incredible ANC quality',  N'ANC is top notch. Sound signature is slightly bass heavy but easily fixable in EQ.', 'Approved')
) AS v(sku, email, rating, title, body, status)
JOIN Products p ON p.sku = v.sku
JOIN Users u ON u.email = v.email
WHERE NOT EXISTS (SELECT 1 FROM Reviews r WHERE r.product_id = p.product_id AND r.user_id = u.user_id);
GO

PRINT 'Demo data ready. Sign in with any of the three demo emails above and password DemoPassword123.';
GO
