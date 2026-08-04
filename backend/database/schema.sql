-- =======================================================================================
-- NexoraHub Enterprise E-Commerce — Master Schema
-- Target Database Engine: Microsoft SQL Server (MSSQL)
--
-- This is the SINGLE authoritative schema file. It creates the database,
-- every table (admin catalogue/orders, customer account features, product
-- variants) and every security-hardening constraint/index in one idempotent
-- pass, in dependency order.
--
-- Idempotency contract:
--   - Every CREATE TABLE is guarded with IF OBJECT_ID(...) IS NULL.
--   - Every ALTER TABLE ... ADD <column> is guarded with a sys.columns check.
--   - Every CREATE INDEX is guarded with a sys.indexes check.
--   - Running this file against an empty database, a partially-migrated
--     database (from an older split-file version of this project), or an
--     already-fully-migrated database all produce the same end state with
--     zero errors and zero data loss.
--
-- This file is executed automatically on every application boot by
-- backend/src/database/initDb.ts, so cloning this repository onto a new
-- machine and running `npm run dev` / `npm start` is sufic to get a fully
-- working schema — no manual migration steps, no missing tables.
-- =======================================================================================

-- Create Database
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'NexoraHub_DB')
BEGIN
    CREATE DATABASE NexoraHub_DB;
END
GO

USE NexoraHub_DB;
GO

-- =======================================================================================
-- 1. Administration & Security
-- =======================================================================================

-- Roles
IF OBJECT_ID('dbo.Roles', 'U') IS NULL
BEGIN
    CREATE TABLE Roles (
        role_id INT IDENTITY(1,1) PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        description NVARCHAR(255) NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
END;
GO

-- Permissions
IF OBJECT_ID('dbo.Permissions', 'U') IS NULL
BEGIN
    CREATE TABLE Permissions (
        permission_id INT IDENTITY(1,1) PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'manage_products', 'view_orders'
        description NVARCHAR(255) NULL
    );
END;
GO

-- RolePermissions
IF OBJECT_ID('dbo.RolePermissions', 'U') IS NULL
BEGIN
    CREATE TABLE RolePermissions (
        role_id INT NOT NULL,
        permission_id INT NOT NULL,
        PRIMARY KEY (role_id, permission_id),
        CONSTRAINT FK_RolePermissions_Role FOREIGN KEY (role_id) REFERENCES Roles(role_id) ON DELETE CASCADE,
        CONSTRAINT FK_RolePermissions_Permission FOREIGN KEY (permission_id) REFERENCES Permissions(permission_id) ON DELETE CASCADE
    );
END;
GO

-- Users (Admins, Staff, Customers) — includes every customer-module column
-- directly, so a fresh install never needs the ALTER-based bolt-ons below.
IF OBJECT_ID('dbo.Users', 'U') IS NULL
BEGIN
    CREATE TABLE Users (
        user_id INT IDENTITY(1,1) PRIMARY KEY,
        first_name NVARCHAR(100) NOT NULL,
        last_name NVARCHAR(100) NOT NULL,
        email NVARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Banned')),
        avatar_url NVARCHAR(500) NULL,
        date_of_birth DATE NULL,
        gender VARCHAR(10) NULL,
        is_email_verified BIT NOT NULL DEFAULT 0,
        locked_until DATETIME NULL,
        last_login DATETIME NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
END;
GO

-- Upgrade path: a database created by an older version of this project may be
-- missing one of the columns above. These no-op once the column exists.
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'avatar_url')
    ALTER TABLE Users ADD avatar_url NVARCHAR(500) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'date_of_birth')
    ALTER TABLE Users ADD date_of_birth DATE NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'gender')
    ALTER TABLE Users ADD gender VARCHAR(10) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'is_email_verified')
    ALTER TABLE Users ADD is_email_verified BIT NOT NULL DEFAULT 0;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'locked_until')
    ALTER TABLE Users ADD locked_until DATETIME NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'last_login')
    ALTER TABLE Users ADD last_login DATETIME NULL;
GO

-- UserRoles
IF OBJECT_ID('dbo.UserRoles', 'U') IS NULL
BEGIN
    CREATE TABLE UserRoles (
        user_id INT NOT NULL,
        role_id INT NOT NULL,
        PRIMARY KEY (user_id, role_id),
        CONSTRAINT FK_UserRoles_User FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
        CONSTRAINT FK_UserRoles_Role FOREIGN KEY (role_id) REFERENCES Roles(role_id) ON DELETE CASCADE
    );
END;
GO

-- =======================================================================================
-- 2. Customer Profile
-- =======================================================================================

-- Addresses
IF OBJECT_ID('dbo.Addresses', 'U') IS NULL
BEGIN
    CREATE TABLE Addresses (
        address_id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        type VARCHAR(20) NOT NULL DEFAULT 'Shipping' CHECK (type IN ('Shipping', 'Billing')),
        title NVARCHAR(50) NULL,
        first_name NVARCHAR(100) NOT NULL,
        last_name NVARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        street NVARCHAR(255) NOT NULL,
        city NVARCHAR(100) NOT NULL,
        state NVARCHAR(100) NOT NULL,
        postal_code VARCHAR(20) NOT NULL,
        country NVARCHAR(100) NOT NULL,
        is_default BIT DEFAULT 0,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Addresses_Users FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
    );
