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
  File as FileIcon,
} from "lucide-react";
import { formatFileSize } from "@/utils";

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
  const [pdfPreviewUrl, setPdfPreviewUrl] = React.useState<string | null>(null);

  // Generate PDF blob URL for preview
  React.useEffect(() => {
    if (file.type === 'application/pdf' && status !== 'error') {
      const url = URL.createObjectURL(file);
      setPdfPreviewUrl(url);
      
      return () => {
        URL.revokeObjectURL(url);
        setPdfPreviewUrl(null);
      };
    }
  }, [file, status]);

  const getStatusIcon = () => {
    // Show PDF mini preview for PDF files (when available and not in error state)
    if (file.type === "application/pdf" && pdfPreviewUrl && status !== "error") {
      return (
        <div className="w-16 h-20 bg-white rounded border overflow-hidden shadow-sm">
          <iframe
            src={pdfPreviewUrl}
            className="w-full h-full border-0 pointer-events-none"
            style={{
              width: "200%",
              height: "200%",
              transform: "scale(0.5)",
              transformOrigin: "top left",
            }}
            title="PDF Preview"
          />
        </div>
      );
    }

    const getIconByMimeType = () => {
      const mimeType = file.type;
      const className = "w-8 h-8";

      switch (mimeType) {
        case "application/pdf":
          return <FileText className={`${className} text-danger`} />;
        case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        case "application/msword":
        case "text/plain":
        case "text/markdown":
          return <FileText className={`${className} text-info`} />;
        case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        case "application/vnd.ms-excel":
          return <FileSpreadsheet className={`${className} text-success`} />;
        case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        case "application/vnd.ms-powerpoint":
          return <Presentation className={`${className} text-warning`} />;
        default:
          return <FileIcon className={`${className} text-foreground-secondary`} />;
      }
    };

    // Default status icons
    switch (status) {
      case "uploading":
        return <Clock className="w-8 h-8 text-info" />;
      case "completed":
        // For non-PDF files, show checkmark. For PDF files, show file icon if thumbnail failed
        if (file.type !== "application/pdf") {
          return <CheckCircle2 className="w-8 h-8 text-success" />;
        }
        return getIconByMimeType();
      case "error":
        return <XCircle className="w-8 h-8 text-danger" />;
      default:
        return getIconByMimeType();
    }
  };

  const getStatusClasses = () => {
    const baseClasses = "border rounded-lg transition-colors duration-200";

    switch (status) {
      case "uploading":
        return `${baseClasses} border-info bg-blue-50 dark:border-info dark:bg-blue-950/30`;
      case "completed":
        return `${baseClasses} border-success bg-green-50 dark:border-success dark:bg-green-950/30`;
      case "error":
        return `${baseClasses} border-danger bg-red-50 dark:border-danger dark:bg-red-950/30`;
      default:
        return `${baseClasses} border-border bg-background hover:border-border-hover`;
    }
  };

  return (
    <div className={getStatusClasses()}>
      <div className={`flex items-center p-4`}>
        <div className="flex items-center flex-1 min-w-0">
          <div className="mr-3">{getStatusIcon()}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-foreground">
              {file.name}
            </p>
            <div className="flex items-center space-x-2 text-xs text-foreground-secondary">
              <span>{formatFileSize(file.size)}</span>
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

            {error && <p className="text-xs mt-1 text-danger">{error}</p>}
          </div>
        </div>

        {onRemove && status !== "uploading" && (
          <button
            onClick={onRemove}
            className="ml-3 p-1 text-foreground-secondary hover:text-danger hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors duration-200"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Individual Metadata Form */}
      {showMetadataForm && (
        <div className="border-t border-border p-4 bg-background-secondary space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                Title <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={title || ""}
                onChange={(e) => onTitleChange?.(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-foreground-secondary focus:outline-none focus:ring-2 focus:ring-info focus:border-transparent transition-all duration-200"
                placeholder="Document title"
                disabled={disabled}
                maxLength={255}
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                Tags
              </label>
              <input
                type="text"
                value={tags || ""}
                onChange={(e) => onTagsChange?.(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-foreground-secondary focus:outline-none focus:ring-2 focus:ring-info focus:border-transparent transition-all duration-200"
                placeholder="tag1, tag2, tag3"
                disabled={disabled}
                maxLength={500}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">
              Description
            </label>
            <textarea
              value={description || ""}
              onChange={(e) => onDescriptionChange?.(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-foreground-secondary focus:outline-none focus:ring-2 focus:ring-info focus:border-transparent transition-all duration-200 resize-none"
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
                className="mt-0.5 h-4 w-4 rounded border-border text-info-dark focus:ring-info focus:ring-2 bg-background"
                disabled={disabled}
              />
              <div>
                <span className="text-sm font-medium text-foreground">
                  Make this document public
                </span>
                <p className="text-xs text-foreground-secondary mt-1">
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
