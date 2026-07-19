-- ============================================================================
-- NexoraHub Customer Backend Additive Migration Schema
-- Safe to execute against existing MSSQL database — 100% additive
-- DO NOT alter or drop any existing admin tables
-- ============================================================================

-- 1. Extend Users table if missing new fields
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

-- 2. Customer Sessions Table
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'CustomerSessions')
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

-- 3. Password Reset Tokens Table
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PasswordResetTokens')
BEGIN
    CREATE TABLE PasswordResetTokens (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL FOREIGN KEY REFERENCES Users(user_id) ON DELETE CASCADE,
        otp_hash VARCHAR(255) NOT NULL,
        token_hash VARCHAR(255) NULL,
        expires_at DATETIME NOT NULL,
        used BIT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_PasswordResetTokens_UserId ON PasswordResetTokens(user_id);
END;

-- 4. Email Verifications Table
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EmailVerifications')
BEGIN
    CREATE TABLE EmailVerifications (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL FOREIGN KEY REFERENCES Users(user_id) ON DELETE CASCADE,
        otp_hash VARCHAR(255) NOT NULL,
        expires_at DATETIME NOT NULL,
        verified BIT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_EmailVerifications_UserId ON EmailVerifications(user_id);
END;

-- 5. Login History Table
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'LoginHistory')
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

-- 6. Password History Table
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PasswordHistory')
BEGIN
    CREATE TABLE PasswordHistory (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL FOREIGN KEY REFERENCES Users(user_id) ON DELETE CASCADE,
        password_hash VARCHAR(255) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_PasswordHistory_UserId ON PasswordHistory(user_id);
END;

-- 7. Audit Logs Table
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'AuditLogs')
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
        created_at DATETIME NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_AuditLogs_Module ON AuditLogs(module, created_at);
END;

-- 8. Reward Points Table
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'RewardPoints')
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

-- 9. Reward Points History Table
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'RewardPointsHistory')
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

-- 10. Wishlist & Wishlist Items Tables
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Wishlist')
BEGIN
    CREATE TABLE Wishlist (
        wishlist_id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL UNIQUE FOREIGN KEY REFERENCES Users(user_id) ON DELETE CASCADE,
        created_at DATETIME NOT NULL DEFAULT GETDATE()
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'WishlistItems')
BEGIN
    CREATE TABLE WishlistItems (
        wishlist_item_id INT IDENTITY(1,1) PRIMARY KEY,
        wishlist_id INT NOT NULL FOREIGN KEY REFERENCES Wishlist(wishlist_id) ON DELETE CASCADE,
        product_id INT NOT NULL FOREIGN KEY REFERENCES Products(product_id) ON DELETE CASCADE,
        added_at DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT UQ_Wishlist_Product UNIQUE (wishlist_id, product_id)
    );
END;

-- 11. Cart Items Table
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'CartItems')
BEGIN
    CREATE TABLE CartItems (
        cart_item_id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL FOREIGN KEY REFERENCES Users(user_id) ON DELETE CASCADE,
        product_id INT NOT NULL FOREIGN KEY REFERENCES Products(product_id) ON DELETE CASCADE,
        quantity INT NOT NULL DEFAULT 1,
        saved_for_later BIT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_CartItems_UserId ON CartItems(user_id, saved_for_later);
END;

-- 12. Extend Orders Table if missing fields
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Orders') AND name = 'notes')
    ALTER TABLE Orders ADD notes NVARCHAR(MAX) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Orders') AND name = 'idempotency_key')
    ALTER TABLE Orders ADD idempotency_key VARCHAR(100) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Orders') AND name = 'tracking_number')
    ALTER TABLE Orders ADD tracking_number VARCHAR(100) NULL;

-- 13. Order Cancellations Table
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'OrderCancellations')
BEGIN
    CREATE TABLE OrderCancellations (
        id INT IDENTITY(1,1) PRIMARY KEY,
        order_id INT NOT NULL FOREIGN KEY REFERENCES Orders(order_id) ON DELETE CASCADE,
        reason NVARCHAR(500) NOT NULL,
        cancelled_at DATETIME NOT NULL DEFAULT GETDATE()
    );
END;

-- 14. Notifications Table
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Notifications')
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

-- 15. Recently Viewed Table
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'RecentlyViewed')
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

-- 16. Return Requests Table
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ReturnRequests')
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

-- 17. Support Tickets & Support Messages Tables
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SupportTickets')
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

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SupportMessages')
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

-- 18. Customer Referrals & Referral History Tables
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'CustomerReferrals')
BEGIN
    CREATE TABLE CustomerReferrals (
        referrer_id INT PRIMARY KEY FOREIGN KEY REFERENCES Users(user_id) ON DELETE CASCADE,
        referral_code VARCHAR(50) NOT NULL UNIQUE,
        created_at DATETIME NOT NULL DEFAULT GETDATE()
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'CustomerReferralHistory')
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

-- 19. Search History & Search Analytics Tables
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SearchHistory')
BEGIN
    CREATE TABLE SearchHistory (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL FOREIGN KEY REFERENCES Users(user_id) ON DELETE CASCADE,
        search_term NVARCHAR(255) NOT NULL,
        searched_at DATETIME NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_SearchHistory_User ON SearchHistory(user_id, searched_at);
END;

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SearchAnalytics')
BEGIN
    CREATE TABLE SearchAnalytics (
        term NVARCHAR(255) PRIMARY KEY,
        search_count INT NOT NULL DEFAULT 1,
        last_searched DATETIME NOT NULL DEFAULT GETDATE()
    );
END;
