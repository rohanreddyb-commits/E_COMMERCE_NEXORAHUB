-- Sample Demonstration Data for E-Commerce Admin Panel (NexoraHub_DB)
-- Target Database: Microsoft SQL Server (MSSQL)
USE NexoraHub_DB;
GO

-- Disable constraint check to clean database safely
EXEC sp_MSforeachtable "ALTER TABLE ? NOCHECK CONSTRAINT ALL"

DELETE FROM AuditLogs;
DELETE FROM Reviews;
DELETE FROM Transactions;
DELETE FROM OrderItems;
DELETE FROM Orders;
DELETE FROM InventoryHistory;
DELETE FROM Inventory;
DELETE FROM Products;
DELETE FROM Categories;
DELETE FROM Brands;
DELETE FROM Addresses;
DELETE FROM UserRoles WHERE user_id <> 1; -- Keep Admin User
DELETE FROM Users WHERE user_id <> 1; -- Keep Admin User
DELETE FROM Coupons;

-- Enable constraints again
EXEC sp_MSforeachtable "ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL"
GO

-- 1. Seed Customer Users
PRINT 'Seeding Users...';
SET IDENTITY_INSERT Users ON;

-- Customer John Doe (user_id = 2)
INSERT INTO Users (user_id, first_name, last_name, email, password_hash, phone, status, created_at, updated_at)
VALUES (2, N'John', N'Doe', N'john.doe@gmail.com', '$2b$12$kbEOauaOuYs1ADffV3zMSOcZsFDkfpCiIEf5SrsIV9JzUB9XrBPRi', '206-555-0192', 'Active', DATEADD(day, -30, GETDATE()), GETDATE());

-- Customer Jane Smith (user_id = 3)
INSERT INTO Users (user_id, first_name, last_name, email, password_hash, phone, status, created_at, updated_at)
VALUES (3, N'Jane', N'Smith', N'jane.smith@yahoo.com', '$2b$12$kbEOauaOuYs1ADffV3zMSOcZsFDkfpCiIEf5SrsIV9JzUB9XrBPRi', '512-555-0122', 'Active', DATEADD(day, -20, GETDATE()), GETDATE());

-- Customer Alice Johnson (user_id = 4)
INSERT INTO Users (user_id, first_name, last_name, email, password_hash, phone, status, created_at, updated_at)
VALUES (4, N'Alice', N'Johnson', N'alice.j@outlook.com', '$2b$12$kbEOauaOuYs1ADffV3zMSOcZsFDkfpCiIEf5SrsIV9JzUB9XrBPRi', '312-555-0188', 'Active', DATEADD(day, -10, GETDATE()), GETDATE());

SET IDENTITY_INSERT Users OFF;

-- Map to Customer Role (role_id = 3)
INSERT INTO UserRoles (user_id, role_id) VALUES (2, 3);
INSERT INTO UserRoles (user_id, role_id) VALUES (3, 3);
INSERT INTO UserRoles (user_id, role_id) VALUES (4, 3);
GO

-- 2. Seed Addresses
PRINT 'Seeding Addresses...';
SET IDENTITY_INSERT Addresses ON;

INSERT INTO Addresses (address_id, user_id, type, title, first_name, last_name, phone, street, city, state, postal_code, country, is_default, created_at, updated_at)
VALUES (1, 2, 'Shipping', N'Home', N'John', N'Doe', '206-555-0192', N'123 Main St', N'Seattle', N'WA', '98101', N'USA', 1, GETDATE(), GETDATE());

INSERT INTO Addresses (address_id, user_id, type, title, first_name, last_name, phone, street, city, state, postal_code, country, is_default, created_at, updated_at)
VALUES (2, 2, 'Billing', N'Office', N'John', N'Doe', '206-555-0143', N'500 Pine St', N'Seattle', N'WA', '98101', N'USA', 0, GETDATE(), GETDATE());

INSERT INTO Addresses (address_id, user_id, type, title, first_name, last_name, phone, street, city, state, postal_code, country, is_default, created_at, updated_at)
VALUES (3, 3, 'Shipping', N'Primary', N'Jane', N'Smith', '512-555-0122', N'789 Oak Ave', N'Austin', N'TX', '78701', N'USA', 1, GETDATE(), GETDATE());

