-- =======================================================================================
-- NexoraHub — Seed Data
--
-- Runs automatically on every application boot, immediately after schema.sql.
-- Every statement in this file is idempotent and keyed on a natural unique
-- column (role name, product slug/SKU, coupon code) rather than a hardcoded
-- IDENTITY value, so running it on a brand-new database, an already-seeded
-- database, or someone else's machine with different existing data all
-- produce the same safe result: nothing is ever deleted, and nothing is
-- inserted twice.
--
-- This file intentionally seeds NO administrator account. See the note in
-- section 2 below and backend/src/scripts/bootstrapAdmin.ts.
-- =======================================================================================

USE NexoraHub_DB;
GO

-- =======================================================================================
-- 1. Roles — required for registration and authorization to function at all.
-- =======================================================================================
IF NOT EXISTS (SELECT 1 FROM Roles WHERE name = 'Super Admin')
    INSERT INTO Roles (name, description) VALUES ('Super Admin', 'Full system access');

IF NOT EXISTS (SELECT 1 FROM Roles WHERE name = 'Admin')
    INSERT INTO Roles (name, description) VALUES ('Admin', 'Administrative access');

IF NOT EXISTS (SELECT 1 FROM Roles WHERE name = 'Customer')
    INSERT INTO Roles (name, description) VALUES ('Customer', 'Customer access');

IF NOT EXISTS (SELECT 1 FROM Roles WHERE name = 'Support')
    INSERT INTO Roles (name, description) VALUES ('Support', 'Support staff access');

IF NOT EXISTS (SELECT 1 FROM Roles WHERE name = 'Inventory Manager')
    INSERT INTO Roles (name, description) VALUES ('Inventory Manager', 'Manage products, stock and variants');
GO

-- =======================================================================================
-- 2. Administrator Account
--
-- SECURITY: no administrator is seeded here, intentionally.
--
-- This file runs on every application start, so any credential written here
-- is (a) permanent — deleting the account only causes it to be recreated on
-- the next deploy — and (b) public the moment this repository is shared. A
-- default admin with a known password used to be created at this point; it
-- has been removed for good.
--
-- Provision the first administrator once, per machine, out of band:
--     cd backend
--     BOOTSTRAP_ADMIN_EMAIL=you@example.com BOOTSTRAP_ADMIN_PASSWORD="Str0ng-Pass-2026!" npm run bootstrap:admin
--
-- See src/scripts/bootstrapAdmin.ts. Every subsequent staff account is
-- created through POST /api/users, which requires the Super Admin role.
-- =======================================================================================

-- Defensive cleanup: if a previous version of this project (or a copy of the
-- database from before this security fix) already created the old default
-- admin, neutralise it instead of leaving a known credential live.
IF EXISTS (SELECT 1 FROM Users WHERE email = 'admin@ecommerce.com')
BEGIN
    DECLARE @LegacyAdminId INT;
    SELECT @LegacyAdminId = user_id FROM Users WHERE email = 'admin@ecommerce.com';

    -- Disable rather than delete, so foreign-key history (orders, audit logs)
    -- is preserved for forensic review. AuthService.login rejects any status
    -- other than 'Active', so this account can no longer sign in.
    UPDATE Users
    SET status = 'Banned',
        email = CONCAT('disabled+', @LegacyAdminId, '@invalid.local'),
        updated_at = GETDATE()
    WHERE user_id = @LegacyAdminId;

    DELETE FROM UserRoles WHERE user_id = @LegacyAdminId;

    PRINT 'SECURITY: legacy default admin (admin@ecommerce.com) has been disabled and stripped of roles.';
END;
GO

-- =======================================================================================
-- 3. Catalog seed data — Brands, Categories, Products, Inventory, Coupons.
--
-- Every insert is guarded on the table's natural unique key (slug/sku/code),
-- so this section is safe to leave enabled permanently: on a machine that
-- already has this catalog, every block below is a no-op; on a fresh
-- database it populates a working storefront with no manual steps.
--
-- Nothing here ever touches Users, Orders, or any customer data.
-- =======================================================================================

