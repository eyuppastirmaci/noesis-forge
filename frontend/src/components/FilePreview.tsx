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
}

// Helper function to get file type icon
const getFileTypeIcon = (file: File) => {
  const extension = file.name.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "pdf":
      return <FileText className="w-8 h-8 text-red-500" />;
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
    const baseClasses = "border rounded-lg";

    switch (status) {
      case "uploading":
        return `${baseClasses} border-blue-500 bg-blue-200`;
      case "completed":
        return `${baseClasses} border-green-500 bg-green-200`;
      case "error":
        return `${baseClasses} border-red-500 bg-red-200`;
      default:
        return `${baseClasses} border-gray-200 bg-background`;
    }
  };

  return (
    <div className={`flex items-center p-3 ${getStatusClasses()}`}>
      <div className="flex items-center flex-1 min-w-0">
        <div className="mr-3">{getStatusIcon()}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate text-foreground">
            {file.name}
          </p>
          <div className="flex items-center space-x-2 text-xs text-gray-600">
            <span>{documentService.formatFileSize(file.size)}</span>
            {status === "uploading" && showProgress && (
              <span>• {progress}%</span>
            )}
          </div>

          {showProgress && status === "uploading" && (
            <div className="mt-2">
              <div className="progress-bar w-full h-1">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {error && <p className="text-xs mt-1 text-red-500">{error}</p>}
        </div>
      </div>

      {onRemove && status !== "uploading" && (
        <button
          onClick={onRemove}
          className="ml-3 text-gray-600 hover:text-red-500 transition-colors duration-200"
          type="button"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default FilePreview;