INSERT INTO Addresses (address_id, user_id, type, title, first_name, last_name, phone, street, city, state, postal_code, country, is_default, created_at, updated_at)
VALUES (4, 4, 'Shipping', N'Home', N'Alice', N'Johnson', '312-555-0188', N'456 Elm Rd', N'Chicago', N'IL', '60601', N'USA', 1, GETDATE(), GETDATE());

SET IDENTITY_INSERT Addresses OFF;
GO

-- 3. Seed Brands
PRINT 'Seeding Brands...';
SET IDENTITY_INSERT Brands ON;

INSERT INTO Brands (brand_id, name, slug, description, status, is_featured, created_at, updated_at)
VALUES (1, N'Apple', 'apple', N'Consumer electronics, smart phones, and computing devices.', 'Active', 1, GETDATE(), GETDATE());

INSERT INTO Brands (brand_id, name, slug, description, status, is_featured, created_at, updated_at)
VALUES (2, N'Dell', 'dell', N'Premium computer workstations, screens, and laptops.', 'Active', 0, GETDATE(), GETDATE());

INSERT INTO Brands (brand_id, name, slug, description, status, is_featured, created_at, updated_at)
VALUES (3, N'Sony', 'sony', N'Pioneers of high fidelity audio devices and displays.', 'Active', 1, GETDATE(), GETDATE());

INSERT INTO Brands (brand_id, name, slug, description, status, is_featured, created_at, updated_at)
VALUES (4, N'Nike', 'nike', N'Athletic footwear, activewear, and gear.', 'Active', 1, GETDATE(), GETDATE());

SET IDENTITY_INSERT Brands OFF;
GO

-- 4. Seed Categories
PRINT 'Seeding Categories...';
SET IDENTITY_INSERT Categories ON;

INSERT INTO Categories (category_id, name, slug, description, status, created_at, updated_at)
VALUES (1, N'Electronics', 'electronics', N'Smartphones, laptops, accessories, and gadgets.', 'Active', GETDATE(), GETDATE());

INSERT INTO Categories (category_id, name, slug, description, status, created_at, updated_at)
VALUES (2, N'Fashion & Apparel', 'fashion', N'Premium clothing, jackets, activewear, and shoes.', 'Active', GETDATE(), GETDATE());

INSERT INTO Categories (category_id, name, slug, description, status, created_at, updated_at)
VALUES (3, N'Home & Kitchen', 'home-kitchen', N'Appliances, makers, blenders, and interior decorations.', 'Active', GETDATE(), GETDATE());

INSERT INTO Categories (category_id, name, slug, description, status, created_at, updated_at)
VALUES (4, N'Books & Learning', 'books', N'Technical study materials, textbooks, novels, and guides.', 'Active', GETDATE(), GETDATE());

SET IDENTITY_INSERT Categories OFF;
GO

-- 5. Seed Products
PRINT 'Seeding Products...';
SET IDENTITY_INSERT Products ON;

INSERT INTO Products (product_id, name, slug, description, brand_id, category_id, price, sku, status, is_featured, created_at, updated_at)
VALUES (1, N'iPhone 15 Pro Max', 'iphone-15-pro-max', N'Apple iPhone with Titanium finish, A17 Pro Chip, and advanced telephoto camera system.', 1, 1, 1199.00, 'SKU-AAPL-IPH15PM', 'Active', 1, GETDATE(), GETDATE());

INSERT INTO Products (product_id, name, slug, description, brand_id, category_id, price, sku, status, is_featured, created_at, updated_at)
VALUES (2, N'Dell XPS 15 Laptop', 'dell-xps-15-laptop', N'15-inch high-performance developer laptop with InfinityEdge display and Intel Core i9 processor.', 2, 1, 1899.99, 'SKU-DELL-XPS15D', 'Active', 0, GETDATE(), GETDATE());

INSERT INTO Products (product_id, name, slug, description, brand_id, category_id, price, sku, status, is_featured, created_at, updated_at)
VALUES (3, N'Sony Noise-Cancelling Headphones', 'sony-noise-cancelling-headphones', N'Over-ear Bluetooth headphones with market-leading active noise cancellation (WH-1000XM5).', 3, 1, 349.99, 'SKU-SONY-WH1000XM5', 'Active', 1, GETDATE(), GETDATE());

INSERT INTO Products (product_id, name, slug, description, brand_id, category_id, price, sku, status, is_featured, created_at, updated_at)
VALUES (4, N'Classic Brown Leather Jacket', 'classic-brown-leather-jacket', N'Crafted from 100% genuine lambskin leather. Stylish modern slim-fit cut.', NULL, 2, 149.50, 'SKU-FSHN-LTHJKT', 'Active', 0, GETDATE(), GETDATE());

