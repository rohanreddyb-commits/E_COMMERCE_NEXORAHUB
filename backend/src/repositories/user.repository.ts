import { executeQuery, runInTransaction } from '../database/db';
import sql from 'mssql';
import { User, Role, SafeUser } from '../interfaces/user.interface';

/**
 * Explicit projection used wherever a user record may reach an HTTP response.
 * Never widen this to `*` — `password_hash` must not leave the repository
 * except through findByEmail/findById, which exist solely to feed bcrypt.
 */
const SAFE_USER_PROJECTION = `user_id, first_name, last_name, email, phone, status, last_login, created_at, updated_at`;

const SAFE_USER_OUTPUT = SAFE_USER_PROJECTION.split(', ')
  .map((column) => `inserted.${column}`)
  .join(', ');

export class UserRepository {
  /**
   * Returns the full row INCLUDING password_hash — for credential
   * verification only. Never pass the result to a response serializer;
   * use findSafeById or toSafeUser() at the boundary.
   */
  async findByEmail(email: string): Promise<User | null> {
    const query = `SELECT * FROM Users WHERE email = @email`;
    const result = await executeQuery(query, {
      email: { type: sql.NVarChar, value: email },
    });
    return result.recordset[0] || null;
  }

  /** As findByEmail — includes password_hash. Internal use only. */
  async findById(userId: number): Promise<User | null> {
    const query = `SELECT * FROM Users WHERE user_id = @user_id`;
    const result = await executeQuery(query, {
      user_id: { type: sql.Int, value: userId },
    });
    return result.recordset[0] || null;
  }

  /** Credential-free projection, safe to return from a controller. */
  async findSafeById(userId: number): Promise<SafeUser | null> {
    const query = `SELECT ${SAFE_USER_PROJECTION} FROM Users WHERE user_id = @user_id`;
    const result = await executeQuery(query, {
      user_id: { type: sql.Int, value: userId },
    });
    return result.recordset[0] || null;
  }

  /**
   * `roleId` is resolved by the caller from a trusted source — never from a
   * request body. See AuthService.register (always Customer) and
   * UserController.createUser (Super Admin only, validated against Roles).
   */
  async createUser(userData: Partial<User>, roleId: number): Promise<SafeUser> {
    return runInTransaction(async (transaction) => {
      const insertUserQuery = `
        INSERT INTO Users (first_name, last_name, email, password_hash, phone, status)
        OUTPUT ${SAFE_USER_OUTPUT}
        VALUES (@first_name, @last_name, @email, @password_hash, @phone, @status)
      `;
      const request = transaction.request();
      request.input('first_name', sql.NVarChar, userData.first_name);
      request.input('last_name', sql.NVarChar, userData.last_name);
      request.input('email', sql.NVarChar, userData.email);
      request.input('password_hash', sql.VarChar, userData.password_hash);
      request.input('phone', sql.VarChar, userData.phone || null);
      request.input('status', sql.VarChar, userData.status || 'Active');

      const userResult = await request.query(insertUserQuery);
      const newUser = userResult.recordset[0];

      const insertRoleQuery = `
        INSERT INTO UserRoles (user_id, role_id)
        VALUES (@user_id, @role_id)
      `;
      const roleRequest = transaction.request();
      roleRequest.input('user_id', sql.Int, newUser.user_id);
      roleRequest.input('role_id', sql.Int, roleId);
      await roleRequest.query(insertRoleQuery);

      return newUser;
    });
  }

  async getUserRoles(userId: number): Promise<Role[]> {
    const query = `
      SELECT r.* 
      FROM Roles r
      INNER JOIN UserRoles ur ON r.role_id = ur.role_id
      WHERE ur.user_id = @user_id
    `;
    const result = await executeQuery(query, {
      user_id: { type: sql.Int, value: userId },
    });
    return result.recordset;
  }

  /** Resolve a role by name so callers never hardcode IDENTITY values. */
  async findRoleByName(name: string): Promise<Role | null> {
    const result = await executeQuery(`SELECT * FROM Roles WHERE name = @name`, {
      name: { type: sql.VarChar(50), value: name },
    });
    return result.recordset[0] || null;
  }

  /** Used to validate an operator-supplied role_id against the Roles table. */
  async findRoleById(roleId: number): Promise<Role | null> {
    const result = await executeQuery(`SELECT * FROM Roles WHERE role_id = @role_id`, {
      role_id: { type: sql.Int, value: roleId },
    });
    return result.recordset[0] || null;
  }

  async getUserPermissions(userId: number): Promise<string[]> {
    const query = `
      SELECT p.name 
      FROM Permissions p
      INNER JOIN RolePermissions rp ON p.permission_id = rp.permission_id
      INNER JOIN UserRoles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = @user_id
    `;
    const result = await executeQuery(query, {
      user_id: { type: sql.Int, value: userId },
    });
    return result.recordset.map((record) => record.name);
  }

  async updateLastLogin(userId: number): Promise<void> {
    const query = `UPDATE Users SET last_login = GETDATE() WHERE user_id = @user_id`;
    await executeQuery(query, {
      user_id: { type: sql.Int, value: userId },
    });
  }

  async getAllUsers(page = 1, limit = 10, search?: string): Promise<{ data: any[]; total: number }> {
    const offset = (page - 1) * limit;
    
    let countQuery = `SELECT COUNT(*) as total FROM Users`;
    let dataQuery = `
      SELECT u.user_id, u.first_name, u.last_name, u.email, u.phone, u.status, u.created_at, u.last_login,
             r.name as role_name, r.role_id
      FROM Users u
      LEFT JOIN UserRoles ur ON u.user_id = ur.user_id
      LEFT JOIN Roles r ON ur.role_id = r.role_id
    `;
    
    const params: any = {
      offset: { type: sql.Int, value: offset },
      limit: { type: sql.Int, value: limit }
    };

    if (search) {
      countQuery += ` WHERE first_name LIKE @search OR last_name LIKE @search OR email LIKE @search`;
      dataQuery += ` WHERE first_name LIKE @search OR last_name LIKE @search OR email LIKE @search`;
      params.search = { type: sql.NVarChar, value: `%${search}%` };
    }

    dataQuery += ` ORDER BY u.created_at DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;

    const [countResult, dataResult] = await Promise.all([
      executeQuery(countQuery, params),
      executeQuery(dataQuery, params)
    ]);

    return {
      data: dataResult.recordset,
      total: countResult.recordset[0].total
    };
  }

  async updateUserRole(userId: number, roleId: number): Promise<boolean> {
    return runInTransaction(async (transaction) => {
      // Delete existing role
      const deleteQuery = `DELETE FROM UserRoles WHERE user_id = @userId`;
      await transaction.request()
        .input('userId', sql.Int, userId)
        .query(deleteQuery);
      
      // Insert new role
      const insertQuery = `INSERT INTO UserRoles (user_id, role_id) VALUES (@userId, @roleId)`;
      await transaction.request()
        .input('userId', sql.Int, userId)
        .input('roleId', sql.Int, roleId)
        .query(insertQuery);
        
      return true;
    });
  }
}
