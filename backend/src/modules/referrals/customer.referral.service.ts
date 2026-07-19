import { executeQuery } from '../../database/db';
import sql from 'mssql';
import { generateReferralCode } from '../../common/utils/crypto.util';
import { LoyaltyRepository } from '../loyalty/loyalty.repository';
import { ApiError } from '../../utils/ApiError';
import { parsePaginationParams, buildPaginatedResult } from '../../common/utils/pagination.util';

const REFERRER_REWARD_POINTS = 500; // 500 points (₹125 value) per successful referral
const REFERRED_REWARD_POINTS = 200; // 200 points (₹50 value) for joining via referral

export class CustomerReferralService {
  private readonly loyaltyRepo = new LoyaltyRepository();

  async getMyReferralCode(userId: number) {
    const existing = await executeQuery(
      `SELECT referral_code FROM CustomerReferrals WHERE referrer_id = @user_id`,
      { user_id: { type: sql.Int, value: userId } }
    );

    if (existing.recordset.length > 0) {
      const code = existing.recordset[0].referral_code;
      return { referralCode: code, shareUrl: `https://nexorahub.com/register?ref=${code}` };
    }

    const newCode = generateReferralCode(userId);
    await executeQuery(
      `INSERT INTO CustomerReferrals (referrer_id, referral_code, created_at) VALUES (@user_id, @code, GETDATE())`,
      { user_id: { type: sql.Int, value: userId }, code: { type: sql.VarChar(50), value: newCode } }
    );

    return { referralCode: newCode, shareUrl: `https://nexorahub.com/register?ref=${newCode}` };
  }

  async getReferralStats(userId: number) {
    const result = await executeQuery(
      `SELECT COUNT(*) as total_referred,
              SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as successful_referrals,
              SUM(reward_points_earned) as total_points_earned
       FROM CustomerReferralHistory
       WHERE referrer_id = @user_id`,
      { user_id: { type: sql.Int, value: userId } }
    );

    const stats = result.recordset[0];
    return {
      totalReferred: stats.total_referred || 0,
      successfulReferrals: stats.successful_referrals || 0,
      totalPointsEarned: stats.total_points_earned || 0,
      referrerReward: `${REFERRER_REWARD_POINTS} pts per successful referral`,
      refereeReward: `${REFERRED_REWARD_POINTS} bonus pts on sign up`,
    };
  }

  async processReferralCode(referredUserId: number, referralCode: string): Promise<void> {
    const referrerResult = await executeQuery(
      `SELECT referrer_id FROM CustomerReferrals WHERE referral_code = @code`,
      { code: { type: sql.VarChar(50), value: referralCode.toUpperCase() } }
    );

    const referrer = referrerResult.recordset[0];
    if (!referrer || referrer.referrer_id === referredUserId) return; // Ignore self-referral or invalid code

    // Record referral history
    await executeQuery(
      `INSERT INTO CustomerReferralHistory (referrer_id, referred_user_id, status, reward_points_earned, created_at)
       VALUES (@referrer_id, @referred_id, 'Pending', 0, GETDATE())`,
      { referrer_id: { type: sql.Int, value: referrer.referrer_id }, referred_id: { type: sql.Int, value: referredUserId } }
    );

    // Award bonus points to newly registered user
    await this.loyaltyRepo.addPoints(referredUserId, REFERRED_REWARD_POINTS, `Sign up bonus from referral (${referralCode})`);
  }

  async completeReferralOnFirstOrder(referredUserId: number): Promise<void> {
    const refResult = await executeQuery(
      `SELECT id, referrer_id FROM CustomerReferralHistory WHERE referred_user_id = @user_id AND status = 'Pending'`,
      { user_id: { type: sql.Int, value: referredUserId } }
    );

    const ref = refResult.recordset[0];
    if (!ref) return;

    // Award referrer reward points
    await this.loyaltyRepo.addPoints(ref.referrer_id, REFERRER_REWARD_POINTS, `Referral reward for user #${referredUserId}'s first purchase`);

    await executeQuery(
      `UPDATE CustomerReferralHistory SET status = 'Completed', reward_points_earned = @points, completed_at = GETDATE() WHERE id = @id`,
      { id: { type: sql.Int, value: ref.id }, points: { type: sql.Int, value: REFERRER_REWARD_POINTS } }
    );
  }

  async getReferralHistory(userId: number, page: unknown, limit: unknown) {
    const { parsePaginationParams, buildPaginatedResult } = await import('../../common/utils/pagination.util');
    const { page: p, limit: l, offset } = parsePaginationParams(page, limit, 20);

    const countResult = await executeQuery(
      `SELECT COUNT(*) as total FROM CustomerReferralHistory WHERE referrer_id = @user_id`,
      { user_id: { type: sql.Int, value: userId } }
    );

    const dataResult = await executeQuery(
      `SELECT crh.id, crh.status, crh.reward_points_earned, crh.created_at, crh.completed_at,
              u.first_name + ' ' + LEFT(u.last_name, 1) + '.' as referred_name
       FROM CustomerReferralHistory crh
       INNER JOIN Users u ON crh.referred_user_id = u.user_id
       WHERE crh.referrer_id = @user_id
       ORDER BY crh.created_at DESC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { user_id: { type: sql.Int, value: userId }, offset: { type: sql.Int, value: offset }, limit: { type: sql.Int, value: l } }
    );

    return buildPaginatedResult(dataResult.recordset, countResult.recordset[0].total, p, l);
  }
}
