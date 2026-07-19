import { WishlistRepository } from './wishlist.repository';
import { ApiError } from '../../utils/ApiError';
import { MAX_WISHLIST_ITEMS } from '../../core/constants/customer.constants';
import { cacheService } from '../../common/cache/cache.factory';
import { CACHE_KEYS, CACHE_TTL } from '../../core/constants/customer.constants';

export class WishlistService {
  private readonly repo: WishlistRepository;
  constructor() { this.repo = new WishlistRepository(); }

  async getWishlist(userId: number) {
    const cached = await cacheService.get<any[]>(CACHE_KEYS.CUSTOMER_WISHLIST(userId));
    if (cached) return cached;

    const items = await this.repo.getWishlist(userId);
    const result = items.map((item) => ({
      wishlistItemId: item.wishlist_item_id,
      productId: item.product_id,
      addedAt: item.added_at,
      product: {
        id: item.product_id,
        name: item.name,
        slug: item.slug,
        price: item.price,
        salePrice: item.sale_price,
        brandName: item.brand_name,
        primaryImage: item.primary_image,
        stockStatus: item.stock_status,
        stockQuantity: item.stock_quantity,
        isAvailable: item.status === 'Active' && item.stock_quantity > 0,
      },
    }));

    await cacheService.set(CACHE_KEYS.CUSTOMER_WISHLIST(userId), result, CACHE_TTL.SHORT);
    return result;
  }

  async addToWishlist(userId: number, productId: number): Promise<void> {
    const count = await this.repo.countItems(userId);
    if (count >= MAX_WISHLIST_ITEMS) {
      throw new ApiError(400, `Wishlist limit reached (max ${MAX_WISHLIST_ITEMS} items).`);
    }
    const alreadyIn = await this.repo.isInWishlist(userId, productId);
    if (alreadyIn) throw new ApiError(409, 'Product is already in your wishlist.');

    const wishlistId = await this.repo.findOrCreateWishlist(userId);
    await this.repo.addItem(wishlistId, productId);
    await cacheService.del(CACHE_KEYS.CUSTOMER_WISHLIST(userId));
  }

  async removeFromWishlist(userId: number, productId: number): Promise<void> {
    const removed = await this.repo.removeItem(userId, productId);
    if (!removed) throw new ApiError(404, 'Product not found in wishlist.');
    await cacheService.del(CACHE_KEYS.CUSTOMER_WISHLIST(userId));
  }

  async moveToCart(userId: number, productId: number): Promise<void> {
    const inWishlist = await this.repo.isInWishlist(userId, productId);
    if (!inWishlist) throw new ApiError(404, 'Product not found in wishlist.');
    // Cart add is handled by CartService — wishlist only removes from wishlist
    await this.repo.removeItem(userId, productId);
    await cacheService.del(CACHE_KEYS.CUSTOMER_WISHLIST(userId));
  }
}
