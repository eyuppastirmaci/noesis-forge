"use client";

import React, { useCallback, memo, useState } from "react";
import dynamic from "next/dynamic";
import { Download, Trash2, ArrowDown, Check, FileText } from "lucide-react";
import { Document, DocumentStatus, DocumentType, DOCUMENT_ENDPOINTS } from "@/types";
import DocumentTypeIndicator from "@/components/DocumentTypeIndicator";
import IconButton from "@/components/ui/IconButton";
import CustomTooltip from "@/components/ui/CustomTooltip";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import PDFViewerSkeleton from "@/components/ui/PDFViewerSkeleton";
import { toast, formatDate, formatFileSize } from "@/utils";
import { API_CONFIG } from "@/config/api";

// Dynamically import PDFViewer to avoid SSR issues
const PDFViewer = dynamic(() => import("@/components/PDFViewer"), {
  ssr: false,
  loading: () => <PDFViewerSkeleton />
});

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
                  <img
                    src={`${API_CONFIG.BASE_URL}${DOCUMENT_ENDPOINTS.THUMBNAIL(document.id)}`}
                    alt={`${document.title} thumbnail`}
                    className="w-full h-full object-cover rounded border border-border shadow-sm"
                    loading="lazy"
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
      {document.fileType === DocumentType.PDF && (
        <Modal
          isOpen={showPDFViewer}
          onClose={handlePDFViewerClose}
          size="full"
          closeOnOverlayClick={true}
          closeOnEscape={true}
        >
          <Modal.Header className="!mb-2">
            {document.title}
          </Modal.Header>
          
          <Modal.Content className="!p-0 !mb-0 h-full">
            <PDFViewer
              documentId={document.id}
              documentTitle={document.title}
              className="h-full"
            />
          </Modal.Content>
        </Modal>
      )}
    </>
  );
});

DocumentCard.displayName = 'DocumentCard';

export default DocumentCard;