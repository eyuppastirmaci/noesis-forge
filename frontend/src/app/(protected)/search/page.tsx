"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchSimilarDocuments } from "@/services/search.service";
import { SimilaritySearchRequest } from "@/types/search";
import { Search, Loader2, Sparkles, FileText, AlertCircle, Sliders } from "lucide-react";
import Link from "next/link";
import { formatFileSize, formatRelativeTime } from "@/utils";
import { DocumentCardSkeleton } from "@/components/ui/Skeleton";
import { API_CONFIG } from "@/config/api";
import { DOCUMENT_ENDPOINTS } from "@/types/document";
import Image from "next/image";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [threshold, setThreshold] = useState(70);
  const [limit, setLimit] = useState(20);
  const [collection, setCollection] = useState<"text" | "image" | "both">("both");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Search query
  const {
    data: searchResults,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["similarity-search", searchQuery, threshold, limit, collection],
    queryFn: async () => {
      if (!searchQuery) return null;
      
      const request: SimilaritySearchRequest = {
        query: searchQuery,
        threshold,
        limit,
        collection,
      };
      
      return await searchSimilarDocuments(request);
    },
    enabled: !!searchQuery,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchQuery(query.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch(e as any);
    }
  };

  // Calculate score color
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "text-green-500";
    if (score >= 0.6) return "text-yellow-500";
    return "text-orange-500";
  };

  // Calculate score percentage
  const getScorePercentage = (score: number) => {
    return Math.round(score * 100);
  };

  return (
    <div className="flex-1 max-h-[calc(100vh-102px)] overflow-y-scroll bg-background">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Sparkles className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Search</h1>
              <p className="text-sm text-foreground-secondary">
                Find semantically similar documents using vector search
              </p>
            </div>
          </div>
        </div>
        {/* Search Form */}
        <div className="bg-card border border-border rounded-lg p-4 mb-4">
          <form onSubmit={handleSearch} className="space-y-4">
            {/* Search Input */}
            <div>
              <label htmlFor="search-query" className="block text-sm font-medium text-foreground mb-2">
                Search Query
              </label>
              <div className="relative">
                <input
                  id="search-query"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter text to find similar documents..."
                  className="w-full px-4 py-3 pr-12 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-foreground placeholder:text-foreground-secondary"
                />
                <button
                  type="submit"
                  disabled={!query.trim() || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Search className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
            </div>

            {/* Advanced Settings Toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-purple-500 hover:text-purple-600 transition-colors"
            >
              <Sliders className="w-4 h-4" />
              {showAdvanced ? "Hide" : "Show"} Advanced Settings
            </button>

            {/* Advanced Settings */}
            {showAdvanced && (
              <div className="space-y-4 pt-4 border-t border-border">
                {/* Similarity Threshold */}
                <div>
                  <label htmlFor="threshold" className="block text-sm font-medium text-foreground mb-2">
                    Similarity Threshold: {threshold}%
                  </label>
                  <input
                    id="threshold"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-foreground-secondary mt-1">
                    <span>Less Similar (0%)</span>
                    <span>More Similar (100%)</span>
                  </div>
                </div>

                {/* Result Limit */}
                <div>
                  <label htmlFor="limit" className="block text-sm font-medium text-foreground mb-2">
                    Maximum Results
                  </label>
                  <select
                    id="limit"
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-foreground"
                  >
                    <option value={10}>10 results</option>
                    <option value={20}>20 results</option>
                    <option value={50}>50 results</option>
                    <option value={100}>100 results</option>
                  </select>
                </div>

                {/* Collection Type */}
                <div>
                  <label htmlFor="collection" className="block text-sm font-medium text-foreground mb-2">
                    Search In
                  </label>
                  <select
                    id="collection"
                    value={collection}
                    onChange={(e) => setCollection(e.target.value as "text" | "image" | "both")}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-foreground"
                  >
                    <option value="both">Text & Image Embeddings</option>
                    <option value="text">Text Embeddings Only</option>
                    <option value="image">Image Embeddings Only</option>
                  </select>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-red-500">
              <AlertCircle className="w-5 h-5" />
              <p className="font-medium">Error performing search</p>
            </div>
            <p className="text-sm text-red-500/80 mt-1">
              {error instanceof Error ? error.message : "An unexpected error occurred"}
            </p>
          </div>
        )}

        {/* Results Info */}
        {searchResults && (
          <div className="bg-card border border-border rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-secondary">
                  Found <span className="font-semibold text-foreground">{searchResults.totalResults}</span>{" "}
                  similar documents
                </p>
                <p className="text-xs text-foreground-secondary mt-1">
                  Search completed in {searchResults.executionTime}ms
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-foreground-secondary">Query:</p>
                <p className="text-sm font-medium text-foreground truncate max-w-xs">{searchResults.query}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, index) => (
              <DocumentCardSkeleton key={index} />
            ))}
          </div>
        )}

        {/* Results Grid */}
        {!isLoading && searchResults && searchResults.results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {searchResults.results.map((result) => (
              <Link
                key={result.id}
                href={`/documents/${result.documentId}`}
                className="group relative bg-card border border-border rounded-lg overflow-hidden hover:border-purple-500 hover:shadow-lg transition-all"
              >
                {/* Thumbnail */}
                <div className="relative w-full h-48 bg-gradient-to-br from-purple-500/10 to-blue-500/10 flex items-center justify-center overflow-hidden">
                  {result.thumbnailUrl ? (
                    <Image
                      src={`${API_CONFIG.BASE_URL}${DOCUMENT_ENDPOINTS.THUMBNAIL(result.documentId)}`}
                      alt={result.title}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                      }}
                    />
                  ) : (
                    <FileText className="w-16 h-16 text-purple-500/50" />
                  )}
                  
                  {/* Similarity Score Badge */}
                  <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1 z-10">
                    <div className={`text-sm font-bold ${getScoreColor(result.score)}`}>
                      {getScorePercentage(result.score)}%
                    </div>
                  </div>
                </div>

                {/* Document Info */}
                <div className="p-4">
                  <h3 className="text-base font-semibold text-foreground group-hover:text-purple-500 transition-colors mb-2 line-clamp-2">
                    {result.title}
                  </h3>

                  {/* Description/Summary */}
                  {result.description && (
                    <p className="text-sm text-foreground-secondary mb-3 line-clamp-3 italic">
                      {result.description}
                    </p>
                  )}

                  {/* Tags */}
                  {result.tags && result.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {result.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 bg-purple-500/10 text-purple-500 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {result.tags.length > 3 && (
                        <span className="px-2 py-0.5 text-foreground-secondary text-xs">
                          +{result.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs text-foreground-secondary">
                    {result.fileSize && (
                      <span>{formatFileSize(result.fileSize)}</span>
                    )}
                    <span className="truncate ml-2">
                      {formatRelativeTime(new Date(result.updatedAt))}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && searchResults && searchResults.results.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No similar documents found</h3>
            <p className="text-foreground-secondary">
              Try adjusting your search query or lowering the similarity threshold
            </p>
          </div>
        )}

        {/* Initial State */}
        {!searchQuery && !isLoading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500/10 rounded-full mb-4">
              <Sparkles className="w-8 h-8 text-purple-500" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Start Your Similarity Search
            </h3>
            <p className="text-foreground-secondary max-w-md mx-auto">
              Enter a search query above to find documents with similar meaning, even if they use different words
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
