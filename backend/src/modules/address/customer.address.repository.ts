import { executeQuery } from '../../database/db';
import sql from 'mssql';

export class CustomerAddressRepository {
  async findAllByUser(userId: number): Promise<any[]> {
    const query = `
      SELECT address_id, user_id, type, title, first_name, last_name, phone,
             street, city, state, postal_code, country, is_default, created_at, updated_at
      FROM Addresses
      WHERE user_id = @user_id
      ORDER BY is_default DESC, created_at DESC
    `;
    const result = await executeQuery(query, {
      user_id: { type: sql.Int, value: userId },
    });
    return result.recordset;
  }

  async findById(addressId: number, userId: number): Promise<any | null> {
    const query = `
      SELECT * FROM Addresses
      WHERE address_id = @address_id AND user_id = @user_id
    `;
    const result = await executeQuery(query, {
      address_id: { type: sql.Int, value: addressId },
      user_id: { type: sql.Int, value: userId },
    });
    return result.recordset[0] || null;
  }

  async countByUser(userId: number): Promise<number> {
    const result = await executeQuery(
      `SELECT COUNT(*) as cnt FROM Addresses WHERE user_id = @user_id`,
      { user_id: { type: sql.Int, value: userId } }
    );
    return result.recordset[0].cnt;
  }

  async create(userId: number, data: any): Promise<any> {
    const query = `
      INSERT INTO Addresses (user_id, type, title, first_name, last_name, phone, street, city, state, postal_code, country, is_default)
      OUTPUT inserted.*
      VALUES (@user_id, @type, @title, @first_name, @last_name, @phone, @street, @city, @state, @postal_code, @country, @is_default)
    `;
    const result = await executeQuery(query, {
      user_id: { type: sql.Int, value: userId },
      type: { type: sql.VarChar(20), value: data.type || 'Shipping' },
      title: { type: sql.NVarChar(50), value: data.title || null },
      first_name: { type: sql.NVarChar(100), value: data.first_name },
      last_name: { type: sql.NVarChar(100), value: data.last_name },
      phone: { type: sql.VarChar(20), value: data.phone },
      street: { type: sql.NVarChar(255), value: data.street },
      city: { type: sql.NVarChar(100), value: data.city },
      state: { type: sql.NVarChar(100), value: data.state },
      postal_code: { type: sql.VarChar(20), value: data.postal_code },
      country: { type: sql.NVarChar(100), value: data.country || 'India' },
      is_default: { type: sql.Bit, value: data.is_default ? 1 : 0 },
    });
    return result.recordset[0];
  }

  async update(addressId: number, userId: number, data: any): Promise<any | null> {
    const updates: string[] = [];
    const params: Record<string, { type: any; value: any }> = {
      address_id: { type: sql.Int, value: addressId },
      user_id: { type: sql.Int, value: userId },
    };

    const fields = ['type', 'title', 'first_name', 'last_name', 'phone', 'street', 'city', 'state', 'postal_code', 'country', 'is_default'];
    const types: Record<string, any> = {
      type: sql.VarChar(20), title: sql.NVarChar(50), first_name: sql.NVarChar(100),
      last_name: sql.NVarChar(100), phone: sql.VarChar(20), street: sql.NVarChar(255),
      city: sql.NVarChar(100), state: sql.NVarChar(100), postal_code: sql.VarChar(20),
      country: sql.NVarChar(100), is_default: sql.Bit,
    };

    for (const field of fields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = @${field}`);
        params[field] = {
          type: types[field],
          value: field === 'is_default' ? (data[field] ? 1 : 0) : (data[field] || null),
        };
      }
    }

    if (updates.length === 0) return this.findById(addressId, userId);

    const query = `
      UPDATE Addresses SET ${updates.join(', ')}, updated_at = GETDATE()
      OUTPUT inserted.*
      WHERE address_id = @address_id AND user_id = @user_id
    `;
    const result = await executeQuery(query, params);
    return result.recordset[0] || null;
  }

  async delete(addressId: number, userId: number): Promise<boolean> {
    const result = await executeQuery(
      `DELETE FROM Addresses WHERE address_id = @address_id AND user_id = @user_id`,
      {
        address_id: { type: sql.Int, value: addressId },
        user_id: { type: sql.Int, value: userId },
      }
    );
    return result.rowsAffected[0] > 0;
  }

  async setDefault(addressId: number, userId: number): Promise<void> {
    // Unset all defaults, then set this one
    await executeQuery(`UPDATE Addresses SET is_default = 0 WHERE user_id = @user_id`, {
      user_id: { type: sql.Int, value: userId },
    });
    await executeQuery(`UPDATE Addresses SET is_default = 1 WHERE address_id = @address_id AND user_id = @user_id`, {
      address_id: { type: sql.Int, value: addressId },
      user_id: { type: sql.Int, value: userId },
    });
  }
}
