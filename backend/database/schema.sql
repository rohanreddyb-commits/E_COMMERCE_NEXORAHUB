-- Create Database
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'E_Commerce_DB')
BEGIN
    CREATE DATABASE E_Commerce_DB;
END
GO

USE E_Commerce_DB;
GO

-- Intermediate E-Commerce Database DDL Schema Script
-- Target Database Engine: Microsoft SQL Server (MSSQL)

-- 1. Create Roles Table
IF OBJECT_ID('dbo.Roles', 'U') IS NULL
BEGIN
    CREATE TABLE Roles (
        role_id INT PRIMARY KEY,
        name VARCHAR(20) NOT NULL UNIQUE
    );
END;
GO

-- 2. Create Users Table
IF OBJECT_ID('dbo.Users', 'U') IS NULL
BEGIN
    CREATE TABLE Users (
        user_id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        email NVARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role_id INT NOT NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Users_Roles FOREIGN KEY (role_id) REFERENCES Roles(role_id)
    );
END;
GO

-- 3. Create Addresses Table
IF OBJECT_ID('dbo.Addresses', 'U') IS NULL
BEGIN
    CREATE TABLE Addresses (
        address_id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        title NVARCHAR(50) NOT NULL,
        street NVARCHAR(255) NOT NULL,
        city NVARCHAR(100) NOT NULL,
        state NVARCHAR(100) NOT NULL,
        postal_code VARCHAR(20) NOT NULL,
        country NVARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Addresses_Users FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
    );
END;
GO

-- 4. Create Categories Table
IF OBJECT_ID('dbo.Categories', 'U') IS NULL
BEGIN
    CREATE TABLE Categories (
        category_id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL UNIQUE,
        description NVARCHAR(500) NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
END;
GO

-- 5. Create Products Table
IF OBJECT_ID('dbo.Products', 'U') IS NULL
BEGIN
    CREATE TABLE Products (
        product_id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX) NULL,
        price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
        sku VARCHAR(100) NOT NULL UNIQUE,
        stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
        category_id INT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Products_Categories FOREIGN KEY (category_id) REFERENCES Categories(category_id)
    );
END;
GO

-- 6. Create ProductImages Table
IF OBJECT_ID('dbo.ProductImages', 'U') IS NULL
BEGIN
    CREATE TABLE ProductImages (
        image_id INT IDENTITY(1,1) PRIMARY KEY,
        product_id INT NOT NULL,
        image_url NVARCHAR(1000) NOT NULL,
        is_primary BIT DEFAULT 0,
        created_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_ProductImages_Products FOREIGN KEY (product_id) REFERENCES Products(product_id) ON DELETE CASCADE
    );
END;
GO

-- 7. Create CartItems Table
IF OBJECT_ID('dbo.CartItems', 'U') IS NULL
BEGIN
    CREATE TABLE CartItems (
        cart_item_id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_CartItems_Users FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
        CONSTRAINT FK_CartItems_Products FOREIGN KEY (product_id) REFERENCES Products(product_id) ON DELETE CASCADE,
        CONSTRAINT UQ_User_Product UNIQUE (user_id, product_id)
    );
END;
GO

-- 8. Create Coupons Table
IF OBJECT_ID('dbo.Coupons', 'U') IS NULL
BEGIN
    CREATE TABLE Coupons (
        coupon_id INT IDENTITY(1,1) PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('Percentage', 'Fixed')),
        discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
        min_order_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
        expiry_date DATETIME NOT NULL,
        is_active BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
END;
GO

