"use client";

import React, { useCallback, useRef, useState } from "react";
import { 
  X, 
  Upload, 
  FolderOpen, 
  AlertTriangle
} from "lucide-react";
import { formatFileSize, validateFile } from "@/utils";

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number; // in bytes
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

interface FileError {
  file: File;
  error: string;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFilesSelected,
  accept = ".pdf,.docx,.doc,.txt,.xlsx,.xls,.pptx,.ppt,.md",
  multiple = true,
  maxFiles = 10,
  maxSize = 100 * 1024 * 1024, // 100MB
  disabled = false,
  className = "",
  children,
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isDragReject, setIsDragReject] = useState(false);
  const [errors, setErrors] = useState<FileError[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFiles = useCallback(
    (files: File[]): { validFiles: File[]; errors: FileError[] } => {
      const validFiles: File[] = [];
      const errors: FileError[] = [];

      // Check number of files
      if (files.length > maxFiles) {
        return {
          validFiles: [],
          errors: [
            {
              file: files[0],
              error: `Too many files. Maximum ${maxFiles} files allowed.`,
            },
          ],
        };
      }

      files.forEach((file) => {
        const validation = validateFile(file, maxSize);

        if (!validation.isValid) {
          errors.push({ file, error: validation.error || "Invalid file" });
        } else {
          validFiles.push(file);
        }
      });

      return { validFiles, errors };
    },
    [maxFiles, maxSize]
  );

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      if (disabled) return;

      const fileArray = Array.from(files);
      const { validFiles, errors } = validateFiles(fileArray);

      // Set errors in state to display them
      setErrors(errors);

      if (errors.length > 0) {
        // Log errors for debugging
        console.error("File validation errors:", errors);
        errors.forEach(({ file, error }) => {
          console.error(`${file.name}: ${error}`);
        });
      }

      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    },
    [disabled, validateFiles, onFilesSelected]
  );

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const onDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (disabled) return;

      // Clear previous errors when dragging new files
      setErrors([]);

      const items = Array.from(e.dataTransfer.items);
      const hasInvalidFiles = items.some((item) => {
        if (item.kind === "file") {
          const file = item.getAsFile();
          return file && !validateFile(file).isValid;
        }
        return false;
      });

      setIsDragActive(true);
      setIsDragReject(hasInvalidFiles);
    },
    [disabled]
  );

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragActive(false);
      setIsDragReject(false);
    }
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      setIsDragActive(false);
      setIsDragReject(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      handleFiles(files);
    },
    [disabled, handleFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Clear previous errors when selecting new files
      setErrors([]);
      
      if (e.target.files) {
        handleFiles(e.target.files);
        // Reset input value to allow selecting the same file again
        e.target.value = "";
      }
    },
    [handleFiles]
  );

  const openFileDialog = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const getZoneClasses = () => {
    let classes = "upload-zone p-8 text-center transition-all duration-200";

    if (disabled) {
      classes += " disabled";
    } else if (isDragReject) {
      classes += " drag-reject";
    } else if (isDragActive) {
      classes += " drag-active";
    }

    if (!disabled) {
      classes += " cursor-pointer";
    }

    return classes;
  };

  const getStatusMessage = () => {
    if (disabled) {
      return "Upload disabled";
    }

    if (isDragReject) {
      return "Some files are not supported";
    }

    if (isDragActive) {
      return "Drop files here";
    }

    return multiple
      ? "Drag files here or click to select"
      : "Drag file here or click to select";
  };

  const getIcon = () => {
    if (isDragReject) {
      return <AlertTriangle className="w-12 h-12 text-red-500" />;
    }

    if (isDragActive) {
      return <FolderOpen className="w-12 h-12 text-blue-500" />;
    }

    return <Upload className="w-12 h-12 text-gray-400" />;
  };

  const getTextColor = () => {
    if (isDragReject) {
      return "text-red-700";
    }
    if (isDragActive) {
      return "text-blue-700";
    }
    return "text-foreground";
  };

  return (
    <div className={className}>
      <div
        className={getZoneClasses()}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />

        {children || (
          <div className="space-y-4">
            <div className="flex justify-center">{getIcon()}</div>
            <div>
              <p className={`text-lg font-medium mb-2 ${getTextColor()}`}>
                {getStatusMessage()}
              </p>
              <p className="text-sm text-gray-600">
                Supported formats: PDF, DOCX, DOC, TXT, XLSX, XLS, PPTX, PPT, MD
              </p>
              <p className="text-xs mt-1 text-gray-500">
                Maximum {formatFileSize(maxSize)} per file
                {multiple && `, up to ${maxFiles} files`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">
                File Upload Error{errors.length > 1 ? "s" : ""}
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc pl-5 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>
                      <span className="font-medium">{error.file.name}:</span> {error.error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  type="button"
                  onClick={clearErrors}
                  className="inline-flex bg-red-50 rounded-md p-1.5 text-red-400 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
                >
                  <span className="sr-only">Dismiss</span>
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploadZone;