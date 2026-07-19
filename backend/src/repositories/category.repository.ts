import { executeQuery } from '../database/db';
import sql from 'mssql';
import { Category } from '../interfaces/catalog.interface';

export class CategoryRepository {
  async findAll(): Promise<Category[]> {
    const query = `SELECT * FROM Categories ORDER BY name ASC`;
    const result = await executeQuery(query);
    return result.recordset;
  }

  async findById(id: number): Promise<Category | null> {
    const query = `SELECT * FROM Categories WHERE category_id = @id`;
    const result = await executeQuery(query, {
      id: { type: sql.Int, value: id },
    });
    return result.recordset[0] || null;
  }

  async create(data: Partial<Category>): Promise<Category> {
    const query = `
      INSERT INTO Categories (parent_id, name, slug, description, image_url, status)
      OUTPUT inserted.*
      VALUES (@parent_id, @name, @slug, @description, @image_url, @status)
    `;
    const result = await executeQuery(query, {
      parent_id: { type: sql.Int, value: data.parent_id || null },
      name: { type: sql.NVarChar, value: data.name },
      slug: { type: sql.VarChar, value: data.slug },
      description: { type: sql.NVarChar, value: data.description || null },
      image_url: { type: sql.NVarChar, value: data.image_url || null },
      status: { type: sql.VarChar, value: data.status || 'Active' },
    });
    return result.recordset[0];
  }

  async update(id: number, data: Partial<Category>): Promise<Category | null> {
    const query = `
      UPDATE Categories SET 
        parent_id = @parent_id, name = @name, slug = @slug, 
        description = @description, image_url = @image_url, status = @status
      OUTPUT inserted.*
      WHERE category_id = @id
    `;
    const result = await executeQuery(query, {
      id: { type: sql.Int, value: id },
      parent_id: { type: sql.Int, value: data.parent_id || null },
      name: { type: sql.NVarChar, value: data.name },
      slug: { type: sql.VarChar, value: data.slug },
      description: { type: sql.NVarChar, value: data.description || null },
      image_url: { type: sql.NVarChar, value: data.image_url || null },
      status: { type: sql.VarChar, value: data.status },
    });
    return result.recordset[0] || null;
  }

  async delete(id: number): Promise<boolean> {
    const query = `DELETE FROM Categories WHERE category_id = @id`;
    const result = await executeQuery(query, {
      id: { type: sql.Int, value: id },
    });
    return result.rowsAffected[0] > 0;
  }
}
