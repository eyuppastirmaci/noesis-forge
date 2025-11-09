import { apiClient } from "@/lib/api";
import {
  SimilaritySearchRequest,
  SimilaritySearchResponse,
  HybridSearchRequest,
  SearchHistoryResponse,
} from "@/types/search";

const SEARCH_ENDPOINTS = {
  SIMILARITY: "/search/similarity",
  HYBRID: "/search/hybrid",
  HISTORY: "/search/history",
} as const;

/**
 * Search for similar documents using vector embeddings
 */
export async function searchSimilarDocuments(
  request: SimilaritySearchRequest
): Promise<SimilaritySearchResponse> {
  const params = new URLSearchParams();
  params.append("query", request.query);
  
  if (request.threshold !== undefined) {
    params.append("threshold", request.threshold.toString());
  }
  
  if (request.limit !== undefined) {
    params.append("limit", request.limit.toString());
  }
  
  if (request.collection) {
    params.append("collection", request.collection);
  }

  const response = await apiClient.get<SimilaritySearchResponse>(
    `${SEARCH_ENDPOINTS.SIMILARITY}?${params.toString()}`,
    { timeout: 60000 } // 60 seconds timeout for embedding generation
  );

  return response.data;
}

/**
 * Perform hybrid search (text + vector)
 */
export async function hybridSearch(
  request: HybridSearchRequest
): Promise<SimilaritySearchResponse> {
  const response = await apiClient.post<SimilaritySearchResponse>(
    SEARCH_ENDPOINTS.HYBRID,
    request,
    { timeout: 60000 } // 60 seconds timeout for embedding generation
  );

  return response.data;
}

/**
 * Get search history for current user
 */
export async function getSearchHistory(
  page: number = 1,
  limit: number = 20
): Promise<SearchHistoryResponse> {
  const params = new URLSearchParams();
  params.append("page", page.toString());
  params.append("limit", limit.toString());

  const response = await apiClient.get<SearchHistoryResponse>(
    `${SEARCH_ENDPOINTS.HISTORY}?${params.toString()}`
  );

  return response.data;
}

/**
 * Delete a search history item
 */
export async function deleteSearchHistory(historyId: string): Promise<void> {
  await apiClient.delete(`${SEARCH_ENDPOINTS.HISTORY}/${historyId}`);
}

/**
 * Clear all search history for current user
 */
export async function clearSearchHistory(): Promise<void> {
  await apiClient.delete(SEARCH_ENDPOINTS.HISTORY);
}
