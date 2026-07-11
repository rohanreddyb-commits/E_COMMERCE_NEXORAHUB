-- Sample Demonstration Data for E-Commerce Admin Panel
-- Target Database: Microsoft SQL Server (MSSQL)
-- Please execute this script manually against the E_Commerce_DB database.

USE E_Commerce_DB;
GO

-- 1. Clean Existing Database Records (Reverse dependency order)
PRINT 'Cleaning existing data...';
DELETE FROM AuditLogs;
DELETE FROM Payments;
DELETE FROM OrderItems;
DELETE FROM Orders;
DELETE FROM CartItems;
DELETE FROM ProductImages;
DELETE FROM Products;
DELETE FROM Categories;
DELETE FROM Addresses;
DELETE FROM Users;
DELETE FROM Coupons;
GO

-- 2. Re-seed Admin & Customer Accounts
PRINT 'Seeding Users...';
SET IDENTITY_INSERT Users ON;

-- Admin (user_id = 1)
INSERT INTO Users (user_id, name, email, password_hash, role_id, created_at, updated_at)
VALUES (1, N'Admin User', N'admin@ecommerce.com', '$2b$12$kbEOauaOuYs1ADffV3zMSOcZsFDkfpCiIEf5SrsIV9JzUB9XrBPRi', 1, GETDATE(), GETDATE());

-- Customer John Doe (user_id = 2)
INSERT INTO Users (user_id, name, email, password_hash, role_id, created_at, updated_at)
VALUES (2, N'John Doe', N'john.doe@gmail.com', '$2b$12$kbEOauaOuYs1ADffV3zMSOcZsFDkfpCiIEf5SrsIV9JzUB9XrBPRi', 2, DATEADD(day, -30, GETDATE()), GETDATE());

-- Customer Jane Smith (user_id = 3)
INSERT INTO Users (user_id, name, email, password_hash, role_id, created_at, updated_at)
VALUES (3, N'Jane Smith', N'jane.smith@yahoo.com', '$2b$12$kbEOauaOuYs1ADffV3zMSOcZsFDkfpCiIEf5SrsIV9JzUB9XrBPRi', 2, DATEADD(day, -20, GETDATE()), GETDATE());

-- Customer Alice Johnson (user_id = 4)
INSERT INTO Users (user_id, name, email, password_hash, role_id, created_at, updated_at)
VALUES (4, N'Alice Johnson', N'alice.j@outlook.com', '$2b$12$kbEOauaOuYs1ADffV3zMSOcZsFDkfpCiIEf5SrsIV9JzUB9XrBPRi', 2, DATEADD(day, -10, GETDATE()), GETDATE());

SET IDENTITY_INSERT Users OFF;
GO

-- 3. Seed Addresses
PRINT 'Seeding Addresses...';
SET IDENTITY_INSERT Addresses ON;

INSERT INTO Addresses (address_id, user_id, title, street, city, state, postal_code, country, phone, created_at, updated_at)
VALUES (1, 2, N'Home', N'123 Main St', N'Seattle', N'WA', '98101', N'USA', '206-555-0192', GETDATE(), GETDATE());

INSERT INTO Addresses (address_id, user_id, title, street, city, state, postal_code, country, phone, created_at, updated_at)
VALUES (2, 2, N'Office', N'500 Pine St', N'Seattle', N'WA', '98101', N'USA', '206-555-0143', GETDATE(), GETDATE());

INSERT INTO Addresses (address_id, user_id, title, street, city, state, postal_code, country, phone, created_at, updated_at)
VALUES (3, 3, N'Primary', N'789 Oak Ave', N'Austin', N'TX', '78701', N'USA', '512-555-0122', GETDATE(), GETDATE());

INSERT INTO Addresses (address_id, user_id, title, street, city, state, postal_code, country, phone, created_at, updated_at)
VALUES (4, 4, N'Home', N'456 Elm Rd', N'Chicago', N'IL', '60601', N'USA', '312-555-0188', GETDATE(), GETDATE());

