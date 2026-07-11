import sql from "mssql";
import { executeQuery } from "../database/db";

export interface CategoryDB {
  category_id: number;
  name: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export class CategoryRepository {
  static async createCategory(name: string, description?: string): Promise<number> {
    const query = `
      INSERT INTO Categories (name, description, created_at, updated_at)
      OUTPUT INSERTED.category_id
      VALUES (@name, @description, GETDATE(), GETDATE());
    `;

    const result = await executeQuery(query, {
      name: { type: sql.NVarChar(), value: name },
      description: { type: sql.NVarChar(), value: description || null },
    });

    return result.recordset[0].category_id;
  }

  static async getAllCategories(): Promise<CategoryDB[]> {
    const query = "SELECT category_id, name, description, created_at, updated_at FROM Categories ORDER BY name ASC;";
    const result = await executeQuery(query);
    return result.recordset as CategoryDB[];
  }

  static async getCategoryById(categoryId: number): Promise<CategoryDB | null> {
    const query = "SELECT category_id, name, description, created_at, updated_at FROM Categories WHERE category_id = @categoryId;";
    const result = await executeQuery(query, {
      categoryId: { type: sql.Int(), value: categoryId },
    });

    if (result.recordset.length === 0) {
      return null;
    }
    return result.recordset[0] as CategoryDB;
  }

  static async updateCategory(categoryId: number, name: string, description?: string): Promise<boolean> {
    const query = `
      UPDATE Categories
      SET name = @name, description = @description, updated_at = GETDATE()
      WHERE category_id = @categoryId;
    `;

    const result = await executeQuery(query, {
      categoryId: { type: sql.Int(), value: categoryId },
      name: { type: sql.NVarChar(), value: name },
      description: { type: sql.NVarChar(), value: description || null },
    });

    return result.rowsAffected[0] > 0;
  }

  static async deleteCategory(categoryId: number): Promise<boolean> {
    const query = "DELETE FROM Categories WHERE category_id = @categoryId;";
    const result = await executeQuery(query, {
      categoryId: { type: sql.Int(), value: categoryId },
    });

    return result.rowsAffected[0] > 0;
  }
}
