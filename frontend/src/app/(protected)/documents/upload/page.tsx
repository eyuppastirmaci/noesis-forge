"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { XCircle, Loader2 } from "lucide-react";
import {
  BulkUploadDocumentRequest,
  BulkUploadResponse,
  isApiClientError,
  extractFieldErrors,
  getErrorMessage,
  DOCUMENT_QUERY_KEYS,
} from "@/types";
import {
  documentMutations,
  documentService,
} from "@/services/document.services";
import FileUploadZone from "@/components/FileUploadZone";
import FilePreview from "@/components/FilePreview";

interface UploadedFile {
  id: string;
  file: File; // Store the original File object
  preview?: string;
  uploadProgress?: number;
  uploadStatus?: "pending" | "uploading" | "completed" | "error";
  uploadError?: string;
  fieldErrors?: Record<string, string>;
  // Individual metadata for each file
  title: string;
  description: string;
  tags: string;
  isPublic: boolean;
}

const DocumentUploadPage: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [globalIsPublic, setGlobalIsPublic] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [bulkUploadResults, setBulkUploadResults] =
    useState<BulkUploadResponse | null>(null);

  const bulkUploadMutation = useMutation(documentMutations.bulkUpload());

  // Calculate global checkbox state based on individual files
  const calculateGlobalState = (files: UploadedFile[]) => {
    if (files.length === 0) return { checked: false, indeterminate: false };

    const publicCount = files.filter((file) => file.isPublic).length;

    if (publicCount === 0) {
      return { checked: false, indeterminate: false };
    } else if (publicCount === files.length) {
      return { checked: true, indeterminate: false };
    } else {
      return { checked: false, indeterminate: true };
    }
  };

  // Global checkbox state
  const globalCheckboxState = React.useMemo(
    () => calculateGlobalState(files),
    [files]
  );

  // Update global checkbox when files change
  React.useEffect(() => {
    setGlobalIsPublic(globalCheckboxState.checked);
  }, [globalCheckboxState.checked]);

  // Ref for the global checkbox to set indeterminate property
  const globalCheckboxRef = React.useRef<HTMLInputElement>(null);

  // Set indeterminate property on the checkbox element
  React.useEffect(() => {
    if (globalCheckboxRef.current) {
      globalCheckboxRef.current.indeterminate =
        globalCheckboxState.indeterminate;
    }
  }, [globalCheckboxState.indeterminate]);

  const handleFilesSelected = (newFiles: File[]) => {
    const uploadedFiles: UploadedFile[] = newFiles.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file: file,
      preview: URL.createObjectURL(file),
      uploadProgress: 0,
      uploadStatus: "pending" as const,
      fieldErrors: {},
      title: documentService.getFilenameWithoutExtension(file.name), // Auto-populate title
      description: "",
      tags: "",
      isPublic: globalIsPublic, // Use current global setting as default
    }));

    setFiles((prevFiles) => [...prevFiles, ...uploadedFiles]);

    // Clear previous form errors when new files are added
    setFormErrors({});
    setGeneralError("");
  };

  const removeFile = (fileId: string) => {
    setFiles((prevFiles) => {
      const newFiles = prevFiles.filter((f) => f.id !== fileId);
      const removedFile = prevFiles.find((f) => f.id === fileId);
      if (removedFile?.preview) {
        URL.revokeObjectURL(removedFile.preview);
      }
      return newFiles;
    });
  };

  // Individual file metadata update functions
  const updateFileMetadata = (
    fileId: string,
    field: keyof UploadedFile,
    value: any
  ) => {
    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.id === fileId ? { ...file, [field]: value } : file
      )
    );
  };

  // Handle global public checkbox change
  const handleGlobalPublicChange = (checked: boolean) => {
    const newState = globalCheckboxState.indeterminate ? true : checked;

    setGlobalIsPublic(newState);
    // Update all files to match the new state
    setFiles((prevFiles) =>
      prevFiles.map((file) => ({ ...file, isPublic: newState }))
    );
  };

  // Handle individual file public checkbox change
  const handleFilePublicChange = (fileId: string, checked: boolean) => {
    updateFileMetadata(fileId, "isPublic", checked);
    // Note: Global state will be updated automatically via useEffect
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setFormErrors({});
    setGeneralError("");
    setBulkUploadResults(null);

    if (files.length === 0) {
      setGeneralError("Please select at least one file to upload");
      return;
    }

    // Client-side validation for each file
    const errors: Record<string, string> = {};

    files.forEach((file, index) => {
      if (!file.title.trim()) {
        errors[
          `file_${index}_title`
        ] = `Title is required for ${file.file.name}`;
      }
      if (file.title.length > 255) {
        errors[`file_${index}_title`] = `Title too long for ${file.file.name}`;
      }
      if (file.description.length > 1000) {
        errors[
          `file_${index}_description`
        ] = `Description too long for ${file.file.name}`;
      }
      if (file.tags.length > 500) {
        errors[`file_${index}_tags`] = `Tags too long for ${file.file.name}`;
      }
    });

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Check for files with errors
    const invalidFiles = files.filter((file) => file.uploadStatus === "error");
    if (invalidFiles.length > 0) {
      setGeneralError("Please fix file errors before uploading");
      return;
    }

    try {
      // Mark all files as uploading
      setFiles((prevFiles) =>
        prevFiles.map((file) => ({
          ...file,
          uploadStatus: "uploading" as const,
          uploadProgress: 0,
        }))
      );

      // Create bulk request with individual metadata for each file
      const bulkRequest: BulkUploadDocumentRequest = {
        files: files.map((f) => f.file), // Extract File objects
        metadata: files.map((f) => ({
          title: f.title,
          description: f.description,
          tags: f.tags,
          isPublic: f.isPublic,
        })),
      };

      const response = await bulkUploadMutation.mutateAsync({
        request: bulkRequest,
        onProgress: (progress) => {
          setUploadProgress(progress);
          // Update all files with the same progress
          setFiles((prevFiles) =>
            prevFiles.map((file) => ({ ...file, uploadProgress: progress }))
          );
        },
      });

      setBulkUploadResults(response);

      // Update file statuses based on results
      setFiles((prevFiles) => {
        return prevFiles.map((file, index) => {
          // Check if this file failed
          const failure = response.failures?.find(
            (f) => f.filename === file.file.name
          );
          if (failure) {
            return {
              ...file,
              uploadStatus: "error" as const,
              uploadError: failure.error,
              uploadProgress: 0,
            };
          } else {
            return {
              ...file,
              uploadStatus: "completed" as const,
              uploadProgress: 100,
            };
          }
        });
      });

      // Invalidate documents list
      queryClient.invalidateQueries({
        queryKey: DOCUMENT_QUERY_KEYS.DOCUMENTS.ALL,
      });

      // Note: Removed automatic redirect - let user decide when to navigate
    } catch (error: any) {
      console.error("Bulk upload error:", error);

      // Extract field errors from the error
      const fieldErrors = extractFieldErrors(error);

      let errorMessage = getErrorMessage(error);

      // If it's a validation error, set form errors
      if (isApiClientError(error) && error.isValidationError()) {
        setFormErrors(fieldErrors);
      }

      // Update all file statuses to error
      setFiles((prevFiles) =>
        prevFiles.map((file) => ({
          ...file,
          uploadStatus: "error" as const,
          uploadError: errorMessage,
          uploadProgress: 0,
        }))
      );

      // Set general error if no specific field errors
      if (Object.keys(fieldErrors).length === 0) {
        setGeneralError(errorMessage);
      }
    }
  };

  const clearAllFiles = () => {
    files.forEach((file) => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setFiles([]);
    setGlobalIsPublic(false);
    setFormErrors({});
    setGeneralError("");
    setBulkUploadResults(null);
    setUploadProgress(0);
  };

  // Cleanup URLs on unmount
  React.useEffect(() => {
    return () => {
      files.forEach((file) => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [files]);

  return (
    <div className="flex-1 max-h-[calc(100vh-102px)] overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 bg-background">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-foreground">
            Upload Documents
          </h1>
          <p className="text-foreground-secondary">
            Upload your documents to make them searchable and accessible.
            Supported formats: PDF, DOCX, DOC, TXT, XLSX, XLS, PPTX, PPT, MD
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Error Message */}
          {generalError && (
            <div className="alert alert-error">
              <div className="flex">
                <div className="text-red-500">
                  <XCircle className="h-5 w-5" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{generalError}</p>
                </div>
              </div>
            </div>
          )}

          {/* File Upload Zone */}
          <div className="card p-6">
            <FileUploadZone
              onFilesSelected={handleFilesSelected}
              disabled={uploadProgress > 0}
              maxFiles={10}
              maxSize={100 * 1024 * 1024} // 100MB
            />
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="card p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-foreground">
                  {bulkUploadResults ? "Uploaded Files" : "Selected Files"} (
                  {files.length})
                </h3>
                {!bulkUploadResults && (
                  <button
                    type="button"
                    onClick={clearAllFiles}
                    className="text-sm text-red-500 hover:text-red-700 transition-colors duration-200"
                    disabled={uploadProgress > 0}
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {files.map((uploadedFile, index) => (
                  <FilePreview
                    key={uploadedFile.id}
                    file={uploadedFile.file}
                    onRemove={
                      !bulkUploadResults
                        ? () => removeFile(uploadedFile.id)
                        : undefined
                    }
                    showProgress={true}
                    progress={uploadedFile.uploadProgress}
                    status={uploadedFile.uploadStatus}
                    error={uploadedFile.uploadError}
                    // Individual metadata props
                    title={uploadedFile.title}
                    description={uploadedFile.description}
                    tags={uploadedFile.tags}
                    isPublic={uploadedFile.isPublic}
                    onTitleChange={(title) =>
                      updateFileMetadata(uploadedFile.id, "title", title)
                    }
                    onDescriptionChange={(description) =>
                      updateFileMetadata(
                        uploadedFile.id,
                        "description",
                        description
                      )
                    }
                    onTagsChange={(tags) =>
                      updateFileMetadata(uploadedFile.id, "tags", tags)
                    }
                    onIsPublicChange={(isPublic) =>
                      handleFilePublicChange(uploadedFile.id, isPublic)
                    }
                    showMetadataForm={!bulkUploadResults}
                    disabled={uploadProgress > 0}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Global Settings */}
          {files.length > 0 && !bulkUploadResults && (
            <div className="card p-6">
              <h3 className="text-lg font-medium mb-4 text-foreground">
                Global Settings
              </h3>
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={globalIsPublic}
                    onChange={(e) => handleGlobalPublicChange(e.target.checked)}
                    className="rounded focus:ring-2 focus:ring-blue-200 border-gray-200 text-blue-500"
                    disabled={uploadProgress > 0}
                    ref={globalCheckboxRef}
                  />
                  <span className="text-sm font-medium text-foreground">
                    Make all documents public (overrides individual settings)
                  </span>
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  When enabled, all uploaded documents will be public regardless
                  of individual settings
                </p>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="card p-6">
              <h3 className="text-lg font-medium mb-4 text-foreground">
                Upload Progress
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading {files.length} files...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="progress-bar w-full h-2">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Upload Results */}
          {bulkUploadResults && (
            <div className="card p-6">
              <h3 className="text-lg font-medium mb-4 text-foreground">
                Upload Results
              </h3>
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {bulkUploadResults.successful_uploads}
                    </div>
                    <div className="text-sm text-green-700">Successful</div>
                  </div>
                  <div className="bg-red-100 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {bulkUploadResults.failed_uploads}
                    </div>
                    <div className="text-sm text-red-700">Failed</div>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {bulkUploadResults.total_files}
                    </div>
                    <div className="text-sm text-blue-700">Total</div>
                  </div>
                </div>

                {/* Failures */}
                {bulkUploadResults.failures &&
                  bulkUploadResults.failures.length > 0 && (
                    <div>
                      <h4 className="font-medium text-red-700 mb-2">
                        Failed Uploads:
                      </h4>
                      <div className="space-y-2">
                        {bulkUploadResults.failures.map((failure, index) => (
                          <div
                            key={index}
                            className="bg-red-50 p-3 rounded border-l-4 border-red-400"
                          >
                            <div className="font-medium text-red-800">
                              {failure.filename}
                            </div>
                            <div className="text-sm text-red-600">
                              {failure.error}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Success message */}
                {bulkUploadResults.successful_uploads > 0 && (
                  <div className="bg-green-50 p-3 rounded border-l-4 border-green-400">
                    <div className="text-green-800">
                      ✅ {bulkUploadResults.successful_uploads} file
                      {bulkUploadResults.successful_uploads > 1 ? "s" : ""}{" "}
                      uploaded successfully!
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons After Upload */}
          {bulkUploadResults && (
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={clearAllFiles}
                className="btn-secondary px-6 py-3 rounded-md"
              >
                Upload More Files
              </button>
              <button
                type="button"
                onClick={() => router.push("/documents")}
                className="btn-primary px-6 py-3 rounded-md"
              >
                Go to Documents
              </button>
            </div>
          )}

          {/* Form Validation Errors */}
          {Object.keys(formErrors).length > 0 && (
            <div className="alert alert-error">
              <h4 className="text-sm font-medium mb-2 text-red-700">
                Please fix the following errors:
              </h4>
              <ul className="text-sm space-y-1 text-red-700">
                {Object.entries(formErrors).map(([field, error]) => (
                  <li key={field}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Submit Button */}
          {files.length > 0 && !bulkUploadResults && (
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="btn-secondary px-6 py-3 rounded-md disabled:opacity-50"
                disabled={uploadProgress > 0}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  uploadProgress > 0 ||
                  files.length === 0 ||
                  files.some((file) => file.uploadStatus === "error") ||
                  Object.keys(formErrors).length > 0
                }
                className="btn-primary px-6 py-3 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {uploadProgress > 0 && (
                  <Loader2 className="animate-spin h-4 w-4" />
                )}
                <span>
                  {uploadProgress > 0
                    ? "Uploading..."
                    : `Upload ${files.length} File${
                        files.length > 1 ? "s" : ""
                      }`}
                </span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default DocumentUploadPage;