SET IDENTITY_INSERT Addresses OFF;
GO

-- 4. Seed Categories
PRINT 'Seeding Categories...';
SET IDENTITY_INSERT Categories ON;

INSERT INTO Categories (category_id, name, description, created_at, updated_at)
VALUES (1, N'Electronics', N'Smartphones, laptops, accessories, and gadgets.', GETDATE(), GETDATE());

INSERT INTO Categories (category_id, name, description, created_at, updated_at)
VALUES (2, N'Fashion & Apparel', N'Premium clothing, jackets, activewear, and shoes.', GETDATE(), GETDATE());

INSERT INTO Categories (category_id, name, description, created_at, updated_at)
VALUES (3, N'Home & Kitchen', N'Appliances, makers, blenders, and interior decorations.', GETDATE(), GETDATE());

INSERT INTO Categories (category_id, name, description, created_at, updated_at)
VALUES (4, N'Books & Learning', N'Technical study materials, cookbooks, novels, and guides.', GETDATE(), GETDATE());

SET IDENTITY_INSERT Categories OFF;
GO

-- 5. Seed Products
PRINT 'Seeding Products...';
SET IDENTITY_INSERT Products ON;

INSERT INTO Products (product_id, name, description, price, sku, stock_quantity, category_id, status, created_at, updated_at)
VALUES (1, N'iPhone 15 Pro Max', N'Apple iPhone with Titanium finish, A17 Pro Chip, and advanced telephoto camera system.', 1199.00, 'SKU-AAPL-IPH15PM', 50, 1, 'Active', GETDATE(), GETDATE());

INSERT INTO Products (product_id, name, description, price, sku, stock_quantity, category_id, status, created_at, updated_at)
VALUES (2, N'Dell XPS 15 Laptop', N'15-inch high-performance developer laptop with InfinityEdge display and Intel Core i9 processor.', 1899.99, 'SKU-DELL-XPS15D', 20, 1, 'Active', GETDATE(), GETDATE());

INSERT INTO Products (product_id, name, description, price, sku, stock_quantity, category_id, status, created_at, updated_at)
VALUES (3, N'Sony Noise-Cancelling Headphones', N'Over-ear Bluetooth headphones with market-leading active noise cancellation (WH-1000XM5).', 349.99, 'SKU-SONY-WH1000XM5', 75, 1, 'Active', GETDATE(), GETDATE());

INSERT INTO Products (product_id, name, description, price, sku, stock_quantity, category_id, status, created_at, updated_at)
VALUES (4, N'Classic Brown Leather Jacket', N'Crafted from 100% genuine lambskin leather. Stylish modern slim-fit cut.', 149.50, 'SKU-FSHN-LTHJKT', 45, 2, 'Active', GETDATE(), GETDATE());

INSERT INTO Products (product_id, name, description, price, sku, stock_quantity, category_id, status, created_at, updated_at)
VALUES (5, N'Air Athletics Running Shoes', N'Breathable, lightweight mesh construction with responsive foam insoles for premium comfort.', 89.99, 'SKU-NIKE-RUNAIR', 120, 2, 'Active', GETDATE(), GETDATE());

INSERT INTO Products (product_id, name, description, price, sku, stock_quantity, category_id, status, created_at, updated_at)
VALUES (6, N'Professional Kitchen Blender', N'Countertop blender with 1200W motor, multi-speed dials, and 64oz BPA-free blending container.', 99.00, 'SKU-HOME-KTBLNDR', 35, 3, 'Active', GETDATE(), GETDATE());

INSERT INTO Products (product_id, name, description, price, sku, stock_quantity, category_id, status, created_at, updated_at)
VALUES (7, N'Semi-Automatic Espresso Machine', N'Stainless steel espresso maker featuring 15-bar Italian pump pressure and integrated milk steam wand.', 449.00, 'SKU-BREW-ESPMCH', 12, 3, 'Active', GETDATE(), GETDATE());

INSERT INTO Products (product_id, name, description, price, sku, stock_quantity, category_id, status, created_at, updated_at)
VALUES (8, N'Learn SQL in 24 Hours', N'A comprehensive introductory guide to relational database design, schema creations, and indexes.', 24.99, 'SKU-BOOK-SQL24H', 150, 4, 'Active', GETDATE(), GETDATE());

INSERT INTO Products (product_id, name, description, price, sku, stock_quantity, category_id, status, created_at, updated_at)
VALUES (9, N'Production Next.js Cookbook', N'Step-by-step recipes for advanced server routing, data caching, layout structures, and deployments.', 39.99, 'SKU-BOOK-NEXTCKBK', 80, 4, 'Active', GETDATE(), GETDATE());

SET IDENTITY_INSERT Products OFF;
GO

-- 6. Seed ProductImages
PRINT 'Seeding ProductImages...';
SET IDENTITY_INSERT ProductImages ON;

INSERT INTO ProductImages (image_id, product_id, image_url, is_primary, created_at)
VALUES (1, 1, '/uploads/iphone15.jpg', 1, GETDATE());

INSERT INTO ProductImages (image_id, product_id, image_url, is_primary, created_at)
VALUES (2, 2, '/uploads/dellxps.jpg', 1, GETDATE());

INSERT INTO ProductImages (image_id, product_id, image_url, is_primary, created_at)
VALUES (3, 3, '/uploads/sonyheadphones.jpg', 1, GETDATE());

INSERT INTO ProductImages (image_id, product_id, image_url, is_primary, created_at)
VALUES (4, 4, '/uploads/leatherjacket.jpg', 1, GETDATE());

INSERT INTO ProductImages (image_id, product_id, image_url, is_primary, created_at)
VALUES (5, 5, '/uploads/runningshoes.jpg', 1, GETDATE());

INSERT INTO ProductImages (image_id, product_id, image_url, is_primary, created_at)
VALUES (6, 6, '/uploads/blender.jpg', 1, GETDATE());

INSERT INTO ProductImages (image_id, product_id, image_url, is_primary, created_at)
VALUES (7, 7, '/uploads/espresso.jpg', 1, GETDATE());

INSERT INTO ProductImages (image_id, product_id, image_url, is_primary, created_at)
VALUES (8, 8, '/uploads/sqlbook.jpg', 1, GETDATE());

INSERT INTO ProductImages (image_id, product_id, image_url, is_primary, created_at)
VALUES (9, 9, '/uploads/nextbook.jpg', 1, GETDATE());

SET IDENTITY_INSERT ProductImages OFF;
GO

-- 7. Seed Coupons
PRINT 'Seeding Coupons...';
SET IDENTITY_INSERT Coupons ON;

INSERT INTO Coupons (coupon_id, code, discount_type, discount_value, min_order_amount, expiry_date, is_active, created_at, updated_at)
VALUES (1, 'WELCOME10', 'Percentage', 10.00, 0.00, DATEADD(year, 2, GETDATE()), 1, GETDATE(), GETDATE());

INSERT INTO Coupons (coupon_id, code, discount_type, discount_value, min_order_amount, expiry_date, is_active, created_at, updated_at)
VALUES (2, 'SUMMER50', 'Fixed', 50.00, 150.00, DATEADD(year, 2, GETDATE()), 1, GETDATE(), GETDATE());

INSERT INTO Coupons (coupon_id, code, discount_type, discount_value, min_order_amount, expiry_date, is_active, created_at, updated_at)
VALUES (3, 'EXPIRED20', 'Percentage', 20.00, 0.00, DATEADD(day, -5, GETDATE()), 1, GETDATE(), GETDATE());

SET IDENTITY_INSERT Coupons OFF;
GO

-- 8. Seed Orders, OrderItems & Payments
PRINT 'Seeding Orders, Items and Payments...';
SET IDENTITY_INSERT Orders ON;

