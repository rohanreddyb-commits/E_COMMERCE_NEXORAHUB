import sql from "mssql";
import { executeQuery } from "../database/db";

export interface AddressDB {
  address_id: number;
  user_id: number;
  title: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  created_at: Date;
  updated_at: Date;
}

export class AddressRepository {
  static async createAddress(
    userId: number,
    title: string,
    street: string,
    city: string,
    state: string,
    postalCode: string,
    country: string,
    phone: string
  ): Promise<number> {
    const query = `
      INSERT INTO Addresses (user_id, title, street, city, state, postal_code, country, phone, created_at, updated_at)
      OUTPUT INSERTED.address_id
      VALUES (@userId, @title, @street, @city, @state, @postalCode, @country, @phone, GETDATE(), GETDATE());
    `;

    const result = await executeQuery(query, {
      userId: { type: sql.Int(), value: userId },
      title: { type: sql.NVarChar(), value: title },
      street: { type: sql.NVarChar(), value: street },
      city: { type: sql.NVarChar(), value: city },
      state: { type: sql.NVarChar(), value: state },
      postalCode: { type: sql.VarChar(), value: postalCode },
      country: { type: sql.NVarChar(), value: country },
      phone: { type: sql.VarChar(), value: phone },
    });

    return result.recordset[0].address_id;
  }

  static async getAddressesByUser(userId: number): Promise<AddressDB[]> {
    const query = `
      SELECT address_id, user_id, title, street, city, state, postal_code, country, phone, created_at, updated_at
      FROM Addresses
      WHERE user_id = @userId
      ORDER BY address_id DESC;
    `;

    const result = await executeQuery(query, {
      userId: { type: sql.Int(), value: userId },
    });

    return result.recordset as AddressDB[];
  }

  static async getAddressById(addressId: number): Promise<AddressDB | null> {
    const query = `
      SELECT address_id, user_id, title, street, city, state, postal_code, country, phone, created_at, updated_at
      FROM Addresses
      WHERE address_id = @addressId;
    `;

    const result = await executeQuery(query, {
      addressId: { type: sql.Int(), value: addressId },
    });

    if (result.recordset.length === 0) {
      return null;
    }
    return result.recordset[0] as AddressDB;
  }

  static async updateAddress(
    addressId: number,
    title: string,
    street: string,
    city: string,
    state: string,
    postalCode: string,
    country: string,
    phone: string
  ): Promise<boolean> {
    const query = `
      UPDATE Addresses
      SET title = @title, street = @street, city = @city, state = @state,
          postal_code = @postalCode, country = @country, phone = @phone, updated_at = GETDATE()
      WHERE address_id = @addressId;
    `;

    const result = await executeQuery(query, {
      addressId: { type: sql.Int(), value: addressId },
      title: { type: sql.NVarChar(), value: title },
      street: { type: sql.NVarChar(), value: street },
      city: { type: sql.NVarChar(), value: city },
      state: { type: sql.NVarChar(), value: state },
      postalCode: { type: sql.VarChar(), value: postalCode },
      country: { type: sql.NVarChar(), value: country },
      phone: { type: sql.VarChar(), value: phone },
    });

    return result.rowsAffected[0] > 0;
  }

  static async deleteAddress(addressId: number): Promise<boolean> {
    const query = "DELETE FROM Addresses WHERE address_id = @addressId;";
    const result = await executeQuery(query, {
      addressId: { type: sql.Int(), value: addressId },
    });

    return result.rowsAffected[0] > 0;
  }
}
