// Search types for similarity and advanced search features

export interface SimilaritySearchRequest {
  query: string;
  threshold?: number; // 0-100, default 70
  limit?: number; // Max results, default 20
  collection?: 'text' | 'image' | 'both'; // Which embeddings to search
}

export interface SimilaritySearchResult {
  id: string;
  documentId: string;
  title: string;
  description?: string;
  filePath?: string;
  thumbnailUrl?: string;
  score: number; // Similarity score 0-1
  createdAt: string;
  updatedAt: string;
  fileSize?: number;
  tags?: string[];
  userId: string;
}

export interface SimilaritySearchResponse {
  results: SimilaritySearchResult[];
  query: string;
  totalResults: number;
  threshold: number;
  executionTime: number; // ms
}

export interface HybridSearchRequest {
  query: string;
  textWeight?: number; // 0-1, default 0.5
  vectorWeight?: number; // 0-1, default 0.5
  threshold?: number;
  limit?: number;
  filters?: SearchFilters;
}

export interface SearchFilters {
  dateRange?: {
    from?: string;
    to?: string;
  };
  sizeRange?: {
    min?: number; // bytes
    max?: number; // bytes
  };
  documentTypes?: string[]; // ['pdf', 'docx', etc]
  tags?: string[];
  userId?: string;
  status?: 'ready' | 'processing' | 'failed';
}

export interface SearchHistoryItem {
  id: string;
  userId: string;
  query: string;
  searchMode: 'text' | 'semantic' | 'hybrid';
  filters?: SearchFilters;
  resultsCount: number;
  createdAt: string;
}

export interface SearchHistoryResponse {
  history: SearchHistoryItem[];
  totalCount: number;
  page: number;
  limit: number;
}