-- Order 1: John Doe - Shipped (Total: $1498.98, Discount: $50.00 via SUMMER50)
INSERT INTO Orders (order_id, user_id, address_id, subtotal, discount_amount, total_amount, coupon_code, order_status, payment_status, created_at, updated_at)
VALUES (1, 2, 1, 1548.99, 50.00, 1498.99, 'SUMMER50', 'Shipped', 'Success', DATEADD(day, -7, GETDATE()), GETDATE());

-- Order 2: Jane Smith - Delivered (Total: $80.99, Discount: $9.00 via WELCOME10)
INSERT INTO Orders (order_id, user_id, address_id, subtotal, discount_amount, total_amount, coupon_code, order_status, payment_status, created_at, updated_at)
VALUES (2, 3, 3, 89.99, 9.00, 80.99, 'WELCOME10', 'Delivered', 'Success', DATEADD(day, -5, GETDATE()), GETDATE());

-- Order 3: Alice Johnson - Pending (Total: $1199.00, No Discount)
INSERT INTO Orders (order_id, user_id, address_id, subtotal, discount_amount, total_amount, coupon_code, order_status, payment_status, created_at, updated_at)
VALUES (3, 4, 4, 1199.00, 0.00, 1199.00, NULL, 'Pending', 'Pending', DATEADD(day, -2, GETDATE()), GETDATE());

-- Order 4: John Doe - Cancelled (Total: $39.99, No Discount)
INSERT INTO Orders (order_id, user_id, address_id, subtotal, discount_amount, total_amount, coupon_code, order_status, payment_status, created_at, updated_at)
VALUES (4, 2, 2, 39.99, 0.00, 39.99, NULL, 'Cancelled', 'Failed', DATEADD(day, -1, GETDATE()), GETDATE());

SET IDENTITY_INSERT Orders OFF;
GO

-- Seed OrderItems
SET IDENTITY_INSERT OrderItems ON;

-- Order 1 Items (iPhone + Sony Headphones)
INSERT INTO OrderItems (order_item_id, order_id, product_id, quantity, unit_price, total_price)
VALUES (1, 1, 1, 1, 1199.00, 1199.00);
INSERT INTO OrderItems (order_item_id, order_id, product_id, quantity, unit_price, total_price)
VALUES (2, 1, 3, 1, 349.99, 349.99);

-- Order 2 Items (Running Shoes)
INSERT INTO OrderItems (order_item_id, order_id, product_id, quantity, unit_price, total_price)
VALUES (3, 2, 5, 1, 89.99, 89.99);

-- Order 3 Items (iPhone)
INSERT INTO OrderItems (order_item_id, order_id, product_id, quantity, unit_price, total_price)
VALUES (4, 3, 1, 1, 1199.00, 1199.00);

-- Order 4 Items (Next.js Cookbook)
INSERT INTO OrderItems (order_item_id, order_id, product_id, quantity, unit_price, total_price)
VALUES (5, 4, 9, 1, 39.99, 39.99);

SET IDENTITY_INSERT OrderItems OFF;
GO

-- Seed Payments
SET IDENTITY_INSERT Payments ON;

-- Payment for Order 1
INSERT INTO Payments (payment_id, order_id, transaction_id, amount, payment_method, payment_status, created_at)
VALUES (1, 1, 'TXN_SIM_SAMPLE_001_A', 1498.99, 'Credit Card', 'Success', DATEADD(day, -7, GETDATE()));

-- Payment for Order 2
INSERT INTO Payments (payment_id, order_id, transaction_id, amount, payment_method, payment_status, created_at)
VALUES (2, 2, 'TXN_SIM_SAMPLE_002_B', 80.99, 'PayPal', 'Success', DATEADD(day, -5, GETDATE()));

SET IDENTITY_INSERT Payments OFF;
GO

PRINT 'Sample database seeding complete!';
