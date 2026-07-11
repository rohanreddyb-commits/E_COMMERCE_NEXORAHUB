import { Response, NextFunction } from "express";
import { AddressService } from "../services/addressService";
import { AuthenticatedRequest } from "../middleware/auth";
import { BadRequestError } from "../utils/customError";

export class AddressController {
  static async createAddress(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { title, street, city, state, postalCode, country, phone } = req.body;

      const addressId = await AddressService.createAddress(
        userId,
        title,
        street,
        city,
        state,
        postalCode,
        country,
        phone
      );

      res.status(201).json({
        success: true,
        message: "Address created successfully.",
        addressId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAddresses(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const addresses = await AddressService.getAddresses(userId);

      res.status(200).json({
        success: true,
        addresses,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAddress(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const addressId = parseInt(req.params.id, 10);
      if (isNaN(addressId)) {
        throw new BadRequestError("Invalid address ID.");
      }

      const address = await AddressService.getAddressById(addressId, userId);

      res.status(200).json({
        success: true,
        address,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateAddress(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const addressId = parseInt(req.params.id, 10);
      if (isNaN(addressId)) {
        throw new BadRequestError("Invalid address ID.");
      }

      const { title, street, city, state, postalCode, country, phone } = req.body;

      await AddressService.updateAddress(
        addressId,
        userId,
        title,
        street,
        city,
        state,
        postalCode,
        country,
        phone
      );

      res.status(200).json({
        success: true,
        message: "Address updated successfully.",
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteAddress(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const addressId = parseInt(req.params.id, 10);
      if (isNaN(addressId)) {
        throw new BadRequestError("Invalid address ID.");
      }

      await AddressService.deleteAddress(addressId, userId);

      res.status(200).json({
        success: true,
        message: "Address deleted successfully.",
      });
    } catch (err) {
      next(err);
    }
  }
}
