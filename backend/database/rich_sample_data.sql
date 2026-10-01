-- =======================================================================================
-- NexoraHub — Rich Extended Demo Data Script for Admin Dashboard Analytics & Testing
-- Target Engine: Microsoft SQL Server (Azure SQL Compatible)
-- =======================================================================================

USE NexoraHub_DB;
GO

-- 1. EXTENDED BRANDS
INSERT INTO Brands (name, slug, description, logo_url, status, is_featured, created_at, updated_at)
SELECT v.name, v.slug, v.description, v.logo_url, 'Active', v.is_featured, GETDATE(), GETDATE()
FROM (VALUES
    ('Samsung',  'samsung',  'Next-gen mobile displays & smart devices', 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=400&q=80', 1),
    ('Bose',     'bose',     'Industry leading acoustic technology',    'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=400&q=80', 1),
    ('Dell',     'dell',     'High performance computing & Alienware',  'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=400&q=80', 0),
    ('Asus',     'asus',     'ROG gaming hardware & Zenbooks',          'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=400&q=80', 1),
    ('Logitech', 'logitech', 'Precision gaming peripherals & office gear', 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=400&q=80', 0),
    ('Adidas',   'adidas',   'Performance athletic footwear & sportswear', 'https://images.unsplash.com/photo-1518002171953-a080ee817e1f?auto=format&fit=crop&w=400&q=80', 1)
) AS v(name, slug, description, logo_url, is_featured)
WHERE NOT EXISTS (SELECT 1 FROM Brands WHERE slug = v.slug);
GO

-- 2. EXTENDED CATEGORIES
INSERT INTO Categories (name, slug, description, image_url, status, created_at, updated_at)
SELECT v.name, v.slug, v.description, v.image_url, 'Active', GETDATE(), GETDATE()
FROM (VALUES
    ('Laptops & PCs', 'laptops-pcs', 'Ultrabooks, workstation PCs, and gaming laptops', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80'),
    ('Wearables',     'wearables',   'Smartwatches, fitness bands, and AR glasses',       'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'),
    ('Gaming Gear',   'gaming-gear', 'Mechanical keyboards, mice, and controllers',      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80'),
    ('Apparel',       'apparel',     'Minimalist street-wear and technical outerwear',    'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=800&q=80')
) AS v(name, slug, description, image_url)
WHERE NOT EXISTS (SELECT 1 FROM Categories WHERE slug = v.slug);
GO

-- 3. ADDITIONAL RICH PRODUCTS
INSERT INTO Products (category_id, brand_id, name, slug, sku, description, short_description, price, sale_price, status, is_featured, created_at, updated_at)
SELECT c.category_id, b.brand_id, v.name, v.slug, v.sku, v.description, v.short_description, v.price, v.sale_price, 'Active', v.is_featured, DATEADD(day, -v.days_old, GETDATE()), GETDATE()
FROM (VALUES
    ('laptops-pcs', 'dell',     'Dell XPS 16 OLED Workstation',      'dell-xps-16-oled',        'SKU-DELL-XPS16',     'Intel Core Ultra 9, 32GB RAM, 1TB SSD, 4K Touch OLED display.', 'Ultimate creative workstation laptop.', 2499.00, 2299.00, 1, 15),
    ('laptops-pcs', 'asus',     'ROG Zephyrus G14 Gaming Laptop',   'rog-zephyrus-g14',        'SKU-ASUS-G14',      'AMD Ryzen 9, RTX 4070, Nebula HDR OLED 120Hz display.', 'Compact 14-inch gaming powerhouse.', 1899.00, 1749.00, 1, 25),
    ('audio',       'bose',     'Bose QuietComfort Ultra Headphones','bose-qc-ultra',          'SKU-BOSE-QCULTRA',  'World-class noise cancellation with spatial audio immersion.', 'Breakthrough spatial audio headphones.', 429.00, 399.00, 1, 10),
    ('wearables',   'samsung',  'Samsung Galaxy Watch 6 Classic',   'galaxy-watch-6-classic',  'SKU-SAMS-GW6C',     'Rotating bezel, body composition analysis, sapphire crystal glass.', 'Premium rotating bezel smartwatch.', 399.00, 349.00, 0, 8),
    ('gaming-gear', 'logitech', 'Logitech G PRO X SUPERLIGHT 2',    'logitech-gpro-superlight2','SKU-LOGI-GPRO2',    'LIGHTFORCE hybrid switches, HERO 2 sensor, 60g ultralight weight.', 'E-sports championship wireless gaming mouse.', 159.00, 139.00, 1, 40),
    ('apparel',     'adidas',   'Ultraboost Light Running Shoes',   'ultraboost-light-shoes',  'SKU-ADID-UBLIGHT',  'Light BOOST material with Continental rubber outsole for maximum energy return.', 'Lightest Ultraboost ever made.', 190.00, 169.00, 0, 30)
) AS v(cat_slug, brand_slug, name, slug, sku, description, short_description, price, sale_price, is_featured, days_old)
JOIN Categories c ON c.slug = v.cat_slug
JOIN Brands b ON b.slug = v.brand_slug
WHERE NOT EXISTS (SELECT 1 FROM Products WHERE sku = v.sku);
GO

-- INVENTORY FOR NEW PRODUCTS
INSERT INTO Inventory (product_id, quantity, reserved_quantity, low_stock_threshold, status, updated_at)
SELECT p.product_id, v.qty, 0, 10, 'In Stock', GETDATE()
FROM Products p
JOIN (VALUES
    ('SKU-DELL-XPS16',   15),
    ('SKU-ASUS-G14',     22),
    ('SKU-BOSE-QCULTRA', 45),
    ('SKU-SAMS-GW6C',    30),
    ('SKU-LOGI-GPRO2',   60),
    ('SKU-ADID-UBLIGHT', 50)
) AS v(sku, qty) ON p.sku = v.sku
WHERE NOT EXISTS (SELECT 1 FROM Inventory i WHERE i.product_id = p.product_id);
GO

-- 4. ADDITIONAL DEMO CUSTOMER ACCOUNTS
INSERT INTO Users (first_name, last_name, email, password_hash, phone, status, is_email_verified, created_at, updated_at)
SELECT v.fn, v.ln, v.email, '$2b$12$Cf6ntfQFstAO4ps6TD/2bOfcDnDdL1AO5QELYylG0Dm2ftkqg4bbS', v.phone, 'Active', 1, DATEADD(day, -v.days_ago, GETDATE()), GETDATE()
FROM (VALUES
    (N'Marcus',  N'Vance',     'marcus.vance@example.test',     '415-555-0101', 45),
    (N'Elena',   N'Rostova',   'elena.rostova@example.test',   '212-555-0144', 38),
    (N'Liam',    N'O''Connor', 'liam.oconnor@example.test',    '617-555-0182', 28),
    (N'Sophia',  N'Chen',      'sophia.chen@example.test',     '408-555-0199', 18),
    (N'David',   N'Kovacs',    'david.kovacs@example.test',     '305-555-0123', 12),
    (N'Amara',   N'Diallo',    'amara.diallo@example.test',     '202-555-0167', 5)
) AS v(fn, ln, email, phone, days_ago)
WHERE NOT EXISTS (SELECT 1 FROM Users WHERE email = v.email);

INSERT INTO UserRoles (user_id, role_id)
SELECT u.user_id, r.role_id 
FROM Users u, Roles r
WHERE u.email IN ('marcus.vance@example.test', 'elena.rostova@example.test', 'liam.oconnor@example.test', 'sophia.chen@example.test', 'david.kovacs@example.test', 'amara.diallo@example.test')
  AND r.name = 'Customer'
  AND NOT EXISTS (SELECT 1 FROM UserRoles ur WHERE ur.user_id = u.user_id AND ur.role_id = r.role_id);
GO

-- ADDRESSES FOR NEW CUSTOMERS
INSERT INTO Addresses (user_id, type, title, first_name, last_name, phone, street, city, state, postal_code, country, is_default)
SELECT u.user_id, 'Shipping', N'Home', u.first_name, u.last_name, u.phone, v.street, v.city, v.state, v.postal_code, N'USA', 1
FROM Users u
JOIN (VALUES
    ('marcus.vance@example.test',   N'88 Market St',     N'San Francisco', N'CA', '94105'),
    ('elena.rostova@example.test', N'500 5th Ave',      N'New York',      N'NY', '10110'),
    ('liam.oconnor@example.test',  N'120 Boylston St',  N'Boston',        N'MA', '02116'),
    ('sophia.chen@example.test',   N'400 University Ave',N'Palo Alto',    N'CA', '94301'),
    ('david.kovacs@example.test',  N'900 Ocean Dr',     N'Miami',         N'FL', '33139'),
    ('amara.diallo@example.test',  N'1600 Pennsylvania',N'Washington',    N'DC', '20006')
) AS v(email, street, city, state, postal_code) ON u.email = v.email
WHERE NOT EXISTS (SELECT 1 FROM Addresses a WHERE a.user_id = u.user_id);
GO

-- 5. HISTORICAL ORDERS ACROSS 60 DAYS FOR REVENUE & DASHBOARD CHARTS
INSERT INTO Orders (order_number, user_id, shipping_address_id, subtotal, shipping_fee, tax_amount, discount_amount, total_amount, coupon_id, order_status, payment_status, payment_method, created_at, updated_at)
SELECT v.order_num, u.user_id, a.address_id, v.subtotal, 0.00, 0.00, v.discount, v.subtotal - v.discount, NULL, v.order_status, v.payment_status, v.payment_method, DATEADD(day, -v.days_ago, GETDATE()), GETDATE()
FROM (VALUES
    ('ORD-HIST-001', 'marcus.vance@example.test',   2499.00, 0.00, 'Delivered', 'Paid',    'Credit Card', 42),
    ('ORD-HIST-002', 'elena.rostova@example.test',  429.00,  20.00, 'Shipped',   'Paid',    'PayPal',      35),
    ('ORD-HIST-003', 'liam.oconnor@example.test',   1899.00, 50.00, 'Delivered', 'Paid',    'Credit Card', 26),
    ('ORD-HIST-004', 'sophia.chen@example.test',    159.00,  0.00,  'Processing','Paid',    'Apple Pay',   14),
    ('ORD-HIST-005', 'david.kovacs@example.test',   399.00,  0.00,  'Pending',   'Pending', 'Credit Card', 7),
    ('ORD-HIST-006', 'amara.diallo@example.test',   190.00,  0.00,  'Delivered', 'Paid',    'Credit Card', 3),
    ('ORD-HIST-007', 'john.doe@example.test',       429.00,  0.00,  'Processing','Paid',    'Credit Card', 1)
) AS v(order_num, email, subtotal, discount, order_status, payment_status, payment_method, days_ago)
JOIN Users u ON u.email = v.email
JOIN Addresses a ON a.user_id = u.user_id
WHERE NOT EXISTS (SELECT 1 FROM Orders WHERE order_number = v.order_num);
GO

-- ORDER ITEMS FOR HISTORICAL ORDERS
INSERT INTO OrderItems (order_id, product_id, product_name, sku, quantity, unit_price, total_price)
SELECT o.order_id, p.product_id, p.name, p.sku, v.quantity, p.price, p.price * v.quantity
FROM Orders o
JOIN (VALUES
    ('ORD-HIST-001', 'SKU-DELL-XPS16',   1),
    ('ORD-HIST-002', 'SKU-BOSE-QCULTRA', 1),
    ('ORD-HIST-003', 'SKU-ASUS-G14',     1),
    ('ORD-HIST-004', 'SKU-LOGI-GPRO2',   1),
    ('ORD-HIST-005', 'SKU-SAMS-GW6C',    1),
    ('ORD-HIST-006', 'SKU-ADID-UBLIGHT', 1),
    ('ORD-HIST-007', 'SKU-BOSE-QCULTRA', 1)
) AS v(order_num, sku, quantity) ON o.order_number = v.order_num
JOIN Products p ON p.sku = v.sku
WHERE NOT EXISTS (SELECT 1 FROM OrderItems oi WHERE oi.order_id = o.order_id AND oi.product_id = p.product_id);
GO

-- TRANSACTIONS FOR HISTORICAL ORDERS
INSERT INTO Transactions (order_id, gateway_transaction_id, amount, payment_method, status, created_at)
SELECT o.order_id, 'TXN_' + o.order_number, o.total_amount, o.payment_method, 'Success', o.created_at
FROM Orders o
WHERE o.payment_status = 'Paid'
  AND NOT EXISTS (SELECT 1 FROM Transactions t WHERE t.order_id = o.order_id);
GO

-- 6. SUPPORT TICKETS FOR ADMIN SUPPORT DASHBOARD
IF OBJECT_ID('dbo.SupportTickets', 'U') IS NOT NULL
BEGIN
    INSERT INTO SupportTickets (user_id, subject, category, priority, status, created_at, updated_at)
    SELECT u.user_id, v.subject, v.category, v.priority, v.status, DATEADD(day, -v.days_ago, GETDATE()), GETDATE()
    FROM (VALUES
        ('marcus.vance@example.test',   N'Tracking inquiry for XPS 16', 'Shipping',  'Medium', 'Open',        12),
        ('elena.rostova@example.test',  N'Defective ear cushions',      'Product',   'High',   'In Progress', 8),
        ('liam.oconnor@example.test',   N'Invoice request for ROG G14', 'Billing',   'Low',    'Resolved',    18)
    ) AS v(email, subject, category, priority, status, days_ago)
    JOIN Users u ON u.email = v.email
    WHERE NOT EXISTS (SELECT 1 FROM SupportTickets WHERE user_id = u.user_id AND subject = v.subject);
END;
GO

-- 7. RETURN REQUESTS FOR ADMIN RETURNS DASHBOARD
IF OBJECT_ID('dbo.ReturnRequests', 'U') IS NOT NULL
BEGIN
    INSERT INTO ReturnRequests (user_id, order_id, order_item_id, reason, status, refund_amount, created_at, updated_at)
    SELECT o.user_id, o.order_id, oi.order_item_id, v.reason, v.status, o.total_amount, DATEADD(day, -v.days_ago, GETDATE()), GETDATE()
    FROM Orders o
    JOIN OrderItems oi ON oi.order_id = o.order_id
    JOIN (VALUES
        ('DEMO-ORD-0002', N'Wrong color ordered', 'Approved', 4),
        ('ORD-HIST-006', N'Size too small',       'Requested', 1)
    ) AS v(order_num, reason, status, days_ago) ON o.order_number = v.order_num
    WHERE NOT EXISTS (SELECT 1 FROM ReturnRequests WHERE order_id = o.order_id);
END;
GO

PRINT 'Rich Extended Demo Data successfully applied!';
GO