END;
GO

-- =======================================================================================
-- 3. Catalog & Products
-- =======================================================================================

-- Brands
IF OBJECT_ID('dbo.Brands', 'U') IS NULL
BEGIN
    CREATE TABLE Brands (
        brand_id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL UNIQUE,
        slug VARCHAR(100) NOT NULL UNIQUE,
        description NVARCHAR(MAX) NULL,
        logo_url NVARCHAR(1000) NULL,
        website_url NVARCHAR(1000) NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
        is_featured BIT DEFAULT 0,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
END;
GO

-- Categories
IF OBJECT_ID('dbo.Categories', 'U') IS NULL
BEGIN
    CREATE TABLE Categories (
        category_id INT IDENTITY(1,1) PRIMARY KEY,
        parent_id INT NULL,
        name NVARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        description NVARCHAR(500) NULL,
        image_url NVARCHAR(1000) NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Categories_Parent FOREIGN KEY (parent_id) REFERENCES Categories(category_id) ON DELETE NO ACTION
    );
END;
GO

-- Products
IF OBJECT_ID('dbo.Products', 'U') IS NULL
BEGIN
    CREATE TABLE Products (
        product_id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        description NVARCHAR(MAX) NULL,
        short_description NVARCHAR(500) NULL,
        brand_id INT NULL,
        category_id INT NOT NULL,
        price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
        sale_price DECIMAL(10,2) NULL CHECK (sale_price >= 0),
        sku VARCHAR(100) NOT NULL UNIQUE,
        barcode VARCHAR(100) NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Draft', 'Archived')),
        is_featured BIT DEFAULT 0,
        meta_title NVARCHAR(255) NULL,
        meta_description NVARCHAR(500) NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Products_Brands FOREIGN KEY (brand_id) REFERENCES Brands(brand_id) ON DELETE SET NULL,
        CONSTRAINT FK_Products_Categories FOREIGN KEY (category_id) REFERENCES Categories(category_id) ON DELETE NO ACTION
    );
END;
GO

-- Product Images
IF OBJECT_ID('dbo.ProductImages', 'U') IS NULL
BEGIN
    CREATE TABLE ProductImages (
        image_id INT IDENTITY(1,1) PRIMARY KEY,
        product_id INT NOT NULL,
        image_url NVARCHAR(1000) NOT NULL,
        is_primary BIT DEFAULT 0,
        sort_order INT DEFAULT 0,
        created_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_ProductImages_Products FOREIGN KEY (product_id) REFERENCES Products(product_id) ON DELETE CASCADE
    );
END;
GO

-- =======================================================================================
-- 3b. Dynamic Product Variants (Color/Size/Storage combinations)
-- =======================================================================================

-- VariantGroups — attribute category names (e.g., "Color", "Size", "Storage").
-- Each group belongs to one product.
IF OBJECT_ID('dbo.VariantGroups', 'U') IS NULL
BEGIN
    CREATE TABLE VariantGroups (
        group_id      INT IDENTITY(1,1) PRIMARY KEY,
        product_id    INT NOT NULL,
        name          NVARCHAR(100) NOT NULL,
        display_order INT NOT NULL DEFAULT 0,
        created_at    DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_VariantGroups_Products
            FOREIGN KEY (product_id) REFERENCES Products(product_id) ON DELETE CASCADE,
        CONSTRAINT UQ_VariantGroups_ProductName
            UNIQUE (product_id, name)
    );
END;
GO

-- VariantOptions — individual values for a group (e.g., "Red", "Blue", "128GB").
IF OBJECT_ID('dbo.VariantOptions', 'U') IS NULL
BEGIN
    CREATE TABLE VariantOptions (
        option_id     INT IDENTITY(1,1) PRIMARY KEY,
        group_id      INT NOT NULL,
        value         NVARCHAR(200) NOT NULL,
        display_order INT NOT NULL DEFAULT 0,
        created_at    DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_VariantOptions_Groups
            FOREIGN KEY (group_id) REFERENCES VariantGroups(group_id) ON DELETE CASCADE,
        CONSTRAINT UQ_VariantOptions_GroupValue
            UNIQUE (group_id, value)
    );
END;
GO

-- ProductVariants — each unique combination (e.g., Red + XL), with its own
-- SKU/price/stock. price/sale_price NULL means inherit from the base product.
IF OBJECT_ID('dbo.ProductVariants', 'U') IS NULL
BEGIN
    CREATE TABLE ProductVariants (
        variant_id         INT IDENTITY(1,1) PRIMARY KEY,
        product_id         INT NOT NULL,
        sku                VARCHAR(150) NOT NULL UNIQUE,
        price              DECIMAL(10,2) NULL,
        sale_price         DECIMAL(10,2) NULL,
        stock              INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
        barcode            VARCHAR(150) NULL,
        weight_grams       INT NULL,
        is_active          BIT NOT NULL DEFAULT 1,
        created_at         DATETIME DEFAULT GETDATE(),
        updated_at         DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_ProductVariants_Products
            FOREIGN KEY (product_id) REFERENCES Products(product_id) ON DELETE CASCADE
    );
END;
GO

CREATE OR ALTER TRIGGER TR_ProductVariants_Update
ON ProductVariants AFTER UPDATE
AS BEGIN
    SET NOCOUNT ON;
    UPDATE ProductVariants
    SET updated_at = GETDATE()
    FROM ProductVariants
    JOIN inserted ON ProductVariants.variant_id = inserted.variant_id;
END;
GO

-- ProductVariantOptionMap — junction: maps each variant to its options
-- (e.g., variant_id=5 maps to option_id=2 "Red" AND option_id=8 "XL").
IF OBJECT_ID('dbo.ProductVariantOptionMap', 'U') IS NULL
BEGIN
    CREATE TABLE ProductVariantOptionMap (
        variant_id INT NOT NULL,
        option_id  INT NOT NULL,
        PRIMARY KEY (variant_id, option_id),
        CONSTRAINT FK_VOM_Variants
            FOREIGN KEY (variant_id) REFERENCES ProductVariants(variant_id) ON DELETE CASCADE,
        CONSTRAINT FK_VOM_Options
            FOREIGN KEY (option_id)  REFERENCES VariantOptions(option_id)
    );
END;
GO

-- ProductVariantImages — optional per-variant image, overrides the main
-- product image when a specific variant is selected.
IF OBJECT_ID('dbo.ProductVariantImages', 'U') IS NULL
BEGIN
    CREATE TABLE ProductVariantImages (
        variant_image_id INT IDENTITY(1,1) PRIMARY KEY,
        variant_id       INT NOT NULL,
        image_url        NVARCHAR(1000) NOT NULL,
        created_at       DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_PVI_Variants
            FOREIGN KEY (variant_id) REFERENCES ProductVariants(variant_id) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ProductVariants_ProductId' AND object_id = OBJECT_ID('dbo.ProductVariants'))
    CREATE INDEX IX_ProductVariants_ProductId ON ProductVariants(product_id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_VariantGroups_ProductId' AND object_id = OBJECT_ID('dbo.VariantGroups'))
    CREATE INDEX IX_VariantGroups_ProductId ON VariantGroups(product_id);
GO

-- =======================================================================================
-- 4. Inventory Management
-- =======================================================================================

-- Inventory
IF OBJECT_ID('dbo.Inventory', 'U') IS NULL
BEGIN
    CREATE TABLE Inventory (
        inventory_id INT IDENTITY(1,1) PRIMARY KEY,
        product_id INT NOT NULL UNIQUE,
        quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
        reserved_quantity INT NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
        low_stock_threshold INT NOT NULL DEFAULT 10,
        status VARCHAR(20) NOT NULL DEFAULT 'In Stock' CHECK (status IN ('In Stock', 'Out of Stock', 'Low Stock')),
        updated_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Inventory_Products FOREIGN KEY (product_id) REFERENCES Products(product_id) ON DELETE CASCADE
    );
END;
GO

-- Inventory History (Movement Log)
IF OBJECT_ID('dbo.InventoryHistory', 'U') IS NULL
BEGIN
    CREATE TABLE InventoryHistory (
        history_id INT IDENTITY(1,1) PRIMARY KEY,
        product_id INT NOT NULL,
        user_id INT NULL, -- The staff who adjusted stock
        adjustment INT NOT NULL, -- positive or negative
        reason VARCHAR(100) NOT NULL, -- e.g., 'Restock', 'Damage', 'Order Shipped', 'Manual Adjustment'
        remarks NVARCHAR(MAX) NULL,
        created_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_InventoryHistory_Products FOREIGN KEY (product_id) REFERENCES Products(product_id) ON DELETE CASCADE,
        CONSTRAINT FK_InventoryHistory_Users FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE SET NULL
    );
END;
GO

-- Safety net: every product must have an Inventory row. Checkout INNER JOINs
-- Inventory, so a product with none would otherwise be silently unpurchasable
-- (or, before this project's security hardening, an inventory bypass — a
-- product with no row must never be treated as infinite stock).
INSERT INTO Inventory (product_id, quantity, reserved_quantity, low_stock_threshold, status, updated_at)
SELECT p.product_id, 0, 0, 10, 'Out of Stock', GETDATE()
FROM Products p
WHERE NOT EXISTS (SELECT 1 FROM Inventory i WHERE i.product_id = p.product_id);
GO

-- =======================================================================================
-- 5. Sales & Orders
-- =======================================================================================

-- Coupons
IF OBJECT_ID('dbo.Coupons', 'U') IS NULL
BEGIN
    CREATE TABLE Coupons (
        coupon_id INT IDENTITY(1,1) PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        description NVARCHAR(255) NULL,
        discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('Percentage', 'Fixed', 'Free Shipping')),
        discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
        min_order_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
        max_discount_amount DECIMAL(10,2) NULL,
        usage_limit INT NULL,
        used_count INT DEFAULT 0,
        start_date DATETIME NULL,
        expiry_date DATETIME NOT NULL,
        is_active BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
END;
GO

-- Orders — includes every customer-module column directly (notes,
-- idempotency_key, tracking_number, delivered_at) so a fresh install never
-- needs the ALTER-based bolt-ons below.
IF OBJECT_ID('dbo.Orders', 'U') IS NULL
BEGIN
    CREATE TABLE Orders (
        order_id INT IDENTITY(1,1) PRIMARY KEY,
        order_number VARCHAR(50) NOT NULL UNIQUE,
        user_id INT NOT NULL,
        shipping_address_id INT NULL,
        billing_address_id INT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        shipping_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
        tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        total_amount DECIMAL(10,2) NOT NULL,
        coupon_id INT NULL,
        order_status VARCHAR(30) NOT NULL DEFAULT 'Pending' CHECK (order_status IN ('Pending', 'Confirmed', 'Processing', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned', 'Refunded')),
        payment_status VARCHAR(30) NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid', 'Failed', 'Refunded')),
        payment_method VARCHAR(50) NULL,
        tracking_number VARCHAR(100) NULL,
        notes NVARCHAR(MAX) NULL,
        idempotency_key VARCHAR(100) NULL,
        delivered_at DATETIME NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Orders_Users FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE NO ACTION,
        CONSTRAINT FK_Orders_Coupons FOREIGN KEY (coupon_id) REFERENCES Coupons(coupon_id) ON DELETE SET NULL,
        CONSTRAINT FK_Orders_ShippingAddress FOREIGN KEY (shipping_address_id) REFERENCES Addresses(address_id) ON DELETE NO ACTION,
        CONSTRAINT FK_Orders_BillingAddress FOREIGN KEY (billing_address_id) REFERENCES Addresses(address_id) ON DELETE NO ACTION
    );
END;
GO

-- Upgrade path for a database created by an older version of this project.
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Orders') AND name = 'notes')
    ALTER TABLE Orders ADD notes NVARCHAR(MAX) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Orders') AND name = 'idempotency_key')
    ALTER TABLE Orders ADD idempotency_key VARCHAR(100) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Orders') AND name = 'tracking_number')
    ALTER TABLE Orders ADD tracking_number VARCHAR(100) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Orders') AND name = 'delivered_at')
    ALTER TABLE Orders ADD delivered_at DATETIME NULL;
GO

-- Backfill delivered_at from status history for orders already Delivered
-- under an older schema that lacked the column.
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Orders') AND name = 'delivered_at')
   AND OBJECT_ID('dbo.OrderStatusHistory', 'U') IS NOT NULL
BEGIN
    UPDATE O
    SET delivered_at = H.changed_at
    FROM Orders O
    CROSS APPLY (
        SELECT TOP 1 changed_at
        FROM OrderStatusHistory
        WHERE order_id = O.order_id AND status = 'Delivered'
        ORDER BY changed_at ASC
    ) H
    WHERE O.delivered_at IS NULL AND O.order_status = 'Delivered';
END;
GO

-- Per-request idempotency: a filtered unique index means a duplicate
-- x-idempotency-key can never create two orders, even under concurrent
-- retries. NULL keys (the common case) are excluded from uniqueness.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_Orders_IdempotencyKey')
BEGIN
    -- Null out any duplicate keys left by data created before this
    -- constraint existed, so the index can be created without failing.
    ;WITH Ranked AS (
        SELECT order_id,
               ROW_NUMBER() OVER (PARTITION BY idempotency_key ORDER BY order_id) AS rn
        FROM Orders
        WHERE idempotency_key IS NOT NULL
    )
    UPDATE O SET idempotency_key = NULL
    FROM Orders O INNER JOIN Ranked R ON O.order_id = R.order_id
    WHERE R.rn > 1;

    CREATE UNIQUE INDEX UQ_Orders_IdempotencyKey
        ON Orders(idempotency_key)
        WHERE idempotency_key IS NOT NULL;
END;
GO

-- Order Items — includes the variant_id/variant_label columns directly.
IF OBJECT_ID('dbo.OrderItems', 'U') IS NULL
BEGIN
    CREATE TABLE OrderItems (
        order_item_id INT IDENTITY(1,1) PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        variant_id INT NULL,
        product_name NVARCHAR(255) NOT NULL, -- snapshot at time of purchase
        sku VARCHAR(100) NOT NULL,
        variant_label NVARCHAR(500) NULL,     -- snapshot e.g. "Color: Red | Size: XL"
        quantity INT NOT NULL CHECK (quantity > 0),
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        CONSTRAINT FK_OrderItems_Orders FOREIGN KEY (order_id) REFERENCES Orders(order_id) ON DELETE CASCADE,
        CONSTRAINT FK_OrderItems_Products FOREIGN KEY (product_id) REFERENCES Products(product_id) ON DELETE NO ACTION,
        CONSTRAINT FK_OrderItems_Variants FOREIGN KEY (variant_id) REFERENCES ProductVariants(variant_id) ON DELETE NO ACTION
    );
END;
GO

-- Upgrade path for a database created before variants existed.
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('OrderItems') AND name = 'variant_id')
BEGIN
    ALTER TABLE OrderItems ADD variant_id INT NULL, variant_label NVARCHAR(500) NULL;
    ALTER TABLE OrderItems ADD CONSTRAINT FK_OrderItems_Variants
        FOREIGN KEY (variant_id) REFERENCES ProductVariants(variant_id) ON DELETE NO ACTION;
END;
GO

-- Payments & Transactions
IF OBJECT_ID('dbo.Transactions', 'U') IS NULL
BEGIN
    CREATE TABLE Transactions (
        transaction_id INT IDENTITY(1,1) PRIMARY KEY,
        order_id INT NOT NULL,
        gateway_transaction_id VARCHAR(100) NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        status VARCHAR(30) NOT NULL CHECK (status IN ('Pending', 'Success', 'Failed', 'Refunded')),
        response_json NVARCHAR(MAX) NULL,
        created_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Transactions_Orders FOREIGN KEY (order_id) REFERENCES Orders(order_id) ON DELETE CASCADE
    );
END;
GO

-- =======================================================================================
-- 6. Engagement & Content
-- =======================================================================================

-- Reviews — includes every customer-module column directly (body,
-- helpful_votes, is_verified_purchase). `comment` (legacy admin-authored
-- field) and `body` (customer-authored field) both exist; application code
-- reads whichever it owns.
IF OBJECT_ID('dbo.Reviews', 'U') IS NULL
BEGIN
    CREATE TABLE Reviews (
        review_id INT IDENTITY(1,1) PRIMARY KEY,
        product_id INT NOT NULL,
        user_id INT NOT NULL,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        title NVARCHAR(255) NULL,
        comment NVARCHAR(MAX) NULL,
        body NVARCHAR(MAX) NULL,
        helpful_votes INT NOT NULL DEFAULT 0,
        is_verified_purchase BIT NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Reviews_Products FOREIGN KEY (product_id) REFERENCES Products(product_id) ON DELETE CASCADE,
        CONSTRAINT FK_Reviews_Users FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE NO ACTION
    );
END;
GO

-- Upgrade path for a database created before the customer review module.
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Reviews') AND name = 'body')
    ALTER TABLE Reviews ADD body NVARCHAR(MAX) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Reviews') AND name = 'helpful_votes')
    ALTER TABLE Reviews ADD helpful_votes INT NOT NULL DEFAULT 0;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Reviews') AND name = 'is_verified_purchase')
    ALTER TABLE Reviews ADD is_verified_purchase BIT NOT NULL DEFAULT 0;
GO

-- Audit Logs — single definition shared by the admin AuditService and the
-- customer AuditService (both write the same column set).
IF OBJECT_ID('dbo.AuditLogs', 'U') IS NULL
BEGIN
    CREATE TABLE AuditLogs (
        audit_id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NULL,
        action VARCHAR(100) NOT NULL,
        module VARCHAR(100) NOT NULL,
        record_id INT NULL,
        old_values NVARCHAR(MAX) NULL,
        new_values NVARCHAR(MAX) NULL,
        ip_address VARCHAR(45) NULL,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_AuditLogs_Users FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE SET NULL
    );
    CREATE INDEX IX_AuditLogs_Module ON AuditLogs(module, created_at);
END;
GO

-- =======================================================================================
-- 7. Customer Account & Session Management
-- =======================================================================================

-- Customer Sessions — backs refresh-token rotation and live session
-- revocation (logout / logout-all / password reset / account deactivation
-- all take effect immediately via this table).
IF OBJECT_ID('dbo.CustomerSessions', 'U') IS NULL
BEGIN
    CREATE TABLE CustomerSessions (
        session_id VARCHAR(100) PRIMARY KEY,
        user_id INT NOT NULL FOREIGN KEY REFERENCES Users(user_id) ON DELETE CASCADE,
        refresh_token_hash VARCHAR(255) NOT NULL,
        device_name NVARCHAR(100) NULL,
        device_type NVARCHAR(50) NULL,
        ip_address VARCHAR(45) NULL,
        user_agent NVARCHAR(500) NULL,
        is_active BIT NOT NULL DEFAULT 1,
        expires_at DATETIME NOT NULL,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        last_used_at DATETIME NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_CustomerSessions_UserId ON CustomerSessions(user_id);
    CREATE INDEX IX_CustomerSessions_TokenHash ON CustomerSessions(refresh_token_hash);
END;
GO

-- Fast lookup for the per-request session-revocation check.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CustomerSessions_Active')
    CREATE INDEX IX_CustomerSessions_Active ON CustomerSessions(session_id, is_active, expires_at);
GO

-- Password Reset Tokens — includes the OTP-guess attempt counter directly.
IF OBJECT_ID('dbo.PasswordResetTokens', 'U') IS NULL
BEGIN
    CREATE TABLE PasswordResetTokens (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL FOREIGN KEY REFERENCES Users(user_id) ON DELETE CASCADE,
        otp_hash VARCHAR(255) NOT NULL,
        token_hash VARCHAR(255) NULL,
        attempts INT NOT NULL DEFAULT 0,
        expires_at DATETIME NOT NULL,
        used BIT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_PasswordResetTokens_UserId ON PasswordResetTokens(user_id);
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('PasswordResetTokens') AND name = 'attempts')
    ALTER TABLE PasswordResetTokens ADD attempts INT NOT NULL DEFAULT 0;
GO

-- Email Verifications — includes the OTP-guess attempt counter directly.
IF OBJECT_ID('dbo.EmailVerifications', 'U') IS NULL
BEGIN
    CREATE TABLE EmailVerifications (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL FOREIGN KEY REFERENCES Users(user_id) ON DELETE CASCADE,
        otp_hash VARCHAR(255) NOT NULL,
        attempts INT NOT NULL DEFAULT 0,
        expires_at DATETIME NOT NULL,
        verified BIT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_EmailVerifications_UserId ON EmailVerifications(user_id);
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('EmailVerifications') AND name = 'attempts')
    ALTER TABLE EmailVerifications ADD attempts INT NOT NULL DEFAULT 0;
GO

-- Login History — every login attempt, admin and customer, success or not.
-- Backs account lockout and brute-force detection.
IF OBJECT_ID('dbo.LoginHistory', 'U') IS NULL
BEGIN
    CREATE TABLE LoginHistory (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL FOREIGN KEY REFERENCES Users(user_id) ON DELETE CASCADE,
        ip_address VARCHAR(45) NULL,
        user_agent NVARCHAR(500) NULL,
        success BIT NOT NULL,
        attempted_at DATETIME NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_LoginHistory_UserId ON LoginHistory(user_id, attempted_at);
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_LoginHistory_User_Attempted')
    CREATE INDEX IX_LoginHistory_User_Attempted ON LoginHistory(user_id, success, attempted_at);
GO

-- Password History — last-N-hash reuse prevention on reset/change.
IF OBJECT_ID('dbo.PasswordHistory', 'U') IS NULL
BEGIN
    CREATE TABLE PasswordHistory (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL FOREIGN KEY REFERENCES Users(user_id) ON DELETE CASCADE,
        password_hash VARCHAR(255) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_PasswordHistory_UserId ON PasswordHistory(user_id);
END;
GO

-- =======================================================================================
-- 8. Loyalty & Wishlist
-- =======================================================================================

-- Reward Points (one row per customer)
IF OBJECT_ID('dbo.RewardPoints', 'U') IS NULL
BEGIN
    CREATE TABLE RewardPoints (
        user_id INT PRIMARY KEY FOREIGN KEY REFERENCES Users(user_id) ON DELETE CASCADE,
        points_balance INT NOT NULL DEFAULT 0,
        lifetime_points INT NOT NULL DEFAULT 0,
        tier VARCHAR(20) NOT NULL DEFAULT 'Bronze',
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME NOT NULL DEFAULT GETDATE()
    );
END;
GO

-- Reward Points History — append-only ledger of every earn/redeem.
IF OBJECT_ID('dbo.RewardPointsHistory', 'U') IS NULL
BEGIN
    CREATE TABLE RewardPointsHistory (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL FOREIGN KEY REFERENCES Users(user_id) ON DELETE CASCADE,
        points INT NOT NULL,
        type VARCHAR(50) NOT NULL,
        description NVARCHAR(255) NULL,
        reference_id INT NULL,
        reference_type VARCHAR(50) NULL,
        created_at DATETIME NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_RewardPointsHistory_UserId ON RewardPointsHistory(user_id);
END;
GO

-- Wishlist & Wishlist Items
IF OBJECT_ID('dbo.Wishlist', 'U') IS NULL
BEGIN
    CREATE TABLE Wishlist (
        wishlist_id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL UNIQUE FOREIGN KEY REFERENCES Users(user_id) ON DELETE CASCADE,
        created_at DATETIME NOT NULL DEFAULT GETDATE()
    );
END;
GO

IF OBJECT_ID('dbo.WishlistItems', 'U') IS NULL
BEGIN
    CREATE TABLE WishlistItems (
        wishlist_item_id INT IDENTITY(1,1) PRIMARY KEY,
        wishlist_id INT NOT NULL FOREIGN KEY REFERENCES Wishlist(wishlist_id) ON DELETE CASCADE,
        product_id INT NOT NULL FOREIGN KEY REFERENCES Products(product_id) ON DELETE CASCADE,
        added_at DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT UQ_Wishlist_Product UNIQUE (wishlist_id, product_id)
    );
END;
GO

-- =======================================================================================
-- 9. Cart
-- =======================================================================================

-- Cart Items — includes variant_id/variant_label directly.
--
-- variant_id's FK uses ON DELETE NO ACTION rather than SET NULL: Products
-- already cascades to CartItems directly (FK_CartItems_Products) AND
-- cascades to ProductVariants, which would then try to SET NULL on this same
-- CartItems row — two cascade paths converging on one row, which SQL Server
-- refuses at CREATE TABLE time ("Could not create constraint or index").
-- NO ACTION avoids the conflict; application code deletes/cleans up cart
-- rows explicitly and does not rely on this FK to cascade.
IF OBJECT_ID('dbo.CartItems', 'U') IS NULL
BEGIN
    CREATE TABLE CartItems (
        cart_item_id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL FOREIGN KEY REFERENCES Users(user_id) ON DELETE CASCADE,
        product_id INT NOT NULL FOREIGN KEY REFERENCES Products(product_id) ON DELETE CASCADE,
        variant_id INT NULL FOREIGN KEY REFERENCES ProductVariants(variant_id) ON DELETE NO ACTION,
        variant_label NVARCHAR(500) NULL,
        quantity INT NOT NULL DEFAULT 1,
        saved_for_later BIT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_CartItems_UserId ON CartItems(user_id, saved_for_later);
END;
GO

-- Upgrade path for a database created before variants existed.
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('CartItems') AND name = 'variant_id')
BEGIN
    ALTER TABLE CartItems ADD variant_id INT NULL, variant_label NVARCHAR(500) NULL;
    ALTER TABLE CartItems ADD CONSTRAINT FK_CartItems_Variants
        FOREIGN KEY (variant_id) REFERENCES ProductVariants(variant_id) ON DELETE NO ACTION;
END;
GO

-- =======================================================================================
-- 10. Order Lifecycle
-- =======================================================================================

-- Order Cancellations
IF OBJECT_ID('dbo.OrderCancellations', 'U') IS NULL
BEGIN
    CREATE TABLE OrderCancellations (
        id INT IDENTITY(1,1) PRIMARY KEY,
        order_id INT NOT NULL FOREIGN KEY REFERENCES Orders(order_id) ON DELETE CASCADE,
        reason NVARCHAR(500) NOT NULL,
        cancelled_at DATETIME NOT NULL DEFAULT GETDATE()
    );
END;
GO

-- Order Status History — append-only audit trail powering customer order
-- tracking. Written by checkout (placed), orders (cancellation/admin update)
-- and payments (verification). Orders.delivered_at is backfilled from this.
IF OBJECT_ID('dbo.OrderStatusHistory', 'U') IS NULL
BEGIN
    CREATE TABLE OrderStatusHistory (
        history_id INT IDENTITY(1,1) PRIMARY KEY,
        order_id INT NOT NULL FOREIGN KEY REFERENCES Orders(order_id) ON DELETE CASCADE,
        status VARCHAR(30) NOT NULL,
        notes NVARCHAR(500) NULL,
        changed_at DATETIME NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_OrderStatusHistory_Order ON OrderStatusHistory(order_id, changed_at);
END;
GO

-- Coupon Redemptions — one row per (coupon, customer). The UNIQUE constraint
-- enforces a per-customer redemption limit at the database level: no amount
-- of request concurrency can let one customer redeem a coupon twice.
IF OBJECT_ID('dbo.CouponRedemptions', 'U') IS NULL
BEGIN
    CREATE TABLE CouponRedemptions (
        redemption_id INT IDENTITY(1,1) PRIMARY KEY,
        coupon_id     INT NOT NULL,
        user_id       INT NOT NULL,
        order_id      INT NOT NULL,
        redeemed_at   DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT UQ_CouponRedemptions_Coupon_User UNIQUE (coupon_id, user_id),
        CONSTRAINT FK_CouponRedemptions_Coupon FOREIGN KEY (coupon_id) REFERENCES Coupons(coupon_id),
        CONSTRAINT FK_CouponRedemptions_User   FOREIGN KEY (user_id)   REFERENCES Users(user_id),
        CONSTRAINT FK_CouponRedemptions_Order  FOREIGN KEY (order_id)  REFERENCES Orders(order_id)
    );
    CREATE INDEX IX_CouponRedemptions_User ON CouponRedemptions(user_id);
END;
GO

-- =======================================================================================
-- 11. Notifications & Personalisation
-- =======================================================================================

IF OBJECT_ID('dbo.Notifications', 'U') IS NULL
BEGIN
    CREATE TABLE Notifications (
        notification_id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL FOREIGN KEY REFERENCES Users(user_id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title NVARCHAR(200) NOT NULL,
        message NVARCHAR(MAX) NOT NULL,
        reference_id INT NULL,
        image_url NVARCHAR(500) NULL,
        action_url NVARCHAR(500) NULL,
        is_read BIT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_Notifications_User ON Notifications(user_id, is_read, created_at);
END;
GO

IF OBJECT_ID('dbo.RecentlyViewed', 'U') IS NULL
BEGIN
    CREATE TABLE RecentlyViewed (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL FOREIGN KEY REFERENCES Users(user_id) ON DELETE CASCADE,
        product_id INT NOT NULL FOREIGN KEY REFERENCES Products(product_id) ON DELETE CASCADE,
        viewed_at DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT UQ_User_Product_Viewed UNIQUE (user_id, product_id)
    );
    CREATE INDEX IX_RecentlyViewed_User ON RecentlyViewed(user_id, viewed_at);
END;
GO

-- =======================================================================================
-- 12. Returns & Support
-- =======================================================================================

IF OBJECT_ID('dbo.ReturnRequests', 'U') IS NULL
BEGIN
    CREATE TABLE ReturnRequests (
        return_id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL FOREIGN KEY REFERENCES Users(user_id),
        order_id INT NOT NULL FOREIGN KEY REFERENCES Orders(order_id),
        order_item_id INT NOT NULL FOREIGN KEY REFERENCES OrderItems(order_item_id),
        reason NVARCHAR(200) NOT NULL,
        description NVARCHAR(MAX) NULL,
        refund_amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'Requested',
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_ReturnRequests_User ON ReturnRequests(user_id);
END;
GO

IF OBJECT_ID('dbo.SupportTickets', 'U') IS NULL
BEGIN
    CREATE TABLE SupportTickets (
        ticket_id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL FOREIGN KEY REFERENCES Users(user_id),
        order_id INT NULL FOREIGN KEY REFERENCES Orders(order_id),
        subject NVARCHAR(200) NOT NULL,
        category VARCHAR(50) NOT NULL,
        priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
        status VARCHAR(20) NOT NULL DEFAULT 'Open',
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_SupportTickets_User ON SupportTickets(user_id, status);
END;
GO

IF OBJECT_ID('dbo.SupportMessages', 'U') IS NULL
BEGIN
    CREATE TABLE SupportMessages (
        message_id INT IDENTITY(1,1) PRIMARY KEY,
        ticket_id INT NOT NULL FOREIGN KEY REFERENCES SupportTickets(ticket_id) ON DELETE CASCADE,
        sender_id INT NOT NULL,
        sender_type VARCHAR(20) NOT NULL, -- 'Customer' or 'Admin'
        message NVARCHAR(MAX) NOT NULL,
        attachment_url NVARCHAR(500) NULL,
        created_at DATETIME NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_SupportMessages_Ticket ON SupportMessages(ticket_id, created_at);
END;
GO

-- =======================================================================================
-- 13. Referrals & Search
-- =======================================================================================

IF OBJECT_ID('dbo.CustomerReferrals', 'U') IS NULL
BEGIN
    CREATE TABLE CustomerReferrals (
        referrer_id INT PRIMARY KEY FOREIGN KEY REFERENCES Users(user_id) ON DELETE CASCADE,
        referral_code VARCHAR(50) NOT NULL UNIQUE,
        created_at DATETIME NOT NULL DEFAULT GETDATE()
    );
END;
GO

IF OBJECT_ID('dbo.CustomerReferralHistory', 'U') IS NULL
BEGIN
    CREATE TABLE CustomerReferralHistory (
        id INT IDENTITY(1,1) PRIMARY KEY,
        referrer_id INT NOT NULL FOREIGN KEY REFERENCES Users(user_id),
        referred_user_id INT NOT NULL FOREIGN KEY REFERENCES Users(user_id),
        status VARCHAR(20) NOT NULL DEFAULT 'Pending',
        reward_points_earned INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        completed_at DATETIME NULL
    );
    CREATE INDEX IX_CustomerReferralHistory_Referrer ON CustomerReferralHistory(referrer_id);
END;
GO

IF OBJECT_ID('dbo.SearchHistory', 'U') IS NULL
BEGIN
    CREATE TABLE SearchHistory (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL FOREIGN KEY REFERENCES Users(user_id) ON DELETE CASCADE,
        search_term NVARCHAR(255) NOT NULL,
        searched_at DATETIME NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_SearchHistory_User ON SearchHistory(user_id, searched_at);
END;
GO

IF OBJECT_ID('dbo.SearchAnalytics', 'U') IS NULL
BEGIN
    CREATE TABLE SearchAnalytics (
        term NVARCHAR(255) PRIMARY KEY,
        search_count INT NOT NULL DEFAULT 1,
        last_searched DATETIME NOT NULL DEFAULT GETDATE()
    );
END;
GO

-- =======================================================================================
-- 14. Update Triggers — auto-maintain updated_at columns
-- =======================================================================================

CREATE OR ALTER TRIGGER TR_Users_Update ON Users AFTER UPDATE AS BEGIN SET NOCOUNT ON; UPDATE Users SET updated_at = GETDATE() FROM Users JOIN inserted ON Users.user_id = inserted.user_id; END;
GO
CREATE OR ALTER TRIGGER TR_Addresses_Update ON Addresses AFTER UPDATE AS BEGIN SET NOCOUNT ON; UPDATE Addresses SET updated_at = GETDATE() FROM Addresses JOIN inserted ON Addresses.address_id = inserted.address_id; END;
GO
CREATE OR ALTER TRIGGER TR_Brands_Update ON Brands AFTER UPDATE AS BEGIN SET NOCOUNT ON; UPDATE Brands SET updated_at = GETDATE() FROM Brands JOIN inserted ON Brands.brand_id = inserted.brand_id; END;
GO
CREATE OR ALTER TRIGGER TR_Categories_Update ON Categories AFTER UPDATE AS BEGIN SET NOCOUNT ON; UPDATE Categories SET updated_at = GETDATE() FROM Categories JOIN inserted ON Categories.category_id = inserted.category_id; END;
GO
CREATE OR ALTER TRIGGER TR_Products_Update ON Products AFTER UPDATE AS BEGIN SET NOCOUNT ON; UPDATE Products SET updated_at = GETDATE() FROM Products JOIN inserted ON Products.product_id = inserted.product_id; END;
GO
CREATE OR ALTER TRIGGER TR_Inventory_Update ON Inventory AFTER UPDATE AS BEGIN SET NOCOUNT ON; UPDATE Inventory SET updated_at = GETDATE() FROM Inventory JOIN inserted ON Inventory.inventory_id = inserted.inventory_id; END;
GO
CREATE OR ALTER TRIGGER TR_Coupons_Update ON Coupons AFTER UPDATE AS BEGIN SET NOCOUNT ON; UPDATE Coupons SET updated_at = GETDATE() FROM Coupons JOIN inserted ON Coupons.coupon_id = inserted.coupon_id; END;
GO
CREATE OR ALTER TRIGGER TR_Orders_Update ON Orders AFTER UPDATE AS BEGIN SET NOCOUNT ON; UPDATE Orders SET updated_at = GETDATE() FROM Orders JOIN inserted ON Orders.order_id = inserted.order_id; END;
GO
CREATE OR ALTER TRIGGER TR_Reviews_Update ON Reviews AFTER UPDATE AS BEGIN SET NOCOUNT ON; UPDATE Reviews SET updated_at = GETDATE() FROM Reviews JOIN inserted ON Reviews.review_id = inserted.review_id; END;
GO

PRINT 'NexoraHub master schema is up to date.';
GO
