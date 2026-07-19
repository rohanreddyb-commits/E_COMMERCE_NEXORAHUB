import { ProfileRepository } from './profile.repository';
import { AuditService } from '../../shared/audit/audit.service';
import { ApiError } from '../../utils/ApiError';

export class ProfileService {
  private readonly repo: ProfileRepository;
  private readonly auditService: AuditService;

  constructor() {
    this.repo = new ProfileRepository();
    this.auditService = new AuditService();
  }

  async getProfile(userId: number) {
    const profile = await this.repo.findById(userId);
    if (!profile) throw new ApiError(404, 'Profile not found.');

    return {
      id: profile.user_id,
      firstName: profile.first_name,
      lastName: profile.last_name,
      fullName: `${profile.first_name} ${profile.last_name}`,
      email: profile.email,
      phone: profile.phone,
      avatar: profile.avatar_url,
      dateOfBirth: profile.date_of_birth,
      gender: profile.gender,
      isEmailVerified: !!profile.is_email_verified,
      memberSince: profile.created_at,
      lastLogin: profile.last_login,
      loyalty: {
        tier: profile.tier || 'Bronze',
        points: profile.points_balance || 0,
      },
    };
  }

  async updateProfile(userId: number, data: any) {
    const oldProfile = await this.repo.findById(userId);
    const updated = await this.repo.update(userId, {
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
      date_of_birth: data.date_of_birth,
      gender: data.gender,
    });

    await this.auditService.log({
      userId,
      action: 'profile_update',
      module: 'profile',
      recordId: userId,
      oldValues: { first_name: oldProfile?.first_name, last_name: oldProfile?.last_name },
      newValues: { first_name: updated?.first_name, last_name: updated?.last_name },
    });

    return this.getProfile(userId);
  }

  async updateAvatar(userId: number, filename: string) {
    const avatarUrl = `/uploads/${filename}`;
    await this.repo.updateAvatar(userId, avatarUrl);
    await this.auditService.log({ userId, action: 'avatar_update', module: 'profile', recordId: userId });
    return { avatarUrl };
  }

  async removeAvatar(userId: number) {
    await this.repo.updateAvatar(userId, null);
    return { message: 'Avatar removed.' };
  }
}
