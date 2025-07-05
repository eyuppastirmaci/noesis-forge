export interface CreateShareRequest {
  expiresInDays?: number; // 0 means no expiry
  maxDownloads?: number;  // undefined means unlimited
}

export interface CreateShareResponse {
  shareURL: string;
}

export interface ShareItem {
  id: string;
  documentID: string;
  ownerID: string;
  token: string;
  expiresAt?: string;
  maxDownloads?: number;
  downloadCount: number;
  isRevoked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GetSharesResponse {
  shares: ShareItem[];
}

export type AccessLevel = 'view' | 'download' | 'edit';

export interface UserShare {
  id: string;
  documentId: string;
  ownerId: string;
  sharedWithEmail: string;
  sharedWithUserId?: string;
  accessLevel: AccessLevel;
  expiresAt?: string;
  isRevoked: boolean;
  acceptedAt?: string;
  lastAccessedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserShareRequest {
  emails: string[];
  accessLevel: AccessLevel;
  expiresInDays?: number; // 0 means no expiry
  message?: string;
}

export interface CreateUserShareResponse {
  shares: UserShare[];
  successCount: number;
  failureCount: number;
  failures?: {
    email: string;
    error: string;
  }[];
}

export interface SharedWithMeItem {
  id: string;
  document: {
    id: string;
    title: string;
    fileType: string;
    fileSize: number;
    createdAt: string;
    status: string;
    version: number;
    viewCount: number;
    downloadCount: number;
    hasThumbnail: boolean;
  };
  sharedBy: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  share: {
    id: string;
    accessLevel: AccessLevel;
    sharedAt: string;
    expiresAt?: string;
    isRevoked: boolean;
    acceptedAt?: string;
    lastAccessedAt?: string;
  };
}

export interface SharedByMeItem {
  id: string;
  document: {
    id: string;
    title: string;
    fileType: string;
    fileSize: number;
    createdAt: string;
    status: string;
    version: number;
    viewCount: number;
    downloadCount: number;
    hasThumbnail: boolean;
  };
  shares: {
    id: string;
    sharedWith: {
      id?: string;
      name?: string;
      email: string;
      avatar?: string;
    };
    accessLevel: AccessLevel;
    sharedAt: string;
    expiresAt?: string;
    isRevoked: boolean;
    acceptedAt?: string;
    lastAccessedAt?: string;
  }[];
  totalShares: number;
  activeShares: number;
}

export interface PublicLinkItem {
  id: string;
  document: {
    id: string;
    title: string;
    fileType: string;
    fileSize: number;
    createdAt: string;
    status: string;
    version: number;
    viewCount: number;
    downloadCount: number;
    hasThumbnail: boolean;
  };
  shareUrl: string;
  token: string;
  createdAt: string;
  expiresAt?: string;
  maxDownloads?: number;
  currentDownloads: number;
  isRevoked: boolean;
  status: 'active' | 'expired' | 'revoked';
}

export interface UpdateUserShareRequest {
  accessLevel?: AccessLevel;
  expiresInDays?: number;
}

export interface RevokeUserShareRequest {
  shareIds: string[];
}

export interface ShareAnalytics {
  totalShares: number;
  activeShares: number;
  expiredShares: number;
  revokedShares: number;
  recentActivity: {
    type: 'shared' | 'accessed' | 'revoked' | 'expired';
    documentTitle: string;
    userEmail: string;
    timestamp: string;
  }[];
}

export interface ShareNotification {
  id: string;
  type: 'document_shared' | 'access_granted' | 'access_revoked' | 'document_updated';
  title: string;
  message: string;
  documentId: string;
  fromUserId: string;
  toUserId: string;
  metadata?: {
    accessLevel?: AccessLevel;
    documentTitle?: string;
    sharedByName?: string;
  };
  isRead: boolean;
  createdAt: string;
}

export const SHARE_ENDPOINTS = {
  CREATE: (documentId: string) => `/documents/${documentId}/share`,
  GET_SHARES: (documentId: string) => `/documents/${documentId}/shares`,
  REVOKE: (documentId: string, shareId: string) => `/documents/${documentId}/shares/${shareId}`,
  CREATE_USER_SHARE: (documentId: string) => `/documents/${documentId}/share/users`,
  GET_USER_SHARES: (documentId: string) => `/documents/${documentId}/share/users`,
  UPDATE_USER_SHARE: (documentId: string, shareId: string) => `/documents/${documentId}/share/users/${shareId}`,
  REVOKE_USER_SHARE: (shareId: string) => `/shares/${shareId}`,
  SHARED_WITH_ME: '/shares/with-me',
  SHARED_BY_ME: '/shares/by-me',
  PUBLIC_LINKS: '/shares/public-links',
  SHARE_ANALYTICS: '/shares/analytics',
  SHARE_NOTIFICATIONS: '/shares/notifications',
  MARK_NOTIFICATION_READ: (notificationId: string) => `/shares/notifications/${notificationId}/read`,
} as const; 