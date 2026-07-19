import { executeQuery, runInTransaction } from '../database/db';
import sql from 'mssql';
import {
  VariantGroup,
  VariantOption,
  ProductVariant,
  ProductVariantData,
  CreateProductWithVariantsPayload,
} from '../interfaces/catalog.interface';

export class VariantRepository {
  // ============================================================
  // READ — Fetch all variant data for a product
  // ============================================================

  /**
   * Returns groups + options + variant combinations for a product.
   * This is the primary read endpoint used by the product detail page.
   */
  async getVariantDataByProductId(productId: number): Promise<ProductVariantData> {
    // 1. Fetch groups
    const groupsResult = await executeQuery(
      `SELECT group_id, product_id, name, display_order
       FROM VariantGroups
       WHERE product_id = @productId
       ORDER BY display_order, group_id`,
      { productId: { type: sql.Int, value: productId } }
    );
    const groups: VariantGroup[] = groupsResult.recordset;

    // 2. Fetch all options for those groups
    if (groups.length === 0) {
      return { groups: [], variants: [] };
    }

    const groupIds = groups.map((g) => g.group_id).join(',');
    const optionsResult = await executeQuery(
      `SELECT option_id, group_id, value, display_order
       FROM VariantOptions
       WHERE group_id IN (${groupIds})
       ORDER BY display_order, option_id`,
      {}
    );

    // Attach options to groups
    const optionMap: Record<number, VariantOption[]> = {};
    for (const opt of optionsResult.recordset) {
      if (!optionMap[opt.group_id]) optionMap[opt.group_id] = [];
      optionMap[opt.group_id].push(opt);
    }
    for (const group of groups) {
      group.options = optionMap[group.group_id] || [];
    }

    // 3. Fetch variant combinations with their option mappings
    const variantsResult = await executeQuery(
      `SELECT pv.variant_id, pv.product_id, pv.sku, pv.price, pv.sale_price,
              pv.stock, pv.barcode, pv.weight_grams, pv.is_active,
              pv.created_at, pv.updated_at,
              vo.option_id, vo.value AS option_value, vo.display_order AS option_display_order,
              vg.group_id, vg.name AS group_name
       FROM ProductVariants pv
       JOIN ProductVariantOptionMap vom ON pv.variant_id = vom.variant_id
       JOIN VariantOptions vo          ON vom.option_id  = vo.option_id
       JOIN VariantGroups  vg          ON vo.group_id    = vg.group_id
       WHERE pv.product_id = @productId
       ORDER BY pv.variant_id, vg.display_order`,
      { productId: { type: sql.Int, value: productId } }
    );

    // Aggregate rows into variant objects
    const variantMap: Record<number, ProductVariant> = {};
    for (const row of variantsResult.recordset) {
      if (!variantMap[row.variant_id]) {
        variantMap[row.variant_id] = {
          variant_id: row.variant_id,
          product_id: row.product_id,
          sku: row.sku,
          price: row.price,
          sale_price: row.sale_price,
          stock: row.stock,
          barcode: row.barcode,
          weight_grams: row.weight_grams,
          is_active: row.is_active,
          created_at: row.created_at,
          updated_at: row.updated_at,
          options: [],
        };
      }
      variantMap[row.variant_id].options!.push({
        option_id: row.option_id,
        group_id: row.group_id,
        group_name: row.group_name,
        value: row.option_value,
        display_order: row.option_display_order,
      });
    }

    // Build combination_label for each variant
    const variants: ProductVariant[] = Object.values(variantMap).map((v) => ({
      ...v,
      combination_label: (v.options || [])
        .sort((a, b) => a.display_order - b.display_order)
        .map((o) => `${o.group_name}: ${o.value}`)
        .join(' | '),
    }));

    return { groups, variants };
  }

  /** Fetch a single variant by its ID */
  async getVariantById(variantId: number): Promise<ProductVariant | null> {
    const result = await executeQuery(
      `SELECT variant_id, product_id, sku, price, sale_price, stock, barcode,
              weight_grams, is_active, created_at, updated_at
       FROM ProductVariants WHERE variant_id = @variantId`,
      { variantId: { type: sql.Int, value: variantId } }
    );
    return result.recordset[0] || null;
  }

  // ============================================================
  // WRITE — Create product with variants (single transaction)
  // ============================================================

  /**
   * Creates variant groups, options, and all combination rows
   * inside an already-open transaction.
   * Call this from ProductRepository.create() when variant_groups are present.
   */
  async createVariantsInTransaction(
    transaction: sql.Transaction,
    productId: number,
    payload: CreateProductWithVariantsPayload
  ): Promise<void> {
    const { variant_groups, variants } = payload;

    // Build a lookup: { "Color": { "Red": option_id, "Blue": option_id } }
    const optionIdMap: Record<string, Record<string, number>> = {};

    for (let gi = 0; gi < variant_groups.length; gi++) {
      const group = variant_groups[gi];

      // Insert VariantGroup
      const groupResult = await transaction
        .request()
        .input('product_id', sql.Int, productId)
        .input('name', sql.NVarChar, group.name)
        .input('display_order', sql.Int, gi)
        .query(`
          INSERT INTO VariantGroups (product_id, name, display_order)
          OUTPUT inserted.group_id
          VALUES (@product_id, @name, @display_order)
        `);
      const groupId: number = groupResult.recordset[0].group_id;
      optionIdMap[group.name] = {};

      // Insert VariantOptions
      for (let oi = 0; oi < group.options.length; oi++) {
        const value = group.options[oi];
        const optResult = await transaction
          .request()
          .input('group_id', sql.Int, groupId)
          .input('value', sql.NVarChar, value)
          .input('display_order', sql.Int, oi)
          .query(`
            INSERT INTO VariantOptions (group_id, value, display_order)
            OUTPUT inserted.option_id
            VALUES (@group_id, @value, @display_order)
          `);
        optionIdMap[group.name][value] = optResult.recordset[0].option_id;
      }
    }

    // Insert each variant combination
    for (const variant of variants) {
      const variantResult = await transaction
        .request()
        .input('product_id', sql.Int, productId)
        .input('sku', sql.VarChar, variant.sku)
        .input('price', sql.Decimal(10, 2), variant.price ?? null)
        .input('stock', sql.Int, variant.stock)
        .input('barcode', sql.VarChar, variant.barcode || null)
        .input('weight_grams', sql.Int, variant.weight_grams || null)
        .query(`
          INSERT INTO ProductVariants (product_id, sku, price, stock, barcode, weight_grams)
          OUTPUT inserted.variant_id
          VALUES (@product_id, @sku, @price, @stock, @barcode, @weight_grams)
        `);
      const variantId: number = variantResult.recordset[0].variant_id;

      // Map options to this variant
      for (const combo of variant.combination) {
        const optionId = optionIdMap[combo.group_name]?.[combo.option_value];
        if (optionId !== undefined) {
          await transaction
            .request()
            .input('variant_id', sql.Int, variantId)
            .input('option_id', sql.Int, optionId)
            .query(`
              INSERT INTO ProductVariantOptionMap (variant_id, option_id)
              VALUES (@variant_id, @option_id)
            `);
        }
      }
    }
  }

  // ============================================================
  // UPDATE — Stock adjustment per variant
  // ============================================================

  async adjustVariantStock(
    variantId: number,
    delta: number
  ): Promise<{ new_stock: number }> {
    return runInTransaction(async (transaction) => {
      const getResult = await transaction
        .request()
        .input('variantId', sql.Int, variantId)
        .query(`SELECT variant_id, stock FROM ProductVariants WHERE variant_id = @variantId`);

      const variant = getResult.recordset[0];
      if (!variant) throw new Error('Variant not found');

      const newStock = variant.stock + delta;
      if (newStock < 0) throw new Error('Insufficient stock');

      await transaction
        .request()
        .input('newStock', sql.Int, newStock)
        .input('variantId', sql.Int, variantId)
        .query(`UPDATE ProductVariants SET stock = @newStock WHERE variant_id = @variantId`);

      return { new_stock: newStock };
    });
  }

  /**
   * Bulk update variant rows (SKU, price, stock) — used by the edit product flow
   */
  async updateVariant(
    variantId: number,
    data: Partial<{ sku: string; price: number | null; sale_price: number | null; stock: number; barcode: string | null; weight_grams: number | null; is_active: boolean }>
  ): Promise<void> {
    const updates: string[] = [];
    const request = (await import('../database/db')).executeQuery; // use pool directly below

    return runInTransaction(async (transaction) => {
      const req = transaction.request().input('variantId', sql.Int, variantId);

      if (data.sku !== undefined) { updates.push('sku = @sku'); req.input('sku', sql.VarChar, data.sku); }
      if (data.price !== undefined) { updates.push('price = @price'); req.input('price', sql.Decimal(10,2), data.price); }
      if (data.sale_price !== undefined) { updates.push('sale_price = @sale_price'); req.input('sale_price', sql.Decimal(10,2), data.sale_price); }
      if (data.stock !== undefined) { updates.push('stock = @stock'); req.input('stock', sql.Int, data.stock); }
      if (data.barcode !== undefined) { updates.push('barcode = @barcode'); req.input('barcode', sql.VarChar, data.barcode); }
      if (data.weight_grams !== undefined) { updates.push('weight_grams = @weight_grams'); req.input('weight_grams', sql.Int, data.weight_grams); }
      if (data.is_active !== undefined) { updates.push('is_active = @is_active'); req.input('is_active', sql.Bit, data.is_active ? 1 : 0); }

      if (updates.length > 0) {
        await req.query(`UPDATE ProductVariants SET ${updates.join(', ')} WHERE variant_id = @variantId`);
      }
    });
  }

  // ============================================================
  // DELETE — Remove all variant data for a product (cascade handled by FK)
  // ============================================================
  async deleteVariantsByProductId(productId: number): Promise<void> {
    // FK CASCADE handles VariantOptions → VariantGroups, ProductVariantOptionMap → ProductVariants
    await executeQuery(
      `DELETE FROM VariantGroups WHERE product_id = @productId`,
      { productId: { type: sql.Int, value: productId } }
    );
    await executeQuery(
      `DELETE FROM ProductVariants WHERE product_id = @productId`,
      { productId: { type: sql.Int, value: productId } }
    );
  }

  // ============================================================
  // INVENTORY — List all variants with stock (for admin inventory view)
  // ============================================================
  async getAllVariantInventory(
    page = 1,
    limit = 20,
    search?: string
  ): Promise<{ data: any[]; total: number }> {
    const offset = (page - 1) * limit;

    let where = `WHERE 1=1`;
    const params: any = {
      offset: { type: sql.Int, value: offset },
      limit:  { type: sql.Int, value: limit },
    };

    if (search) {
      where += ` AND (p.name LIKE @search OR pv.sku LIKE @search)`;
      params.search = { type: sql.NVarChar, value: `%${search}%` };
    }

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM ProductVariants pv
      JOIN Products p ON pv.product_id = p.product_id
      ${where}
    `;

    const dataQuery = `
      SELECT
        pv.variant_id,
        pv.product_id,
        p.name AS product_name,
        pv.sku,
        pv.price,
        pv.stock,
        pv.is_active,
        pv.updated_at,
        STRING_AGG(vg.name + ': ' + vo.value, ' | ')
          WITHIN GROUP (ORDER BY vg.display_order) AS combination_label
      FROM ProductVariants pv
      JOIN Products p ON pv.product_id = p.product_id
      LEFT JOIN ProductVariantOptionMap vom ON pv.variant_id = vom.variant_id
      LEFT JOIN VariantOptions vo ON vom.option_id = vo.option_id
      LEFT JOIN VariantGroups vg ON vo.group_id = vg.group_id
      ${where}
      GROUP BY pv.variant_id, pv.product_id, p.name, pv.sku, pv.price, pv.stock, pv.is_active, pv.updated_at
      ORDER BY pv.updated_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    const [countResult, dataResult] = await Promise.all([
      executeQuery(countQuery, params),
      executeQuery(dataQuery, params),
    ]);

    return {
      data: dataResult.recordset,
      total: countResult.recordset[0].total,
    };
  }
}
