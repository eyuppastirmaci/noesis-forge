"use client";

import React, { useCallback, memo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Trash2, ArrowDown, Check, FileText, Eye, Heart } from "lucide-react";

// Dynamically import Image to avoid SSR hydration issues
const Image = dynamic(() => import("next/image"), { 
  ssr: false,
  loading: () => (
    <div className="w-16 h-16 bg-background-secondary rounded border border-border animate-pulse flex items-center justify-center">
      <div className="w-4 h-4 bg-border rounded animate-pulse"></div>
    </div>
  )
});
import { Document, DocumentStatus, DocumentType, DOCUMENT_ENDPOINTS, FAVORITE_QUERY_KEYS, getErrorMessage } from "@/types";
import DocumentTypeIndicator from "@/components/DocumentTypeIndicator";
import IconButton from "@/components/ui/IconButton";
import CustomTooltip from "@/components/ui/CustomTooltip";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import PDFViewerModal from "@/components/PDFViewerModal";
import { favoriteQueries, favoriteMutations } from "@/services/favorite.service";
import { toast, formatDate, formatFileSize } from "@/utils";
import { API_CONFIG } from "@/config/api";

interface DocumentCardProps {
  document: Document;
  onDownload: (document: Document) => void;
  onDelete: (document: Document) => void;
  onPreview: (document: Document) => void;
  isDownloading: boolean;
  isDeleting: boolean;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: (documentId: string, selected: boolean) => void;
  className?: string;
}

