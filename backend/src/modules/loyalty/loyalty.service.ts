import { LoyaltyRepository } from './loyalty.repository';
import { ApiError } from '../../utils/ApiError';
import { parsePaginationParams, buildPaginatedResult } from '../../common/utils/pagination.util';
import { POINT_VALUE_IN_RUPEES, MAX_REDEEM_PERCENT, POINTS_PER_RUPEE } from '../../core/constants/customer.constants';

export class LoyaltyService {
  private readonly repo: LoyaltyRepository;

  constructor() {
    this.repo = new LoyaltyRepository();
  }

  async getLoyaltyDashboard(userId: number) {
    const loyalty = await this.repo.getCustomerLoyalty(userId);
    if (!loyalty) throw new ApiError(404, 'Loyalty account not found.');

    return {
      pointsBalance: loyalty.points_balance,
      lifetimePoints: loyalty.lifetime_points,
      tier: loyalty.tier,
      pointValue: `1 point = ₹${POINT_VALUE_IN_RUPEES}`,
      tiers: {
        Bronze: { minPoints: 0, maxPoints: 999 },
        Silver: { minPoints: 1000, maxPoints: 4999 },
        Gold: { minPoints: 5000, maxPoints: 9999 },
        Platinum: { minPoints: 10000, maxPoints: null },
      },
      nextTierInfo: this.getNextTierInfo(loyalty.lifetime_points),
    };
  }

  async getHistory(userId: number, page: unknown, limit: unknown) {
    const { page: p, limit: l, offset } = parsePaginationParams(page, limit, 50);
    const { data, total } = await this.repo.getLoyaltyHistory(userId, offset, l);
    return buildPaginatedResult(data, total, p, l);
  }

  async redeemPoints(userId: number, points: number, cartTotal: number): Promise<{ discountAmount: number }> {
    if (points <= 0) throw new ApiError(400, 'Points to redeem must be greater than zero.');

    const loyalty = await this.repo.getCustomerLoyalty(userId);
    if (!loyalty) throw new ApiError(404, 'Loyalty account not found.');
    if (loyalty.points_balance < points) {
      throw new ApiError(400, `Insufficient points. You have ${loyalty.points_balance} points.`);
    }

    const discountAmount = points * POINT_VALUE_IN_RUPEES;
    const maxDiscount = cartTotal * MAX_REDEEM_PERCENT;
    if (discountAmount > maxDiscount) {
      throw new ApiError(
        400,
        `You can redeem a maximum of ₹${maxDiscount.toFixed(2)} (${MAX_REDEEM_PERCENT * 100}% of order total) using points.`
      );
    }

    return { discountAmount };
  }

  calculatePointsForOrder(orderTotal: number): number {
    return Math.floor(orderTotal * POINTS_PER_RUPEE);
  }

  async awardOrderPoints(userId: number, orderId: number, orderTotal: number): Promise<void> {
    const points = this.calculatePointsForOrder(orderTotal);
    if (points > 0) {
      await this.repo.addPoints(userId, points, `Points earned for order #${orderId}`, orderId, 'order');
    }
  }

  private getNextTierInfo(lifetimePoints: number) {
    if (lifetimePoints >= 10000) return { tier: 'Platinum', message: 'You have reached the highest tier!' };
    if (lifetimePoints >= 5000) return { tier: 'Platinum', pointsNeeded: 10000 - lifetimePoints };
    if (lifetimePoints >= 1000) return { tier: 'Gold', pointsNeeded: 5000 - lifetimePoints };
    return { tier: 'Silver', pointsNeeded: 1000 - lifetimePoints };
  }
}
