"use client";

import React from "react";
import {
  X,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  FileSpreadsheet,
  Presentation,
  File,
} from "lucide-react";
import { documentService } from "@/services/document.services";

interface FilePreviewProps {
  file: File;
  onRemove?: () => void;
  showProgress?: boolean;
  progress?: number;
  status?: "pending" | "uploading" | "completed" | "error";
  error?: string;
  // Individual metadata props
  title?: string;
  description?: string;
  tags?: string;
  isPublic?: boolean;
  onTitleChange?: (title: string) => void;
  onDescriptionChange?: (description: string) => void;
  onTagsChange?: (tags: string) => void;
  onIsPublicChange?: (isPublic: boolean) => void;
  showMetadataForm?: boolean;
  disabled?: boolean;
}

// Helper function to get file type icon
const getFileTypeIcon = (file: File) => {
  const extension = file.name.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "pdf":
      return <FileText className="w-8 h-8 text-purple-600" />;
    case "docx":
    case "doc":
      return <FileText className="w-8 h-8 text-blue-500" />;
    case "xlsx":
    case "xls":
      return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
    case "pptx":
    case "ppt":
      return <Presentation className="w-8 h-8 text-orange-500" />;
    case "txt":
    case "md":
      return <FileText className="w-8 h-8 text-gray-500" />;
    default:
      return <File className="w-8 h-8 text-gray-400" />;
  }
};

export const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  onRemove,
  showProgress = false,
  progress = 0,
  status = "pending",
  error,
  title,
  description,
  tags,
  isPublic,
  onTitleChange,
  onDescriptionChange,
  onTagsChange,
  onIsPublicChange,
  showMetadataForm = false,
  disabled = false,
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case "uploading":
        return <Clock className="w-8 h-8 text-blue-500" />;
      case "completed":
        return <CheckCircle2 className="w-8 h-8 text-green-500" />;
      case "error":
        return <XCircle className="w-8 h-8 text-red-500" />;
      default:
        return getFileTypeIcon(file);
    }
  };

  const getStatusClasses = () => {
    const baseClasses = "border rounded-lg transition-colors duration-200";

    switch (status) {
      case "uploading":
        return `${baseClasses} border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/30`;
      case "completed":
        return `${baseClasses} border-green-400 bg-green-50 dark:border-green-500 dark:bg-green-950/30`;
      case "error":
        return `${baseClasses} border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-950/30`;
      default:
        return `${baseClasses} border-[var(--border)] bg-[var(--background)] hover:border-[var(--border-hover)]`;
    }
  };

  return (
    <div className={getStatusClasses()}>
      <div className={`flex items-center p-4`}>
        <div className="flex items-center flex-1 min-w-0">
          <div className="mr-3">{getStatusIcon()}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-[var(--foreground)]">
              {file.name}
            </p>
            <div className="flex items-center space-x-2 text-xs text-[var(--foreground-secondary)]">
              <span>{documentService.formatFileSize(file.size)}</span>
              {status === "uploading" && showProgress && (
                <span>• {progress}%</span>
              )}
            </div>

            {showProgress && status === "uploading" && (
              <div className="mt-2">
                <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300 ease-out rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {error && <p className="text-xs mt-1 text-red-500 dark:text-red-400">{error}</p>}
          </div>
        </div>

        {onRemove && status !== "uploading" && (
          <button
            onClick={onRemove}
            className="ml-3 p-1 text-[var(--foreground-secondary)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors duration-200"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Individual Metadata Form */}
      {showMetadataForm && (
        <div className="border-t border-[var(--border)] p-4 bg-[var(--background-secondary)] space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title || ""}
                onChange={(e) => onTitleChange?.(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder-[var(--foreground-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Document title"
                disabled={disabled}
                maxLength={255}
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                Tags
              </label>
              <input
                type="text"
                value={tags || ""}
                onChange={(e) => onTagsChange?.(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder-[var(--foreground-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="tag1, tag2, tag3"
                disabled={disabled}
                maxLength={500}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
              Description
            </label>
            <textarea
              value={description || ""}
              onChange={(e) => onDescriptionChange?.(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder-[var(--foreground-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
              placeholder="Document description (optional)"
              disabled={disabled}
              maxLength={1000}
            />
          </div>

          {/* Make Public */}
          <div>
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic || false}
                onChange={(e) => onIsPublicChange?.(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 focus:ring-2 bg-[var(--background)]"
                disabled={disabled}
              />
              <div>
                <span className="text-sm font-medium text-[var(--foreground)]">
                  Make this document public
                </span>
                <p className="text-xs text-[var(--foreground-secondary)] mt-1">
                  Public documents can be viewed by anyone with the link
                </p>
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilePreview;
