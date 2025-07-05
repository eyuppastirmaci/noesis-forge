import { 
  CreateUserShareRequest, 
  CreateUserShareResponse,
  SharedWithMeItem,
  SharedByMeItem,
  PublicLinkItem,
  UpdateUserShareRequest,
  RevokeUserShareRequest,
  ShareAnalytics,
  ShareNotification,
  SHARE_ENDPOINTS 
} from "@/types/share";
import { apiClient } from "@/lib/api";

// API Functions
export const shareApi = {
  // User-based sharing
  createUserShare: async (documentId: string, request: CreateUserShareRequest): Promise<CreateUserShareResponse> => {
    const response = await apiClient.post<CreateUserShareResponse>(SHARE_ENDPOINTS.CREATE_USER_SHARE(documentId), request);
    return response.data;
  },

  updateUserShare: async (documentId: string, shareId: string, request: UpdateUserShareRequest): Promise<void> => {
    await apiClient.put(SHARE_ENDPOINTS.UPDATE_USER_SHARE(documentId, shareId), request);
  },

  revokeUserShare: async (shareId: string): Promise<void> => {
    await apiClient.delete(SHARE_ENDPOINTS.REVOKE_USER_SHARE(shareId));
  },

  revokeMultipleUserShares: async (request: RevokeUserShareRequest): Promise<void> => {
    await apiClient.post(`${SHARE_ENDPOINTS.REVOKE_USER_SHARE('batch')}`, request);
  },

  // Shared documents management
  getSharedWithMe: async (): Promise<SharedWithMeItem[]> => {
    const response = await apiClient.get<{shares: SharedWithMeItem[]}>(SHARE_ENDPOINTS.SHARED_WITH_ME);
    return response.data.shares;
  },

  getSharedByMe: async (): Promise<SharedByMeItem[]> => {
    const response = await apiClient.get<{shares: SharedByMeItem[]}>(SHARE_ENDPOINTS.SHARED_BY_ME);
    return response.data.shares;
  },

  getPublicLinks: async (): Promise<PublicLinkItem[]> => {
    const response = await apiClient.get<{links: PublicLinkItem[]; pagination: any}>(SHARE_ENDPOINTS.PUBLIC_LINKS);
    return response.data.links;
  },

  // Analytics and notifications
  getShareAnalytics: async (): Promise<ShareAnalytics> => {
    const response = await apiClient.get<ShareAnalytics>(SHARE_ENDPOINTS.SHARE_ANALYTICS);
    return response.data;
  },

  getShareNotifications: async (): Promise<ShareNotification[]> => {
    const response = await apiClient.get<{notifications: ShareNotification[]}>(SHARE_ENDPOINTS.SHARE_NOTIFICATIONS);
    return response.data.notifications;
  },

  markNotificationAsRead: async (notificationId: string): Promise<void> => {
    await apiClient.post(SHARE_ENDPOINTS.MARK_NOTIFICATION_READ(notificationId));
  },
};

// Query Keys
export const SHARE_QUERY_KEYS = {
  SHARED_WITH_ME: ['shares', 'with-me'] as const,
  SHARED_BY_ME: ['shares', 'by-me'] as const,
  PUBLIC_LINKS: ['shares', 'public-links'] as const,
  SHARE_ANALYTICS: ['shares', 'analytics'] as const,
  SHARE_NOTIFICATIONS: ['shares', 'notifications'] as const,
  USER_SHARES: (documentId: string) => ['shares', 'users', documentId] as const,
};

// React Query configurations
export const shareQueries = {
  sharedWithMe: () => ({
    queryKey: SHARE_QUERY_KEYS.SHARED_WITH_ME,
    queryFn: shareApi.getSharedWithMe,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  }),

  sharedByMe: () => ({
    queryKey: SHARE_QUERY_KEYS.SHARED_BY_ME,
    queryFn: shareApi.getSharedByMe,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  }),

  publicLinks: () => ({
    queryKey: SHARE_QUERY_KEYS.PUBLIC_LINKS,
    queryFn: shareApi.getPublicLinks,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  }),

  shareAnalytics: () => ({
    queryKey: SHARE_QUERY_KEYS.SHARE_ANALYTICS,
    queryFn: shareApi.getShareAnalytics,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
  }),

  shareNotifications: () => ({
    queryKey: SHARE_QUERY_KEYS.SHARE_NOTIFICATIONS,
    queryFn: shareApi.getShareNotifications,
    staleTime: 1 * 60 * 1000, // 1 minute
    cacheTime: 5 * 60 * 1000, // 5 minutes
  }),
};

