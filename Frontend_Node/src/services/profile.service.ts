import { apiClient } from '@/lib/apiClient';
import type { Profile, ProfilePayload } from '@/types/api';

/** /api/v1/customer/profile/* — authenticated. */
export const profileService = {
  get: (signal?: AbortSignal) => apiClient.get<Profile>('/profile', { signal }),

  update: (payload: ProfilePayload) => apiClient.patch<Profile>('/profile', payload),

  /** Multipart upload — the client omits Content-Type so the browser sets the boundary. */
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return apiClient.post<{ avatarUrl: string }>('/profile/avatar', formData);
  },

  removeAvatar: () => apiClient.delete<{ message: string }>('/profile/avatar'),
};
