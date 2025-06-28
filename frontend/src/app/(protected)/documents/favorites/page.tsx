"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Heart } from "lucide-react";
import LinkButton from "@/components/ui/LinkButton";
import {
  Document,
  DocumentListRequest,
  FAVORITE_QUERY_KEYS,
  getErrorMessage,
} from "@/types";
import {
  favoriteQueries,
} from "@/services/favorite.service";
import {
  documentMutations,
  documentService,
} from "@/services/document.services";

import { DocumentCardSkeleton, TextSkeleton } from "@/components/ui/Skeleton";
import DocumentCard from "@/components/DocumentCard";

const DocumentFavoritesPage: React.FC = () => {
  const queryClient = useQueryClient();

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Build query parameters
  const queryParams: DocumentListRequest = useMemo(
    () => ({
      page: currentPage,
      limit: pageSize,
    }),
    [currentPage, pageSize]
  );

  // Fetch favorite documents
  const {
    data: favoritesData,
    isLoading,
    error,
    refetch,
  } = useQuery(favoriteQueries.list(queryParams));

  // Delete mutation
  const deleteMutation = useMutation({
    ...documentMutations.delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: FAVORITE_QUERY_KEYS.FAVORITES.LIST,
      });
    },
  });

  // Download mutation
  const downloadMutation = useMutation(documentMutations.download());

  const handleDownloadDocument = useCallback(
    async (document: Document) => {
      try {
        await downloadMutation.mutateAsync({
          id: document.id,
          originalFileName: document.originalFileName,
        });
      } catch (error) {
        console.error("Download failed:", error);
        alert(`Failed to download document: ${getErrorMessage(error)}`);
      }
    },
    [downloadMutation]
  );

  const handleDeleteDocument = useCallback(
    async (document: Document) => {
      try {
        await deleteMutation.mutateAsync(document.id);
      } catch (error) {
        console.error("Delete failed:", error);
        throw new Error(getErrorMessage(error));
      }
    },
    [deleteMutation]
  );

  const handlePreviewDocument = useCallback(
    async (document: Document) => {
      try {
        const response = await documentService.getDocumentPreview(document.id);
        const previewUrl = response.data.url;
        
        // Open preview in new tab
        window.open(previewUrl, '_blank', 'noopener,noreferrer');
      } catch (error) {
        console.error("Preview failed:", error);
        alert(`Failed to preview document: ${getErrorMessage(error)}`);
      }
    },
    []
  );

  // Memoized document data to prevent unnecessary re-renders
  const documents = useMemo(
    () => favoritesData?.documents || [],
    [favoritesData?.documents]
  );
  const totalPages = useMemo(
    () => favoritesData?.totalPages || 0,
    [favoritesData?.totalPages]
  );
  const total = useMemo(
    () => favoritesData?.total || 0,
    [favoritesData?.total]
  );

  return (
    <div className="flex-1 max-h-[calc(100vh-102px)] overflow-y-scroll bg-background">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Heart className="w-6 h-6 text-[var(--color-error)] fill-current" />
            <h1 className="text-2xl font-bold text-foreground">
              Favorite Documents
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <LinkButton href="/documents">Browse All Documents</LinkButton>
            <LinkButton href="/documents/upload">Upload New</LinkButton>
          </div>
        </div>

        {/* Results Info */}
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-foreground-secondary">
            {isLoading ? (
              <TextSkeleton />
            ) : (
              <span>
                {documents.length} of {total} favorite documents
              </span>
            )}
          </div>
        </div>

        {/* Content Area with Conditional Rendering */}
        {error ? (
          <div className="text-center py-12">
            <div className="text-[var(--color-error)] mb-4">
              Failed to load favorite documents: {getErrorMessage(error)}
            </div>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-[var(--color-info)] hover:bg-[var(--color-info-dark)] text-white rounded-md transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : isLoading ? (
          // Loading state for documents grid - Skeleton Cards
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 20 }).map((_, index) => (
              <DocumentCardSkeleton key={index} />
            ))}
          </div>
        ) : documents.length === 0 ? (
          // Empty state
          <div className="text-center py-12">
            <div className="flex justify-center mb-4">
              <Heart className="w-16 h-16 text-[var(--color-error)] fill-current opacity-50" />
            </div>
            <h3 className="text-lg font-medium mb-2 text-foreground">
              No favorite documents yet
            </h3>
            <p className="mb-4 text-foreground-secondary">
              Start adding documents to your favorites by clicking the heart icon on any document
            </p>
            <LinkButton href="/documents">Browse Documents</LinkButton>
          </div>
        ) : (
          // Documents Grid with Optimized Cards
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {documents.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                onDownload={handleDownloadDocument}
                onDelete={handleDeleteDocument}
                onPreview={handlePreviewDocument}
                isDownloading={downloadMutation.isPending}
                isDeleting={deleteMutation.isPending}
              />
            ))}
          </div>
        )}

        {/* Pagination - Only show when not loading and has documents */}
        {!isLoading && !error && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center">
            <nav className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-3 py-2 text-sm font-medium rounded-md hover:opacity-80 disabled:opacity-50 transition-opacity bg-background-secondary border border-border text-foreground-secondary"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </button>

              <div className="flex space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page =
                    Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        page === currentPage
                          ? "bg-[var(--color-info)] text-white"
                          : "hover:opacity-80 bg-background-secondary border border-border text-foreground-secondary"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-3 py-2 text-sm font-medium rounded-md hover:opacity-80 disabled:opacity-50 transition-opacity bg-background-secondary border border-border text-foreground-secondary"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentFavoritesPage;