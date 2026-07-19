import { executeQuery, runInTransaction } from '../database/db';
import sql from 'mssql';
import { Inventory, InventoryHistory } from '../interfaces/inventory.interface';

export class InventoryRepository {
  async getInventory(page = 1, limit = 10, search?: string): Promise<{ data: any[]; total: number }> {
    const offset = (page - 1) * limit;
    
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM Inventory i
      JOIN Products p ON i.product_id = p.product_id
    `;
    let dataQuery = `
      SELECT i.*, p.name as product_name, p.sku 
      FROM Inventory i
      JOIN Products p ON i.product_id = p.product_id
    `;
    
    const params: any = {
      offset: { type: sql.Int, value: offset },
      limit: { type: sql.Int, value: limit }
    };

    if (search) {
      countQuery += ` WHERE p.name LIKE @search OR p.sku LIKE @search`;
      dataQuery += ` WHERE p.name LIKE @search OR p.sku LIKE @search`;
      params.search = { type: sql.NVarChar, value: `%${search}%` };
    }

    dataQuery += ` ORDER BY i.updated_at DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;

    const [countResult, dataResult] = await Promise.all([
      executeQuery(countQuery, params),
      executeQuery(dataQuery, params)
    ]);

    return {
      data: dataResult.recordset,
      total: countResult.recordset[0].total
    };
  }

  async adjustInventory(
    productId: number,
    changeAmount: number,
    reason: string,
    notes?: string,
    userId?: number
  ): Promise<boolean> {
    return runInTransaction(async (transaction) => {
      // 1. Get current inventory
      const getQuery = `SELECT inventory_id, quantity FROM Inventory WHERE product_id = @productId`;
      const invResult = await transaction.request()
        .input('productId', sql.Int, productId)
        .query(getQuery);
      
      const inventory = invResult.recordset[0];
      if (!inventory) throw new Error('Inventory record not found for product');

      const newQuantity = inventory.quantity + changeAmount;
      if (newQuantity < 0) throw new Error('Insufficient inventory quantity');

      // 2. Update inventory
      const updateQuery = `
        UPDATE Inventory 
        SET quantity = @newQuantity, updated_at = GETDATE()
        WHERE inventory_id = @inventoryId
      `;
      await transaction.request()
        .input('newQuantity', sql.Int, newQuantity)
        .input('inventoryId', sql.Int, inventory.inventory_id)
        .query(updateQuery);

      // 3. Record history
      const historyQuery = `
        INSERT INTO InventoryHistory (product_id, user_id, adjustment, reason, remarks)
        VALUES (@productId, @userId, @adjustment, @reason, @remarks)
      `;
      const request = transaction.request()
        .input('productId', sql.Int, productId)
        .input('userId', sql.Int, userId || null)
        .input('adjustment', sql.Int, changeAmount)
        .input('reason', sql.VarChar, reason)
        .input('remarks', sql.NVarChar, notes || null);

      await request.query(historyQuery);
      
      // 4. Update Product Stock Quantity to stay in sync
      const updateProductQuery = `
        UPDATE Products
        SET stock_quantity = @newQuantity
        WHERE product_id = @productId
      `;
      await transaction.request()
        .input('newQuantity', sql.Int, newQuantity)
        .input('productId', sql.Int, productId)
        .query(updateProductQuery);

      return true;
    });
  }

  async getInventoryHistory(productId: number): Promise<any[]> {
    const query = `
      SELECT h.history_id, h.product_id, h.user_id, h.adjustment AS change_amount, h.reason, h.remarks AS notes, h.created_at,
             u.first_name + ' ' + u.last_name AS staff_name
      FROM InventoryHistory h
      LEFT JOIN Users u ON h.user_id = u.user_id
      WHERE h.product_id = @productId
      ORDER BY h.created_at DESC
    `;
    const result = await executeQuery(query, {
      productId: { type: sql.Int, value: productId }
    });
    return result.recordset;
  }
}
