import sql from "mssql";
import { executeQuery } from "../database/db";

export interface CouponDB {
  coupon_id: number;
  code: string;
  discount_type: "Percentage" | "Fixed";
  discount_value: number;
  min_order_amount: number;
  expiry_date: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export class CouponRepository {
  static async createCoupon(
    code: string,
    discountType: "Percentage" | "Fixed",
    discountValue: number,
    minOrderAmount: number,
    expiryDate: Date,
    isActive: boolean = true
  ): Promise<number> {
    const query = `
      INSERT INTO Coupons (code, discount_type, discount_value, min_order_amount, expiry_date, is_active, created_at, updated_at)
      OUTPUT INSERTED.coupon_id
      VALUES (@code, @discountType, @discountValue, @minOrderAmount, @expiryDate, @isActive, GETDATE(), GETDATE());
    `;

    const result = await executeQuery(query, {
      code: { type: sql.VarChar(), value: code },
      discountType: { type: sql.VarChar(), value: discountType },
      discountValue: { type: sql.Decimal(10, 2), value: discountValue },
      minOrderAmount: { type: sql.Decimal(10, 2), value: minOrderAmount },
      expiryDate: { type: sql.DateTime(), value: expiryDate },
      isActive: { type: sql.Bit(), value: isActive ? 1 : 0 },
    });

    return result.recordset[0].coupon_id;
  }

  static async getCouponByCode(code: string): Promise<CouponDB | null> {
    const query = `
      SELECT coupon_id, code, discount_type, discount_value, min_order_amount, expiry_date, is_active, created_at, updated_at
      FROM Coupons
      WHERE code = @code;
    `;

    const result = await executeQuery(query, {
      code: { type: sql.VarChar(), value: code },
    });

    if (result.recordset.length === 0) {
      return null;
    }
    return result.recordset[0] as CouponDB;
  }

  static async getCouponById(couponId: number): Promise<CouponDB | null> {
    const query = `
      SELECT coupon_id, code, discount_type, discount_value, min_order_amount, expiry_date, is_active, created_at, updated_at
      FROM Coupons
      WHERE coupon_id = @couponId;
    `;

    const result = await executeQuery(query, {
      couponId: { type: sql.Int(), value: couponId },
    });

    if (result.recordset.length === 0) {
      return null;
    }
    return result.recordset[0] as CouponDB;
  }

  static async getAllCoupons(): Promise<CouponDB[]> {
    const query = `
      SELECT coupon_id, code, discount_type, discount_value, min_order_amount, expiry_date, is_active, created_at, updated_at
      FROM Coupons
      ORDER BY coupon_id DESC;
    `;

    const result = await executeQuery(query);
    return result.recordset as CouponDB[];
  }

  static async updateCoupon(
    couponId: number,
    code: string,
    discountType: "Percentage" | "Fixed",
    discountValue: number,
    minOrderAmount: number,
    expiryDate: Date,
    isActive: boolean
  ): Promise<boolean> {
    const query = `
      UPDATE Coupons
      SET code = @code, discount_type = @discountType, discount_value = @discountValue,
          min_order_amount = @minOrderAmount, expiry_date = @expiryDate, is_active = @isActive, updated_at = GETDATE()
      WHERE coupon_id = @couponId;
    `;

    const result = await executeQuery(query, {
      couponId: { type: sql.Int(), value: couponId },
      code: { type: sql.VarChar(), value: code },
      discountType: { type: sql.VarChar(), value: discountType },
      discountValue: { type: sql.Decimal(10, 2), value: discountValue },
      minOrderAmount: { type: sql.Decimal(10, 2), value: minOrderAmount },
      expiryDate: { type: sql.DateTime(), value: expiryDate },
      isActive: { type: sql.Bit(), value: isActive ? 1 : 0 },
    });

    return result.rowsAffected[0] > 0;
  }

  static async deleteCoupon(couponId: number): Promise<boolean> {
    const query = "DELETE FROM Coupons WHERE coupon_id = @couponId;";
    const result = await executeQuery(query, {
      couponId: { type: sql.Int(), value: couponId },
    });

    return result.rowsAffected[0] > 0;
  }
}