INSERT INTO Products (product_id, name, slug, description, brand_id, category_id, price, sku, status, is_featured, created_at, updated_at)
VALUES (5, N'Nike Air Running Shoes', 'nike-air-running-shoes', N'Breathable, lightweight mesh construction with responsive foam insoles for premium comfort.', 4, 2, 89.99, 'SKU-NIKE-RUNAIR', 'Active', 1, GETDATE(), GETDATE());

INSERT INTO Products (product_id, name, slug, description, brand_id, category_id, price, sku, status, is_featured, created_at, updated_at)
VALUES (6, N'Professional Kitchen Blender', 'professional-kitchen-blender', N'Countertop blender with 1200W motor, multi-speed dials, and 64oz BPA-free blending container.', NULL, 3, 99.00, 'SKU-HOME-KTBLNDR', 'Active', 0, GETDATE(), GETDATE());

SET IDENTITY_INSERT Products OFF;
GO

-- 6. Seed Inventory
PRINT 'Seeding Inventory...';
INSERT INTO Inventory (product_id, quantity, reserved_quantity, low_stock_threshold, status, updated_at)
VALUES (1, 50, 2, 10, 'In Stock', GETDATE());

INSERT INTO Inventory (product_id, quantity, reserved_quantity, low_stock_threshold, status, updated_at)
VALUES (2, 8, 1, 5, 'Low Stock', GETDATE());

INSERT INTO Inventory (product_id, quantity, reserved_quantity, low_stock_threshold, status, updated_at)
VALUES (3, 75, 0, 10, 'In Stock', GETDATE());

INSERT INTO Inventory (product_id, quantity, reserved_quantity, low_stock_threshold, status, updated_at)
VALUES (4, 45, 0, 10, 'In Stock', GETDATE());

INSERT INTO Inventory (product_id, quantity, reserved_quantity, low_stock_threshold, status, updated_at)
VALUES (5, 0, 0, 10, 'Out of Stock', GETDATE());

INSERT INTO Inventory (product_id, quantity, reserved_quantity, low_stock_threshold, status, updated_at)
VALUES (6, 35, 5, 8, 'In Stock', GETDATE());
GO

-- 7. Seed Coupons
PRINT 'Seeding Coupons...';
SET IDENTITY_INSERT Coupons ON;

INSERT INTO Coupons (coupon_id, code, description, discount_type, discount_value, min_order_amount, expiry_date, is_active, created_at, updated_at)
VALUES (1, 'WELCOME10', N'10% off for new signups', 'Percentage', 10.00, 0.00, DATEADD(year, 2, GETDATE()), 1, GETDATE(), GETDATE());

INSERT INTO Coupons (coupon_id, code, description, discount_type, discount_value, min_order_amount, expiry_date, is_active, created_at, updated_at)
VALUES (2, 'SUMMER50', N'$50 off on purchases above $150', 'Fixed', 50.00, 150.00, DATEADD(year, 2, GETDATE()), 1, GETDATE(), GETDATE());

INSERT INTO Coupons (coupon_id, code, description, discount_type, discount_value, min_order_amount, expiry_date, is_active, created_at, updated_at)
VALUES (3, 'EXPIRED20', N'Expired promotion code', 'Percentage', 20.00, 0.00, DATEADD(day, -5, GETDATE()), 0, GETDATE(), GETDATE());

SET IDENTITY_INSERT Coupons OFF;
GO

-- 8. Seed Orders, OrderItems & Transactions
PRINT 'Seeding Orders...';
SET IDENTITY_INSERT Orders ON;

-- Order 1: John Doe - Shipped (Total: $1498.99, Discount: $50.00 via SUMMER50)
INSERT INTO Orders (order_id, order_number, user_id, shipping_address_id, billing_address_id, subtotal, shipping_fee, tax_amount, discount_amount, total_amount, coupon_id, order_status, payment_status, payment_method, created_at, updated_at)
VALUES (1, 'ORD-2026-0001', 2, 1, 2, 1548.99, 0.00, 0.00, 50.00, 1498.99, 2, 'Shipped', 'Paid', 'Credit Card', DATEADD(day, -7, GETDATE()), GETDATE());

