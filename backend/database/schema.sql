-- =======================================================================================
-- NexoraHub Enterprise E-Commerce Schema
-- Target Database Engine: Microsoft SQL Server (MSSQL)
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

-- Users (Admins, Staff, Customers)
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
        last_login DATETIME NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
END;
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

-- Orders
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
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Orders_Users FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE NO ACTION,
        CONSTRAINT FK_Orders_Coupons FOREIGN KEY (coupon_id) REFERENCES Coupons(coupon_id) ON DELETE SET NULL,
        CONSTRAINT FK_Orders_ShippingAddress FOREIGN KEY (shipping_address_id) REFERENCES Addresses(address_id) ON DELETE NO ACTION,
        CONSTRAINT FK_Orders_BillingAddress FOREIGN KEY (billing_address_id) REFERENCES Addresses(address_id) ON DELETE NO ACTION
    );
END;
GO

-- Order Items
IF OBJECT_ID('dbo.OrderItems', 'U') IS NULL
BEGIN
    CREATE TABLE OrderItems (
        order_item_id INT IDENTITY(1,1) PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        product_name NVARCHAR(255) NOT NULL, -- snapshot at time of purchase
        sku VARCHAR(100) NOT NULL,
        quantity INT NOT NULL CHECK (quantity > 0),
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        CONSTRAINT FK_OrderItems_Orders FOREIGN KEY (order_id) REFERENCES Orders(order_id) ON DELETE CASCADE,
        CONSTRAINT FK_OrderItems_Products FOREIGN KEY (product_id) REFERENCES Products(product_id) ON DELETE NO ACTION
    );
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

-- Reviews
IF OBJECT_ID('dbo.Reviews', 'U') IS NULL
BEGIN
    CREATE TABLE Reviews (
        review_id INT IDENTITY(1,1) PRIMARY KEY,
        product_id INT NOT NULL,
        user_id INT NOT NULL,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        title NVARCHAR(255) NULL,
        comment NVARCHAR(MAX) NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Reviews_Products FOREIGN KEY (product_id) REFERENCES Products(product_id) ON DELETE CASCADE,
        CONSTRAINT FK_Reviews_Users FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE NO ACTION
    );
END;
GO

-- Audit Logs (For system transparency)
IF OBJECT_ID('dbo.AuditLogs', 'U') IS NULL
BEGIN
    CREATE TABLE AuditLogs (
        log_id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NULL,
        action VARCHAR(100) NOT NULL,
        module VARCHAR(100) NOT NULL,
        record_id INT NULL,
        old_values NVARCHAR(MAX) NULL,
        new_values NVARCHAR(MAX) NULL,
        ip_address VARCHAR(45) NULL,
        created_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_AuditLogs_Users FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE SET NULL
    );
END;
GO

-- =======================================================================================
-- Update Triggers
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
