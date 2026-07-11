import sql from "mssql";
import { executeQuery } from "../database/db";

export interface UserDB {
  user_id: number;
  name: string;
  email: string;
  password_hash: string;
  role_id: number;
  created_at: Date;
  updated_at: Date;
}

export class UserRepository {
  static async createUser(
    name: string,
    email: string,
    passwordHash: string,
    roleId: number = 2 // Customer is default
  ): Promise<number> {
    const query = `
      INSERT INTO Users (name, email, password_hash, role_id, created_at, updated_at)
      OUTPUT INSERTED.user_id
      VALUES (@name, @email, @passwordHash, @roleId, GETDATE(), GETDATE());
    `;

    const result = await executeQuery(query, {
      name: { type: sql.NVarChar(), value: name },
      email: { type: sql.NVarChar(), value: email },
      passwordHash: { type: sql.VarChar(), value: passwordHash },
      roleId: { type: sql.Int(), value: roleId },
    });

    return result.recordset[0].user_id;
  }

  static async getUserByEmail(email: string): Promise<UserDB | null> {
    const query = `
      SELECT user_id, name, email, password_hash, role_id, created_at, updated_at 
      FROM Users 
      WHERE email = @email;
    `;

    const result = await executeQuery(query, {
      email: { type: sql.NVarChar(), value: email },
    });

    if (result.recordset.length === 0) {
      return null;
    }

    return result.recordset[0] as UserDB;
  }

  static async getUserById(userId: number): Promise<UserDB | null> {
    const query = `
      SELECT user_id, name, email, role_id, created_at, updated_at 
      FROM Users 
      WHERE user_id = @userId;
    `;

    const result = await executeQuery(query, {
      userId: { type: sql.Int(), value: userId },
    });

    if (result.recordset.length === 0) {
      return null;
    }

    return result.recordset[0] as UserDB;
  }
}