-- --- Brands ---------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM Brands WHERE slug = 'apple')
    INSERT INTO Brands (name, slug, description, status, is_featured)
    VALUES (N'Apple', 'apple', N'Consumer electronics, smartphones, and computing devices.', 'Active', 1);

IF NOT EXISTS (SELECT 1 FROM Brands WHERE slug = 'dell')
    INSERT INTO Brands (name, slug, description, status, is_featured)
    VALUES (N'Dell', 'dell', N'Premium computer workstations, screens, and laptops.', 'Active', 0);

IF NOT EXISTS (SELECT 1 FROM Brands WHERE slug = 'sony')
    INSERT INTO Brands (name, slug, description, status, is_featured)
    VALUES (N'Sony', 'sony', N'Pioneers of high fidelity audio devices and displays.', 'Active', 1);

IF NOT EXISTS (SELECT 1 FROM Brands WHERE slug = 'nike')
    INSERT INTO Brands (name, slug, description, status, is_featured)
    VALUES (N'Nike', 'nike', N'Athletic footwear, activewear, and gear.', 'Active', 1);
GO

-- --- Categories -------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM Categories WHERE slug = 'electronics')
    INSERT INTO Categories (name, slug, description, status)
    VALUES (N'Electronics', 'electronics', N'Smartphones, laptops, accessories, and gadgets.', 'Active');

IF NOT EXISTS (SELECT 1 FROM Categories WHERE slug = 'fashion')
    INSERT INTO Categories (name, slug, description, status)
    VALUES (N'Fashion & Apparel', 'fashion', N'Premium clothing, jackets, activewear, and shoes.', 'Active');

IF NOT EXISTS (SELECT 1 FROM Categories WHERE slug = 'home-kitchen')
    INSERT INTO Categories (name, slug, description, status)
    VALUES (N'Home & Kitchen', 'home-kitchen', N'Appliances, makers, blenders, and interior decorations.', 'Active');

IF NOT EXISTS (SELECT 1 FROM Categories WHERE slug = 'books')
    INSERT INTO Categories (name, slug, description, status)
    VALUES (N'Books & Learning', 'books', N'Technical study materials, textbooks, novels, and guides.', 'Active');
GO

-- --- Products (each looked up by slug so re-running this file is a no-op) --------------
IF NOT EXISTS (SELECT 1 FROM Products WHERE slug = 'iphone-15-pro-max')
    INSERT INTO Products (name, slug, description, brand_id, category_id, price, sku, status, is_featured)
    SELECT N'iPhone 15 Pro Max', 'iphone-15-pro-max',
           N'Apple iPhone with Titanium finish, A17 Pro Chip, and advanced telephoto camera system.',
           b.brand_id, c.category_id, 1199.00, 'SKU-AAPL-IPH15PM', 'Active', 1
    FROM Brands b, Categories c
    WHERE b.slug = 'apple' AND c.slug = 'electronics';

IF NOT EXISTS (SELECT 1 FROM Products WHERE slug = 'dell-xps-15-laptop')
    INSERT INTO Products (name, slug, description, brand_id, category_id, price, sku, status, is_featured)
    SELECT N'Dell XPS 15 Laptop', 'dell-xps-15-laptop',
           N'15-inch high-performance developer laptop with InfinityEdge display and Intel Core i9 processor.',
           b.brand_id, c.category_id, 1899.99, 'SKU-DELL-XPS15D', 'Active', 0
    FROM Brands b, Categories c
    WHERE b.slug = 'dell' AND c.slug = 'electronics';

IF NOT EXISTS (SELECT 1 FROM Products WHERE slug = 'sony-noise-cancelling-headphones')
    INSERT INTO Products (name, slug, description, brand_id, category_id, price, sku, status, is_featured)
    SELECT N'Sony Noise-Cancelling Headphones', 'sony-noise-cancelling-headphones',
           N'Over-ear Bluetooth headphones with market-leading active noise cancellation (WH-1000XM5).',
           b.brand_id, c.category_id, 349.99, 'SKU-SONY-WH1000XM5', 'Active', 1
    FROM Brands b, Categories c
    WHERE b.slug = 'sony' AND c.slug = 'electronics';