const DocumentCard = memo(({ 
  document, 
  onDownload, 
  onDelete, 
  onPreview,
  isDownloading, 
  isDeleting,
  isSelectionMode = false,
  isSelected = false,
  onSelect,
  className = ""
}: DocumentCardProps) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const queryClient = useQueryClient();

  // Query for favorite status
  const {
    data: favoriteStatus,
    isLoading: isLoadingFavorite,
  } = useQuery(favoriteQueries.status(document.id));

  // Add to favorites mutation
  const addToFavoritesMutation = useMutation({
    ...favoriteMutations.add(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: FAVORITE_QUERY_KEYS.FAVORITES.STATUS(document.id),
      });
      queryClient.invalidateQueries({
        queryKey: FAVORITE_QUERY_KEYS.FAVORITES.LIST,
      });
      toast.success(`"${document.title}" added to favorites`);
    },
    onError: (error) => {
      console.error("Add to favorites failed:", error);
      toast.error(`Failed to add to favorites: ${getErrorMessage(error)}`);
    },
  });

  // Remove from favorites mutation
  const removeFromFavoritesMutation = useMutation({
    ...favoriteMutations.remove(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: FAVORITE_QUERY_KEYS.FAVORITES.STATUS(document.id),
      });
      queryClient.invalidateQueries({
        queryKey: FAVORITE_QUERY_KEYS.FAVORITES.LIST,
      });
      toast.success(`"${document.title}" removed from favorites`);
    },
    onError: (error) => {
      console.error("Remove from favorites failed:", error);
      toast.error(`Failed to remove from favorites: ${getErrorMessage(error)}`);
    },
  });

  const getStatusBadge = useCallback((status: DocumentStatus) => {
    const statusColors = {
      ready:
        "bg-green-600 dark:bg-green-600 text-white dark:text-white",
      processing:
        "bg-amber-500 dark:bg-amber-500 text-white dark:text-white",
      failed: 
        "bg-red-600 dark:bg-red-600 text-white dark:text-white",
      deleted: 
        "bg-gray-500 dark:bg-gray-500 text-white dark:text-white",
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm ${statusColors[status]}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  }, []);

  const handleDeleteClick = useCallback(() => {
    setShowDeleteModal(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    try {
      await onDelete(document);
      toast.success(`"${document.title}" has been deleted successfully.`);
      setShowDeleteModal(false);
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error(`Failed to delete "${document.title}". Please try again.`);
    }
  }, [document, onDelete]);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteModal(false);
  }, []);

  const handlePreviewClick = useCallback(() => {
    onPreview(document);
  }, [document, onPreview]);

  const handlePDFViewerOpen = useCallback(() => {
    if (document.fileType === DocumentType.PDF) {
      setShowPDFViewer(true);
    }
  }, [document.fileType]);

  const handlePDFViewerClose = useCallback(() => {
    setShowPDFViewer(false);
  }, []);

  const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(document.id, e.target.checked);
    }
  }, [document.id, onSelect]);

  const handleCardClick = useCallback(() => {
    if (isSelectionMode && onSelect) {
      onSelect(document.id, !isSelected);
    }
  }, [isSelectionMode, onSelect, document.id, isSelected]);

  const handleFavoriteToggle = useCallback(async () => {
    if (isLoadingFavorite) return;

    try {
      if (favoriteStatus?.isFavorited) {
        await removeFromFavoritesMutation.mutateAsync({ documentId: document.id });
      } else {
        await addToFavoritesMutation.mutateAsync({ documentId: document.id });
      }
    } catch (error) {
      console.error("Favorite toggle failed:", error);
    }
  }, [favoriteStatus?.isFavorited, document.id, addToFavoritesMutation, removeFromFavoritesMutation, isLoadingFavorite]);

  const handleViewDetailsClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <>
      <div 
        className={`rounded-lg shadow-sm hover:shadow-md transition-all min-h-[180px] flex flex-col bg-background-secondary border border-border relative ${
          isSelectionMode ? 'cursor-pointer' : ''
        } ${
          isSelected ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
        } ${className}`}
        onClick={handleCardClick}
      >
        {/* Selection Checkbox */}
        {isSelectionMode && (
          <div className="absolute top-3 left-3 z-10">
            <label className="flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={handleCheckboxChange}
                  className="sr-only"
                />
                <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                  isSelected 
                    ? 'bg-blue-600 border-blue-600' 
                    : 'bg-background border-border hover:border-blue-400'
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>
            </label>
          </div>
        )}

        <div className="p-4 flex flex-col h-full">
          {/* Header with icon and actions */}
          <div className="flex items-start justify-between mb-3">
            {/* Document Type Icon or PDF Thumbnail */}
            <div className={`flex-shrink-0 ${isSelectionMode ? 'ml-8' : ''}`}>
              {document.fileType === DocumentType.PDF && document.hasThumbnail ? (
                // Server-generated thumbnail (preferred) - clickable for PDF viewer
                <div 
                  className="relative w-16 h-16 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={handlePDFViewerOpen}
                  title={`Open ${document.title} in PDF viewer`}
                >
                  <Image
                    src={`${API_CONFIG.BASE_URL}${DOCUMENT_ENDPOINTS.THUMBNAIL(document.id)}?v=${document.version}`}
                    alt={`${document.title} thumbnail`}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover rounded border border-border shadow-sm"
                    onError={(e) => {
                      // Fallback to placeholder if thumbnail fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const placeholder = target.nextElementSibling as HTMLElement;
                      if (placeholder) placeholder.style.display = 'flex';
                    }}
                  />
                  <div 
                    className="w-full h-full bg-background-secondary rounded border border-border flex items-center justify-center absolute top-0 left-0"
                    style={{ display: 'none' }}
                  >
                    <FileText className="w-8 h-8 text-foreground-secondary" />
                  </div>
                </div>
              ) : document.fileType === DocumentType.PDF ? (
                // PDF placeholder when no thumbnail available - clickable for PDF viewer
                <div 
                  className="relative w-16 h-16 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={handlePDFViewerOpen}
                  title={`Open ${document.title} in PDF viewer`}
                >
                  <div className="w-full h-full bg-background-secondary rounded border border-border flex items-center justify-center">
                    <FileText className="w-8 h-8 text-foreground-secondary" />
                  </div>
                </div>
              ) : (
                // Non-PDF documents
                <DocumentTypeIndicator
                  fileType={document.fileType}
                  size="md"
                />
              )}
            </div>
            {!isSelectionMode && (
              <div className="flex space-x-1 flex-shrink-0">
                <div data-tooltip-id={`view-${document.id}`}>
                  <Link href={`/documents/${document.id}`} onClick={handleViewDetailsClick}>
                    <IconButton
                      Icon={Eye}
                      onClick={() => {}}
                      variant="default"
                      size="sm"
                      bordered={false}
                    />
                  </Link>
                </div>
                <CustomTooltip
                  anchorSelect={`[data-tooltip-id='view-${document.id}']`}
                >
                  View details
                </CustomTooltip>

                <div data-tooltip-id={`favorite-${document.id}`}>
                  <IconButton
                    Icon={Heart}
                    onClick={handleFavoriteToggle}
                    variant="default"
                    size="sm"
                    bordered={false}
                    disabled={isLoadingFavorite || addToFavoritesMutation.isPending || removeFromFavoritesMutation.isPending}
                    className={favoriteStatus?.isFavorited ? "text-red-500 hover:text-red-600 [&>svg]:fill-current" : ""}
                  />
                </div>
                <CustomTooltip
                  anchorSelect={`[data-tooltip-id='favorite-${document.id}']`}
                >
                  {favoriteStatus?.isFavorited ? "Remove from favorites" : "Add to favorites"}
                </CustomTooltip>

                <div data-tooltip-id={`download-${document.id}`}>
                  <IconButton
                    Icon={Download}
                    onClick={() => onDownload(document)}
                    variant="default"
                    size="sm"
                    bordered={false}
                    disabled={isDownloading}
                  />
                </div>
                <CustomTooltip
                  anchorSelect={`[data-tooltip-id='download-${document.id}']`}
                >
                  Download document
                </CustomTooltip>

                <div data-tooltip-id={`delete-${document.id}`}>
                  <IconButton
                    Icon={Trash2}
                    onClick={handleDeleteClick}
                    variant="danger"
                    size="sm"
                    bordered={false}
                    disabled={isDeleting}
                  />
                </div>
                <CustomTooltip
                  anchorSelect={`[data-tooltip-id='delete-${document.id}']`}
                >
                  Delete document
                </CustomTooltip>
              </div>
            )}
          </div>

          {/* Document title */}
          <h3 className="text-sm font-medium mb-2 line-clamp-2 flex-grow text-foreground">
            {document.title}
          </h3>

          {/* Document metadata */}
          <div className="space-y-1.5 text-xs mt-auto text-foreground-secondary">
            <div className="flex justify-between items-center">
              <span>{formatFileSize(document.fileSize)}</span>
              <span>{formatDate(document.createdAt)}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-shrink-0">
                {getStatusBadge(document.status)}
              </div>
              <div className="flex space-x-3 flex-shrink-0">
                <span
                  className="flex items-center space-x-1"
                  data-tooltip-id={`views-${document.id}`}
                >
                  <FileText className="w-3 h-3 flex-shrink-0" />
                  <span className="flex-shrink-0">
                    {document.viewCount}
                  </span>
                </span>
                <CustomTooltip
                  anchorSelect={`[data-tooltip-id='views-${document.id}']`}
                >
                  Total views: {document.viewCount}
                </CustomTooltip>

                <span
                  className="flex items-center space-x-1"
                  data-tooltip-id={`downloads-${document.id}`}
                >
                  <ArrowDown className="w-3 h-3 flex-shrink-0" />
                  <span className="flex-shrink-0">
                    {document.downloadCount}
                  </span>
                </span>
                <CustomTooltip
                  anchorSelect={`[data-tooltip-id='downloads-${document.id}']`}
                >
                  Total downloads: {document.downloadCount}
                </CustomTooltip>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        size="md"
        closeOnOverlayClick={true}
        closeOnEscape={true}
      >
        <Modal.Header>
          Delete Document
        </Modal.Header>
        
        <Modal.Content>
          <p className="mb-4">
            Are you sure you want to delete <strong>"{document.title}"</strong>?
          </p>
          <p className="text-sm text-foreground-secondary">
            This action cannot be undone. The document will be permanently removed from your account.
          </p>
        </Modal.Content>
        
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={handleDeleteCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="error"
            onClick={handleDeleteConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* PDF Viewer Modal */}
      <PDFViewerModal
        isOpen={showPDFViewer}
        onClose={handlePDFViewerClose}
        document={document}
      />
    </>
  );
});

DocumentCard.displayName = 'DocumentCard';

export default DocumentCard;