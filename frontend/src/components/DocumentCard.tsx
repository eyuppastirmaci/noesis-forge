"use client";

import React, { useCallback, memo, useState } from "react";
import { Download, Trash2, Eye, ArrowDown, Check, FileText } from "lucide-react";
import { Document, DocumentStatus, DocumentType } from "@/types";
import DocumentTypeIndicator from "@/components/DocumentTypeIndicator";
import IconButton from "@/components/ui/IconButton";
import CustomTooltip from "@/components/ui/CustomTooltip";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { toast, formatDate, formatFileSize } from "@/utils";
import { documentService } from "@/services/document.services";

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
  const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [thumbnailLoading, setThumbnailLoading] = useState(false);

  // Generate PDF thumbnail client-side for PDF documents
  React.useEffect(() => {
    if (document.fileType === DocumentType.PDF && !generatedThumbnail && !thumbnailError) {
      generatePDFThumbnailFromPreview();
    }
  }, [document.id, document.fileType, generatedThumbnail, thumbnailError]);

  const generatePDFThumbnailFromPreview = async () => {
    setThumbnailLoading(true);
    try {
      // Get preview URL first
      const response = await documentService.getDocumentPreview(document.id);
      const pdfUrl = response.data.url;
      
      // Dynamically import PDF.js to avoid SSR issues
      const pdfjsLib = await import('pdfjs-dist');
      
      // Set worker path
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

      // Load PDF from URL
      const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
      
      // Get first page
      const page = await pdf.getPage(1);
      
      // Set scale for thumbnail
      const scale = 0.4; // Increased scale for better quality with larger thumbnails
      const viewport = page.getViewport({ scale });
      
      // Create canvas
      const canvas = window.document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // Render page to canvas
      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;
      
      // Convert canvas to data URL
      const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setGeneratedThumbnail(thumbnailDataUrl);
    } catch (error) {
      console.error('Failed to generate PDF thumbnail:', error);
      setThumbnailError(true);
    } finally {
      setThumbnailLoading(false);
    }
  };

  // Cleanup generated thumbnail URL
  React.useEffect(() => {
    return () => {
      if (generatedThumbnail && generatedThumbnail.startsWith('blob:')) {
        URL.revokeObjectURL(generatedThumbnail);
      }
    };
  }, [generatedThumbnail]);

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
                    : 'bg-white border-gray-300 hover:border-blue-400'
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
              {document.fileType === DocumentType.PDF && generatedThumbnail ? (
                <div className="relative w-16 h-16">
                  <img
                    src={generatedThumbnail}
                    alt={`${document.title} thumbnail`}
                    className="w-full h-full object-cover rounded border border-gray-200 shadow-sm"
                    loading="lazy"
                    onError={() => {
                      setThumbnailError(true);
                      setGeneratedThumbnail(null);
                    }}
                  />
                </div>
              ) : document.fileType === DocumentType.PDF && thumbnailLoading ? (
                <div className="relative w-16 h-16">
                  <div className="w-full h-full bg-gray-100 rounded border border-gray-200 animate-pulse flex items-center justify-center">
                    <FileText className="w-8 h-8 text-gray-500" />
                  </div>
                </div>
              ) : document.fileType === DocumentType.PDF ? (
                // PDF placeholder when no thumbnail
                <div className="relative w-16 h-16">
                  <div className="w-full h-full bg-gray-200 rounded border border-gray-300 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-gray-600" />
                  </div>
                </div>
              ) : (
                <DocumentTypeIndicator
                  fileType={document.fileType}
                  size="md"
                />
              )}
            </div>
            {!isSelectionMode && (
              <div className="flex space-x-1 flex-shrink-0">
                <div data-tooltip-id={`preview-${document.id}`}>
                  <IconButton
                    Icon={Eye}
                    onClick={handlePreviewClick}
                    variant="default"
                    size="sm"
                    bordered={false}
                  />
                </div>
                <CustomTooltip
                  anchorSelect={`[data-tooltip-id='preview-${document.id}']`}
                >
                  Preview document
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
                  <Eye className="w-3 h-3 flex-shrink-0" />
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
    </>
  );
});

DocumentCard.displayName = 'DocumentCard';

export default DocumentCard;