// Mutations
export const shareMutations = {
  createUserShare: () => ({
    mutationFn: ({ documentId, request }: { documentId: string; request: CreateUserShareRequest }) =>
      shareApi.createUserShare(documentId, request),
  }),

  updateUserShare: () => ({
    mutationFn: ({ documentId, shareId, request }: { 
      documentId: string; 
      shareId: string; 
      request: UpdateUserShareRequest 
    }) => shareApi.updateUserShare(documentId, shareId, request),
  }),

  revokeUserShare: () => ({
    mutationFn: ({ shareId }: { shareId: string }) =>
      shareApi.revokeUserShare(shareId),
  }),

  revokeMultipleUserShares: () => ({
    mutationFn: ({ request }: { request: RevokeUserShareRequest }) =>
      shareApi.revokeMultipleUserShares(request),
  }),

  markNotificationAsRead: () => ({
    mutationFn: ({ notificationId }: { notificationId: string }) =>
      shareApi.markNotificationAsRead(notificationId),
  }),
};

// Utility functions
export const shareUtils = {
  // Check if share is expired
  isShareExpired: (expiresAt?: string): boolean => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  },

  // Get access level display text
  getAccessLevelText: (accessLevel: string): string => {
    switch (accessLevel) {
      case 'view': return 'View Only';
      case 'download': return 'View & Download';
      case 'edit': return 'View, Download & Edit';
      default: return 'Unknown';
    }
  },

  // Get access level color
  getAccessLevelColor: (accessLevel: string): 'gray' | 'blue' | 'green' => {
    switch (accessLevel) {
      case 'view': return 'gray';
      case 'download': return 'blue';
      case 'edit': return 'green';
      default: return 'gray';
    }
  },

  // Get share status
  getShareStatus: (share: { isRevoked: boolean; expiresAt?: string }): 'active' | 'expired' | 'revoked' => {
    if (share.isRevoked) return 'revoked';
    if (shareUtils.isShareExpired(share.expiresAt)) return 'expired';
    return 'active';
  },

  // Get share status color
  getShareStatusColor: (status: string): 'green' | 'yellow' | 'red' => {
    switch (status) {
      case 'active': return 'green';
      case 'expired': return 'yellow';
      case 'revoked': return 'red';
      default: return 'gray' as any;
    }
  },

  // Format share count text
  formatShareCount: (count: number): string => {
    if (count === 0) return 'No shares';
    if (count === 1) return '1 share';
    return `${count} shares`;
  },

  // Validate email format
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Parse multiple emails from string
  parseEmails: (emailsString: string): string[] => {
    return emailsString
      .split(/[,;\s]+/)
      .map(email => email.trim())
      .filter(email => email.length > 0 && shareUtils.isValidEmail(email));
  },

  // Group shares by status
  groupSharesByStatus: <T extends { isRevoked: boolean; expiresAt?: string }>(shares: T[]) => {
    const grouped = {
      active: [] as T[],
      expired: [] as T[],
      revoked: [] as T[],
    };

    shares.forEach(share => {
      const status = shareUtils.getShareStatus(share);
      grouped[status].push(share);
    });

    return grouped;
  },

  // Calculate share statistics
  calculateShareStats: <T extends { isRevoked: boolean; expiresAt?: string }>(shares: T[]) => {
    const grouped = shareUtils.groupSharesByStatus(shares);
    return {
      total: shares.length,
      active: grouped.active.length,
      expired: grouped.expired.length,
      revoked: grouped.revoked.length,
    };
  },
}; 