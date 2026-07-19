export interface Brand {
  brand_id: number;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  website_url?: string;
  status: 'Active' | 'Inactive';
  is_featured: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Category {
  category_id: number;
  parent_id?: number;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  status: 'Active' | 'Inactive';
  created_at: Date;
  updated_at: Date;
}

export interface Product {
  product_id: number;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  brand_id?: number | null;
  category_id: number;
  price: number;
  sale_price?: number;
  sku: string;
  barcode?: string;
  status: 'Active' | 'Draft' | 'Archived';
  is_featured: boolean;
  meta_title?: string;
  meta_description?: string;
  stock_quantity?: number;
  created_at: Date;
  updated_at: Date;
}

export interface ProductImage {
  image_id: number;
  product_id: number;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
}

// ============================================================
// Variant System Interfaces
// ============================================================

export interface VariantGroup {
  group_id: number;
  product_id: number;
  name: string;              // e.g., "Color", "Size", "Storage"
  display_order: number;
  options?: VariantOption[]; // populated on fetch
}

export interface VariantOption {
  option_id: number;
  group_id: number;
  value: string;             // e.g., "Red", "XL", "256 GB"
  display_order: number;
}

export interface ProductVariant {
  variant_id: number;
  product_id: number;
  sku: string;
  price: number | null;      // null = inherit base product price
  sale_price: number | null;
  stock: number;
  barcode: string | null;
  weight_grams: number | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  options?: VariantOptionWithGroup[]; // populated on fetch
  combination_label?: string;         // e.g., "Color: Red | Size: XL"
}

export interface VariantOptionWithGroup extends VariantOption {
  group_name: string;
}

export interface ProductVariantImage {
  variant_image_id: number;
  variant_id: number;
  image_url: string;
}

/** Full variant data for a product — used by the product detail page */
export interface ProductVariantData {
  groups: VariantGroup[];
  variants: ProductVariant[];
}

/** Payload for creating a full product with variants in one API call */
export interface CreateProductWithVariantsPayload {
  // Base product fields
  name: string;
  description?: string;
  short_description?: string;
  price: number;
  sku: string;
  barcode?: string;
  brand_id?: number | null;
  category_id: number;
  status: 'Active' | 'Draft' | 'Archived';
  is_featured?: boolean;
  meta_title?: string;
  meta_description?: string;
  // Variant groups (may be empty for simple products)
  variant_groups: {
    name: string;
    options: string[];
  }[];
  // One entry per generated combination
  variants: {
    combination: { group_name: string; option_value: string }[];
    sku: string;
    price: number | null;
    stock: number;
    barcode?: string;
    weight_grams?: number;
  }[];
}
