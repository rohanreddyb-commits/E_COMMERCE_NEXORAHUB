-- Seed Initial Data for E-Commerce Database (NexoraHub_DB)
USE NexoraHub_DB;
GO

-- 1. Seed Roles
IF NOT EXISTS (SELECT * FROM Roles WHERE name = 'Super Admin')
BEGIN
    INSERT INTO Roles (name, description) VALUES ('Super Admin', 'Full system access');
END;

IF NOT EXISTS (SELECT * FROM Roles WHERE name = 'Admin')
BEGIN
    INSERT INTO Roles (name, description) VALUES ('Admin', 'Administrative access');
END;

IF NOT EXISTS (SELECT * FROM Roles WHERE name = 'Customer')
BEGIN
    INSERT INTO Roles (name, description) VALUES ('Customer', 'Customer access');
END;

IF NOT EXISTS (SELECT * FROM Roles WHERE name = 'Support')
BEGIN
    INSERT INTO Roles (name, description) VALUES ('Support', 'Support staff access');
END;
GO

-- 2. Seed Default Administrator Account
-- Email: admin@ecommerce.com
-- Password: AdminPassword123 (hashed using bcrypt)
IF NOT EXISTS (SELECT * FROM Users WHERE email = 'admin@ecommerce.com')
BEGIN
    -- Insert Admin User
    INSERT INTO Users (first_name, last_name, email, password_hash, status, created_at, updated_at)
    VALUES (
        N'Admin', 
        N'User', 
        N'admin@ecommerce.com', 
        '$2b$12$kbEOauaOuYs1ADffV3zMSOcZsFDkfpCiIEf5SrsIV9JzUB9XrBPRi', 
        'Active',
        GETDATE(), 
        GETDATE()
    );

    -- Get user_id and role_id to link them in UserRoles
    DECLARE @UserId INT;
    DECLARE @RoleId INT;

    SELECT @UserId = user_id FROM Users WHERE email = 'admin@ecommerce.com';
    SELECT @RoleId = role_id FROM Roles WHERE name = 'Admin';

    IF @UserId IS NOT NULL AND @RoleId IS NOT NULL
    BEGIN
        INSERT INTO UserRoles (user_id, role_id) VALUES (@UserId, @RoleId);
    END;
END;
GO