-- Order 2: Jane Smith - Delivered (Total: $80.99, Discount: $9.00 via WELCOME10)
INSERT INTO Orders (order_id, order_number, user_id, shipping_address_id, billing_address_id, subtotal, shipping_fee, tax_amount, discount_amount, total_amount, coupon_id, order_status, payment_status, payment_method, created_at, updated_at)
VALUES (2, 'ORD-2026-0002', 3, 3, 3, 89.99, 0.00, 0.00, 9.00, 80.99, 1, 'Delivered', 'Paid', 'PayPal', DATEADD(day, -5, GETDATE()), GETDATE());

-- Order 3: Alice Johnson - Pending (Total: $1199.00, No Discount)
INSERT INTO Orders (order_id, order_number, user_id, shipping_address_id, billing_address_id, subtotal, shipping_fee, tax_amount, discount_amount, total_amount, coupon_id, order_status, payment_status, payment_method, created_at, updated_at)
VALUES (3, 'ORD-2026-0003', 4, 4, 4, 1199.00, 0.00, 0.00, 0.00, 1199.00, NULL, 'Pending', 'Pending', 'Credit Card', DATEADD(day, -2, GETDATE()), GETDATE());

SET IDENTITY_INSERT Orders OFF;
GO

-- Seed OrderItems
PRINT 'Seeding OrderItems...';
SET IDENTITY_INSERT OrderItems ON;

-- Order 1 Items (iPhone + Sony Headphones)
INSERT INTO OrderItems (order_item_id, order_id, product_id, product_name, sku, quantity, unit_price, total_price)
VALUES (1, 1, 1, N'iPhone 15 Pro Max', 'SKU-AAPL-IPH15PM', 1, 1199.00, 1199.00);

INSERT INTO OrderItems (order_item_id, order_id, product_id, product_name, sku, quantity, unit_price, total_price)
VALUES (2, 1, 3, N'Sony Noise-Cancelling Headphones', 'SKU-SONY-WH1000XM5', 1, 349.99, 349.99);

-- Order 2 Items (Nike Running Shoes)
INSERT INTO OrderItems (order_item_id, order_id, product_id, product_name, sku, quantity, unit_price, total_price)
VALUES (3, 2, 5, N'Nike Air Running Shoes', 'SKU-NIKE-RUNAIR', 1, 89.99, 89.99);

-- Order 3 Items (iPhone)
INSERT INTO OrderItems (order_item_id, order_id, product_id, product_name, sku, quantity, unit_price, total_price)
VALUES (4, 3, 1, N'iPhone 15 Pro Max', 'SKU-AAPL-IPH15PM', 1, 1199.00, 1199.00);

SET IDENTITY_INSERT OrderItems OFF;
GO

-- Seed Payments/Transactions
PRINT 'Seeding Transactions...';
INSERT INTO Transactions (order_id, gateway_transaction_id, amount, payment_method, status, created_at)
VALUES (1, 'TXN_SIM_SAMPLE_001_A', 1498.99, 'Credit Card', 'Success', DATEADD(day, -7, GETDATE()));

INSERT INTO Transactions (order_id, gateway_transaction_id, amount, payment_method, status, created_at)
VALUES (2, 'TXN_SIM_SAMPLE_002_B', 80.99, 'PayPal', 'Success', DATEADD(day, -5, GETDATE()));
GO

-- 9. Seed Reviews
PRINT 'Seeding Reviews...';
INSERT INTO Reviews (product_id, user_id, rating, title, comment, status, created_at, updated_at)
VALUES (1, 2, 5, N'Best iPhone yet!', N'Super premium feel with the titanium finish. The camera system is insane.', 'Approved', DATEADD(day, -6, GETDATE()), GETDATE());

INSERT INTO Reviews (product_id, user_id, rating, title, comment, status, created_at, updated_at)
VALUES (3, 3, 4, N'Incredible ANC quality', N'ANC is top notch. Sound signature is slightly bass heavy but easily fixable in EQ.', 'Approved', DATEADD(day, -4, GETDATE()), GETDATE());

INSERT INTO Reviews (product_id, user_id, rating, title, comment, status, created_at, updated_at)
VALUES (1, 3, 1, N'Screen cracked on day 1', N'Slipped from my pocket onto a carpeted floor and cracked. Glass quality is subpar.', 'Pending', DATEADD(day, -1, GETDATE()), GETDATE());
GO

PRINT 'Sample database seeding complete!';