-- 9. Create Orders Table
IF OBJECT_ID('dbo.Orders', 'U') IS NULL
BEGIN
    CREATE TABLE Orders (
        order_id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        address_id INT NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        total_amount DECIMAL(10,2) NOT NULL,
        coupon_code VARCHAR(50) NULL,
        order_status VARCHAR(30) NOT NULL DEFAULT 'Pending' CHECK (order_status IN ('Pending', 'Paid', 'Processing', 'Shipped', 'Delivered', 'Cancelled')),
        payment_status VARCHAR(30) NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Success', 'Failed')),
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Orders_Users FOREIGN KEY (user_id) REFERENCES Users(user_id),
        -- CRITICAL CORRECTION: Added ON DELETE NO ACTION to resolve multiple cascade paths
        CONSTRAINT FK_Orders_Addresses FOREIGN KEY (address_id) REFERENCES Addresses(address_id) ON DELETE NO ACTION,
        CONSTRAINT FK_Orders_Coupons FOREIGN KEY (coupon_code) REFERENCES Coupons(code)
    );
END;
GO

-- 10. Create OrderItems Table
IF OBJECT_ID('dbo.OrderItems', 'U') IS NULL
BEGIN
    CREATE TABLE OrderItems (
        order_item_id INT IDENTITY(1,1) PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL CHECK (quantity > 0),
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        CONSTRAINT FK_OrderItems_Orders FOREIGN KEY (order_id) REFERENCES Orders(order_id) ON DELETE CASCADE,
        CONSTRAINT FK_OrderItems_Products FOREIGN KEY (product_id) REFERENCES Products(product_id)
    );
END;
GO

-- 11. Create Payments Table
IF OBJECT_ID('dbo.Payments', 'U') IS NULL
BEGIN
    CREATE TABLE Payments (
        payment_id INT IDENTITY(1,1) PRIMARY KEY,
        order_id INT NOT NULL,
        transaction_id VARCHAR(100) NOT NULL UNIQUE,
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        payment_status VARCHAR(30) NOT NULL CHECK (payment_status IN ('Pending', 'Success', 'Failed')),
        created_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Payments_Orders FOREIGN KEY (order_id) REFERENCES Orders(order_id) ON DELETE CASCADE
    );
END;
GO

-- 12. Create AuditLogs Table
IF OBJECT_ID('dbo.AuditLogs', 'U') IS NULL
BEGIN
    CREATE TABLE AuditLogs (
        log_id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NULL,
        action VARCHAR(100) NOT NULL,
        table_name VARCHAR(100) NOT NULL,
        record_id INT NULL,
        details NVARCHAR(MAX) NULL,
        timestamp DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_AuditLogs_Users FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE SET NULL
    );
END;
GO


-- --- Create Indexes for Performance Optimization ---

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Products_Category' AND object_id = OBJECT_ID('Products'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Products_Category 
    ON Products(category_id, status);
END;
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_CartItems_User' AND object_id = OBJECT_ID('CartItems'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_CartItems_User
    ON CartItems(user_id);
END;
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Orders_User' AND object_id = OBJECT_ID('Orders'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Orders_User
    ON Orders(user_id);
END;
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ProductImages_Product' AND object_id = OBJECT_ID('ProductImages'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_ProductImages_Product
    ON ProductImages(product_id);
END;
GO


-- --- Automatic `updated_at` Triggers ---

-- Users Trigger
CREATE OR ALTER TRIGGER TR_Users_Update ON Users
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Users SET updated_at = GETDATE() FROM Users JOIN inserted ON Users.user_id = inserted.user_id;
END;
GO

-- Addresses Trigger
CREATE OR ALTER TRIGGER TR_Addresses_Update ON Addresses
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Addresses SET updated_at = GETDATE() FROM Addresses JOIN inserted ON Addresses.address_id = inserted.address_id;
END;
GO

-- Products Trigger
CREATE OR ALTER TRIGGER TR_Products_Update ON Products
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Products SET updated_at = GETDATE() FROM Products JOIN inserted ON Products.product_id = inserted.product_id;
END;
GO

-- Orders Trigger
CREATE OR ALTER TRIGGER TR_Orders_Update ON Orders
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Orders SET updated_at = GETDATE() FROM Orders JOIN inserted ON Orders.order_id = inserted.order_id;
END;
GO
