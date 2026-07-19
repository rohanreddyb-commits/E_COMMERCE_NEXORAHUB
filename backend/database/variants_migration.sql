-- =======================================================================================
-- NexoraHub Dynamic Product Variant System — Migration Script
-- Run this once against NexoraHub_DB. All statements are idempotent (IF NOT EXISTS).
-- =======================================================================================

USE NexoraHub_DB;
GO

-- =======================================================================================
-- Table 1: VariantGroups
--   Stores attribute category names (e.g., "Color", "Size", "Storage")
--   Each group belongs to one product.
-- =======================================================================================
IF OBJECT_ID('dbo.VariantGroups', 'U') IS NULL
BEGIN
    CREATE TABLE VariantGroups (
        group_id      INT IDENTITY(1,1) PRIMARY KEY,
        product_id    INT NOT NULL,
        name          NVARCHAR(100) NOT NULL,           -- e.g., "Color", "Size", "Flavor"
        display_order INT NOT NULL DEFAULT 0,
        created_at    DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_VariantGroups_Products
            FOREIGN KEY (product_id) REFERENCES Products(product_id) ON DELETE CASCADE,
        CONSTRAINT UQ_VariantGroups_ProductName
            UNIQUE (product_id, name)                  -- no duplicate attribute names per product
    );
END;
GO

-- =======================================================================================
-- Table 2: VariantOptions
--   Stores individual values for a group (e.g., "Red", "Blue", "S", "M", "128GB")
-- =======================================================================================
IF OBJECT_ID('dbo.VariantOptions', 'U') IS NULL
BEGIN
    CREATE TABLE VariantOptions (
        option_id     INT IDENTITY(1,1) PRIMARY KEY,
        group_id      INT NOT NULL,
        value         NVARCHAR(200) NOT NULL,           -- e.g., "Red", "XL", "256 GB"
        display_order INT NOT NULL DEFAULT 0,
        created_at    DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_VariantOptions_Groups
            FOREIGN KEY (group_id) REFERENCES VariantGroups(group_id) ON DELETE CASCADE,
        CONSTRAINT UQ_VariantOptions_GroupValue
            UNIQUE (group_id, value)                   -- no duplicate values within a group
    );
END;
GO

-- =======================================================================================
-- Table 3: ProductVariants
--   Stores each unique combination (e.g., Red + XL).
--   Has its own SKU, price, stock, barcode, and weight.
--   price NULL means inherit from parent product.
-- =======================================================================================
IF OBJECT_ID('dbo.ProductVariants', 'U') IS NULL
BEGIN
    CREATE TABLE ProductVariants (
        variant_id         INT IDENTITY(1,1) PRIMARY KEY,
        product_id         INT NOT NULL,
        sku                VARCHAR(150) NOT NULL UNIQUE,
        price              DECIMAL(10,2) NULL,          -- NULL = inherit base product price
        sale_price         DECIMAL(10,2) NULL,
        stock              INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
        barcode            VARCHAR(150) NULL,
        weight_grams       INT NULL,                    -- optional, for shipping
        is_active          BIT NOT NULL DEFAULT 1,
        created_at         DATETIME DEFAULT GETDATE(),
        updated_at         DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_ProductVariants_Products
            FOREIGN KEY (product_id) REFERENCES Products(product_id) ON DELETE CASCADE
    );
END;
GO

-- Trigger: auto-update updated_at on ProductVariants
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

-- =======================================================================================
-- Table 4: ProductVariantOptionMap
--   Junction: maps each ProductVariant → its VariantOptions
--   e.g., variant_id=5 maps to option_id=2 (Red) AND option_id=8 (XL)
-- =======================================================================================
IF OBJECT_ID('dbo.ProductVariantOptionMap', 'U') IS NULL
BEGIN
    CREATE TABLE ProductVariantOptionMap (
        variant_id INT NOT NULL,
        option_id  INT NOT NULL,
        PRIMARY KEY (variant_id, option_id),
        CONSTRAINT FK_VOM_Variants
            FOREIGN KEY (variant_id) REFERENCES ProductVariants(variant_id) ON DELETE CASCADE,
        CONSTRAINT FK_VOM_Options
            FOREIGN KEY (option_id)  REFERENCES VariantOptions(option_id)  -- no cascade to avoid cycles
    );
END;
GO

-- =======================================================================================
-- Table 5: ProductVariantImages
--   Optional per-variant product image (overrides main product image for that variant)
-- =======================================================================================
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

-- =======================================================================================
-- Extend OrderItems: add variant_id column (nullable, backward-compatible)
-- =======================================================================================
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.OrderItems') AND name = 'variant_id'
)
BEGIN
    ALTER TABLE OrderItems
    ADD variant_id INT NULL,
        variant_label NVARCHAR(500) NULL;  -- snapshot e.g. "Color: Red | Size: XL"

    ALTER TABLE OrderItems
    ADD CONSTRAINT FK_OrderItems_Variants
        FOREIGN KEY (variant_id) REFERENCES ProductVariants(variant_id) ON DELETE NO ACTION;
END;
GO

-- =======================================================================================
-- Extend CartItems (if exists): add variant_id column
-- =======================================================================================
IF OBJECT_ID('dbo.CartItems', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('dbo.CartItems') AND name = 'variant_id'
    )
    BEGIN
        ALTER TABLE CartItems
        ADD variant_id    INT NULL,
            variant_label NVARCHAR(500) NULL;

        ALTER TABLE CartItems
        ADD CONSTRAINT FK_CartItems_Variants
            FOREIGN KEY (variant_id) REFERENCES ProductVariants(variant_id) ON DELETE SET NULL;
    END;
END;
GO

-- =======================================================================================
-- Useful index: fast lookup of variants by product
-- =======================================================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ProductVariants_ProductId' AND object_id = OBJECT_ID('dbo.ProductVariants'))
BEGIN
    CREATE INDEX IX_ProductVariants_ProductId ON ProductVariants(product_id);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_VariantGroups_ProductId' AND object_id = OBJECT_ID('dbo.VariantGroups'))
BEGIN
    CREATE INDEX IX_VariantGroups_ProductId ON VariantGroups(product_id);
END;
GO

PRINT 'NexoraHub Variant Migration complete. Tables: VariantGroups, VariantOptions, ProductVariants, ProductVariantOptionMap, ProductVariantImages';
GO
