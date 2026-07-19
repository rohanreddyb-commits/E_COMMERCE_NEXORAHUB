import { CustomerAddressRepository } from './customer.address.repository';
import { ApiError } from '../../utils/ApiError';
import { MAX_ADDRESSES } from '../../core/constants/customer.constants';

export class CustomerAddressService {
  private readonly repo: CustomerAddressRepository;
  constructor() { this.repo = new CustomerAddressRepository(); }

  async getAddresses(userId: number) {
    return this.repo.findAllByUser(userId);
  }

  async getAddress(addressId: number, userId: number) {
    const address = await this.repo.findById(addressId, userId);
    if (!address) throw new ApiError(404, 'Address not found.');
    return address;
  }

  async createAddress(userId: number, data: any) {
    const count = await this.repo.countByUser(userId);
    if (count >= MAX_ADDRESSES) {
      throw new ApiError(400, `You can save a maximum of ${MAX_ADDRESSES} addresses.`);
    }
    return this.repo.create(userId, data);
  }

  async updateAddress(addressId: number, userId: number, data: any) {
    const existing = await this.repo.findById(addressId, userId);
    if (!existing) throw new ApiError(404, 'Address not found.');
    const updated = await this.repo.update(addressId, userId, data);
    if (!updated) throw new ApiError(404, 'Address not found.');
    return updated;
  }

  async deleteAddress(addressId: number, userId: number): Promise<void> {
    const existing = await this.repo.findById(addressId, userId);
    if (!existing) throw new ApiError(404, 'Address not found.');
    await this.repo.delete(addressId, userId);
  }

  async setDefault(addressId: number, userId: number): Promise<void> {
    const existing = await this.repo.findById(addressId, userId);
    if (!existing) throw new ApiError(404, 'Address not found.');
    await this.repo.setDefault(addressId, userId);
  }
}
