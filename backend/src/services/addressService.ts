import { AddressRepository, AddressDB } from "../repositories/addressRepository";
import { NotFoundError, ForbiddenError, BadRequestError } from "../utils/customError";

export class AddressService {
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
    return AddressRepository.createAddress(userId, title, street, city, state, postalCode, country, phone);
  }

  static async getAddresses(userId: number): Promise<AddressDB[]> {
    return AddressRepository.getAddressesByUser(userId);
  }

  static async getAddressById(addressId: number, userId: number): Promise<AddressDB> {
    const address = await AddressRepository.getAddressById(addressId);
    if (!address) {
      throw new NotFoundError("Address not found.");
    }

    if (address.user_id !== userId) {
      throw new ForbiddenError("Access denied. You do not own this address.");
    }

    return address;
  }

  static async updateAddress(
    addressId: number,
    userId: number,
    title: string,
    street: string,
    city: string,
    state: string,
    postalCode: string,
    country: string,
    phone: string
  ): Promise<void> {
    await this.getAddressById(addressId, userId); // Ownership check

    const success = await AddressRepository.updateAddress(
      addressId,
      title,
      street,
      city,
      state,
      postalCode,
      country,
      phone
    );

    if (!success) {
      throw new BadRequestError("Failed to update address.");
    }
  }

  static async deleteAddress(addressId: number, userId: number): Promise<void> {
    await this.getAddressById(addressId, userId); // Ownership check

    const success = await AddressRepository.deleteAddress(addressId);
    if (!success) {
      throw new BadRequestError("Failed to delete address.");
    }
  }
}
