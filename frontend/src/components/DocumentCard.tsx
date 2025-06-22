"use client";

import React, { useCallback, memo } from "react";
import { Download, Trash2, Eye, ArrowDown } from "lucide-react";
import { Document, DocumentStatus } from "@/types";
import { documentService } from "@/services/document.services";
import DocumentTypeIndicator from "@/components/DocumentTypeIndicator";
import IconButton from "@/components/ui/IconButton";
import CustomTooltip from "@/components/ui/CustomTooltip";

interface DocumentCardProps {
  document: Document;
  onDownload: (document: Document) => void;
  onDelete: (document: Document) => void;
  isDownloading: boolean;
  isDeleting: boolean;
  className?: string;
}

const DocumentCard = memo(({ 
  document, 
  onDownload, 
  onDelete, 
  isDownloading, 
  isDeleting,
  className = ""
}: DocumentCardProps) => {
  const formatFileSize = useCallback((bytes: number) => {
    return documentService.formatFileSize(bytes);
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, []);

  const getStatusBadge = useCallback((status: DocumentStatus) => {
    const statusColors = {
      ready:
        "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
      processing:
        "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
      failed: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
      deleted: "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300",
    };

    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[status]}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  }, []);

  return (
    <div className={`rounded-lg shadow-sm hover:shadow-md transition-shadow min-h-[180px] flex flex-col bg-background-secondary border border-border ${className}`}>
      <div className="p-4 flex flex-col h-full">
        {/* Header with icon and actions */}
        <div className="flex items-start justify-between mb-3">
          <DocumentTypeIndicator
            fileType={document.fileType}
            size="md"
            className="flex-shrink-0"
          />
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
                onClick={() => onDelete(document)}
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
  );
});

DocumentCard.displayName = 'DocumentCard';

export default DocumentCard; 