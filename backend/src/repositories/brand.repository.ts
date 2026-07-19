import { executeQuery } from '../database/db';
import sql from 'mssql';
import { Brand } from '../interfaces/catalog.interface';

export class BrandRepository {
  async findAll(): Promise<Brand[]> {
    const query = `SELECT * FROM Brands ORDER BY name ASC`;
    const result = await executeQuery(query);
    return result.recordset;
  }

  async findById(id: number): Promise<Brand | null> {
    const query = `SELECT * FROM Brands WHERE brand_id = @id`;
    const result = await executeQuery(query, {
      id: { type: sql.Int, value: id },
    });
    return result.recordset[0] || null;
  }

  async create(data: Partial<Brand>): Promise<Brand> {
    const query = `
      INSERT INTO Brands (name, slug, description, logo_url, website_url, status, is_featured)
      OUTPUT inserted.*
      VALUES (@name, @slug, @description, @logo_url, @website_url, @status, @is_featured)
    `;
    const result = await executeQuery(query, {
      name: { type: sql.NVarChar, value: data.name },
      slug: { type: sql.VarChar, value: data.slug },
      description: { type: sql.NVarChar, value: data.description || null },
      logo_url: { type: sql.NVarChar, value: data.logo_url || null },
      website_url: { type: sql.NVarChar, value: data.website_url || null },
      status: { type: sql.VarChar, value: data.status || 'Active' },
      is_featured: { type: sql.Bit, value: data.is_featured ? 1 : 0 },
    });
    return result.recordset[0];
  }

  async update(id: number, data: Partial<Brand>): Promise<Brand | null> {
    const query = `
      UPDATE Brands SET 
        name = @name, slug = @slug, description = @description, 
        logo_url = @logo_url, website_url = @website_url, 
        status = @status, is_featured = @is_featured
      OUTPUT inserted.*
      WHERE brand_id = @id
    `;
    const result = await executeQuery(query, {
      id: { type: sql.Int, value: id },
      name: { type: sql.NVarChar, value: data.name },
      slug: { type: sql.VarChar, value: data.slug },
      description: { type: sql.NVarChar, value: data.description || null },
      logo_url: { type: sql.NVarChar, value: data.logo_url || null },
      website_url: { type: sql.NVarChar, value: data.website_url || null },
      status: { type: sql.VarChar, value: data.status },
      is_featured: { type: sql.Bit, value: data.is_featured ? 1 : 0 },
    });
    return result.recordset[0] || null;
  }

  async delete(id: number): Promise<boolean> {
    const query = `DELETE FROM Brands WHERE brand_id = @id`;
    const result = await executeQuery(query, {
      id: { type: sql.Int, value: id },
    });
    return result.rowsAffected[0] > 0;
  }
}