IF NOT EXISTS (SELECT 1 FROM Products WHERE slug = 'classic-brown-leather-jacket')
    INSERT INTO Products (name, slug, description, brand_id, category_id, price, sku, status, is_featured)
    SELECT N'Classic Brown Leather Jacket', 'classic-brown-leather-jacket',
           N'Crafted from 100% genuine lambskin leather. Stylish modern slim-fit cut.',
           NULL, c.category_id, 149.50, 'SKU-FSHN-LTHJKT', 'Active', 0
    FROM Categories c
    WHERE c.slug = 'fashion';

IF NOT EXISTS (SELECT 1 FROM Products WHERE slug = 'nike-air-running-shoes')
    INSERT INTO Products (name, slug, description, brand_id, category_id, price, sku, status, is_featured)
    SELECT N'Nike Air Running Shoes', 'nike-air-running-shoes',
           N'Breathable, lightweight mesh construction with responsive foam insoles for premium comfort.',
           b.brand_id, c.category_id, 89.99, 'SKU-NIKE-RUNAIR', 'Active', 1
    FROM Brands b, Categories c
    WHERE b.slug = 'nike' AND c.slug = 'fashion';

IF NOT EXISTS (SELECT 1 FROM Products WHERE slug = 'professional-kitchen-blender')
    INSERT INTO Products (name, slug, description, brand_id, category_id, price, sku, status, is_featured)
    SELECT N'Professional Kitchen Blender', 'professional-kitchen-blender',
           N'Countertop blender with 1200W motor, multi-speed dials, and 64oz BPA-free blending container.',
           NULL, c.category_id, 99.00, 'SKU-HOME-KTBLNDR', 'Active', 0
    FROM Categories c
    WHERE c.slug = 'home-kitchen';
GO

-- --- Inventory (one row per seeded product; keyed by product_id via the SKU lookup) ---
INSERT INTO Inventory (product_id, quantity, reserved_quantity, low_stock_threshold, status, updated_at)
SELECT p.product_id, v.quantity, v.reserved_quantity, v.low_stock_threshold, v.status, GETDATE()
FROM Products p
INNER JOIN (VALUES
    ('SKU-AAPL-IPH15PM',  50, 2,  10, 'In Stock'),
    ('SKU-DELL-XPS15D',    8, 1,   5, 'Low Stock'),
    ('SKU-SONY-WH1000XM5',75, 0,  10, 'In Stock'),
    ('SKU-FSHN-LTHJKT',   45, 0,  10, 'In Stock'),
    ('SKU-NIKE-RUNAIR',    0, 0,  10, 'Out of Stock'),
    ('SKU-HOME-KTBLNDR',  35, 5,   8, 'In Stock')
) AS v(sku, quantity, reserved_quantity, low_stock_threshold, status) ON p.sku = v.sku
WHERE NOT EXISTS (SELECT 1 FROM Inventory i WHERE i.product_id = p.product_id);
GO

-- --- Coupons ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM Coupons WHERE code = 'WELCOME10')
    INSERT INTO Coupons (code, description, discount_type, discount_value, min_order_amount, expiry_date, is_active)
    VALUES ('WELCOME10', N'10% off for new signups', 'Percentage', 10.00, 0.00, DATEADD(year, 2, GETDATE()), 1);

IF NOT EXISTS (SELECT 1 FROM Coupons WHERE code = 'SUMMER50')
    INSERT INTO Coupons (code, description, discount_type, discount_value, min_order_amount, expiry_date, is_active)
    VALUES ('SUMMER50', N'$50 off on purchases above $150', 'Fixed', 50.00, 150.00, DATEADD(year, 2, GETDATE()), 1);
GO

PRINT 'NexoraHub seed data is up to date.';
GO
