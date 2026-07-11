-- Seed Initial Data for E-Commerce Database

-- 1. Seed Roles
IF NOT EXISTS (SELECT * FROM Roles WHERE role_id = 1)
BEGIN
    INSERT INTO Roles (role_id, name) VALUES (1, 'Admin');
END;

IF NOT EXISTS (SELECT * FROM Roles WHERE role_id = 2)
BEGIN
    INSERT INTO Roles (role_id, name) VALUES (2, 'Customer');
END;

-- 2. Seed Default Administrator Account
-- Name: Admin User
-- Email: admin@ecommerce.com
-- Password: AdminPassword123 (hashed using bcrypt)
IF NOT EXISTS (SELECT * FROM Users WHERE email = 'admin@ecommerce.com')
BEGIN
    INSERT INTO Users (name, email, password_hash, role_id, created_at, updated_at)
    VALUES (
        N'Admin User', 
        N'admin@ecommerce.com', 
        '$2b$12$kbEOauaOuYs1ADffV3zMSOcZsFDkfpCiIEf5SrsIV9JzUB9XrBPRi', 
        1, 
        GETDATE(), 
        GETDATE()
    );
END;
