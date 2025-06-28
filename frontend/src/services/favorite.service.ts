import { apiClient } from "@/lib/api";
import {
  FavoriteResponse,
  IsFavoritedResponse,
  FavoriteCountResponse,
  FAVORITE_ENDPOINTS,
  FAVORITE_QUERY_KEYS,
} from "@/types/favorite";
import { DocumentListRequest, DocumentListResponse, SuccessResponse } from "@/types";

// API Response types
export type FavoriteApiResponse = SuccessResponse<FavoriteResponse>;
export type IsFavoritedApiResponse = SuccessResponse<IsFavoritedResponse>;
export type FavoriteCountApiResponse = SuccessResponse<FavoriteCountResponse>;
export type FavoriteListApiResponse = SuccessResponse<DocumentListResponse>;

export class FavoriteService {
  /**
   * Add document to favorites
   */
  async addToFavorites(documentId: string): Promise<FavoriteApiResponse> {
    try {
      const response = await apiClient.post<FavoriteResponse>(
        FAVORITE_ENDPOINTS.ADD(documentId)
      );
      return response;
    } catch (error) {
      console.error("[FAVORITE_SERVICE] Failed to add document to favorites:", error);
      throw error;
    }
  }

  /**
   * Remove document from favorites
   */
  async removeFromFavorites(documentId: string): Promise<SuccessResponse<null>> {
    try {
      const response = await apiClient.delete<null>(
        FAVORITE_ENDPOINTS.REMOVE(documentId)
      );
      return response;
    } catch (error) {
      console.error("[FAVORITE_SERVICE] Failed to remove document from favorites:", error);
      throw error;
    }
  }

  /**
   * Get user's favorite documents with pagination
   */
  async getFavoriteDocuments(
    request: DocumentListRequest = {}
  ): Promise<FavoriteListApiResponse> {
    const params = new URLSearchParams();

    if (request.page) params.append("page", request.page.toString());
    if (request.limit) params.append("limit", request.limit.toString());

    const url = `${FAVORITE_ENDPOINTS.LIST}?${params.toString()}`;
    
    try {
      const response = await apiClient.get<DocumentListResponse>(url);
      return response;
    } catch (error) {
      console.error("[FAVORITE_SERVICE] Failed to retrieve favorite documents:", error);
      throw error;
    }
  }

  /**
   * Check if document is favorited by current user
   */
  async isFavorited(documentId: string): Promise<IsFavoritedApiResponse> {
    try {
      const response = await apiClient.get<IsFavoritedResponse>(
        FAVORITE_ENDPOINTS.STATUS(documentId)
      );
      return response;
    } catch (error) {
      console.error("[FAVORITE_SERVICE] Failed to check favorite status:", error);
      throw error;
    }
  }

  /**
   * Get favorite count for a document
   */
  async getFavoriteCount(documentId: string): Promise<FavoriteCountApiResponse> {
    try {
      const response = await apiClient.get<FavoriteCountResponse>(
        FAVORITE_ENDPOINTS.COUNT(documentId)
      );
      return response;
    } catch (error) {
      console.error("[FAVORITE_SERVICE] Failed to get favorite count:", error);
      throw error;
    }
  }
}

// Create singleton instance
export const favoriteService = new FavoriteService();

// React Query hooks
export const favoriteQueries = {
  /**
   * Query for user's favorite documents
   */
  list: (request: DocumentListRequest = {}) => ({
    queryKey: FAVORITE_QUERY_KEYS.FAVORITES.LIST,
    queryFn: async () => {
      const response = await favoriteService.getFavoriteDocuments(request);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    keepPreviousData: true, // For pagination
  }),

  /**
   * Query to check if document is favorited
   */
  status: (documentId: string) => ({
    queryKey: FAVORITE_QUERY_KEYS.FAVORITES.STATUS(documentId),
    queryFn: async () => {
      const response = await favoriteService.isFavorited(documentId);
      return response.data;
    },
    enabled: !!documentId,
    staleTime: 30 * 1000, // 30 seconds
  }),

  /**
   * Query for document favorite count
   */
  count: (documentId: string) => ({
    queryKey: FAVORITE_QUERY_KEYS.FAVORITES.COUNT(documentId),
    queryFn: async () => {
      const response = await favoriteService.getFavoriteCount(documentId);
      return response.data;
    },
    enabled: !!documentId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  }),
};

export const favoriteMutations = {
  /**
   * Add to favorites mutation
   */
  add: () => ({
    mutationFn: async ({ documentId }: { documentId: string }) => {
      const response = await favoriteService.addToFavorites(documentId);
      return response.data;
    },
  }),

  /**
   * Remove from favorites mutation
   */
  remove: () => ({
    mutationFn: async ({ documentId }: { documentId: string }) => {
      const response = await favoriteService.removeFromFavorites(documentId);
      return response;
    },
  }),
}; 