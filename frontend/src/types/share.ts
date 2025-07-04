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

export const SHARE_ENDPOINTS = {
  CREATE: (documentId: string) => `/documents/${documentId}/share`,
  GET_SHARES: (documentId: string) => `/documents/${documentId}/shares`,
  REVOKE: (documentId: string, shareId: string) => `/documents/${documentId}/shares/${shareId}`,
} as const; 