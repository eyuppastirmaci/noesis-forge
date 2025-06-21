"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { XCircle, Loader2 } from "lucide-react";
import { 
  UploadDocumentRequest, 
  isApiClientError, 
  extractFieldErrors,
  getErrorMessage,
  DOCUMENT_QUERY_KEYS 
} from "@/types";
import { documentMutations, documentService } from "@/services/document.services";
import FileUploadZone from "@/components/FileUploadZone";
import FilePreview from "@/components/FilePreview";

interface UploadedFile extends File {
  id: string;
  preview?: string;
  uploadProgress?: number;
  uploadStatus?: 'pending' | 'uploading' | 'completed' | 'error';
  uploadError?: string;
  fieldErrors?: Record<string, string>;
}

const DocumentUploadPage: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    tags: "",
    isPublic: false,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  const uploadMutation = useMutation(documentMutations.upload());

  const handleFilesSelected = (newFiles: File[]) => {
    const uploadedFiles: UploadedFile[] = newFiles.map((file) => 
      Object.assign(file, {
        id: `${Date.now()}-${Math.random()}`,
        preview: URL.createObjectURL(file),
        uploadProgress: 0,
        uploadStatus: 'pending' as const,
        fieldErrors: {},
      })
    );

    setFiles(prevFiles => [...prevFiles, ...uploadedFiles]);

    // Set title from first file if empty and only one file
    const firstFile = uploadedFiles[0];
    if (firstFile && !formData.title && uploadedFiles.length === 1) {
      setFormData(prev => ({
        ...prev,
        title: documentService.getFilenameWithoutExtension(firstFile.name),
      }));
    }

    // Clear previous form errors when new files are added
    setFormErrors({});
    setGeneralError("");
  };

  const removeFile = (fileId: string) => {
    setFiles(prevFiles => {
      const newFiles = prevFiles.filter(f => f.id !== fileId);
      const removedFile = prevFiles.find(f => f.id === fileId);
      if (removedFile?.preview) {
        URL.revokeObjectURL(removedFile.preview);
      }
      return newFiles;
    });
  };

  const uploadFile = async (file: UploadedFile, index: number) => {
    const request: UploadDocumentRequest = {
      file,
      title: files.length === 1 ? formData.title : documentService.getFilenameWithoutExtension(file.name),
      description: files.length === 1 ? formData.description : "",
      tags: formData.tags,
      isPublic: formData.isPublic,
    };

    try {
      // Clear previous errors
      setFormErrors({});
      setGeneralError("");
      
      // Update file status
      setFiles(prevFiles => {
        const newFiles = [...prevFiles];
        newFiles[index] = { ...newFiles[index], uploadStatus: 'uploading', uploadProgress: 0, fieldErrors: {} };
        return newFiles;
      });

      await uploadMutation.mutateAsync({
        request,
        onProgress: (progress) => {
          setFiles(prevFiles => {
            const newFiles = [...prevFiles];
            newFiles[index] = { ...newFiles[index], uploadProgress: progress };
            return newFiles;
          });
        },
      });

      // Update file status to completed
      setFiles(prevFiles => {
        const newFiles = [...prevFiles];
        newFiles[index] = { ...newFiles[index], uploadStatus: 'completed', uploadProgress: 100, fieldErrors: {} };
        return newFiles;
      });

    } catch (error: any) {
      console.error('Upload error:', error);
      
      // Extract field errors from the error
      const fieldErrors = extractFieldErrors(error);
      
      let errorMessage = getErrorMessage(error);
      
      // If it's a validation error, set form errors
      if (isApiClientError(error) && error.isValidationError()) {
        setFormErrors(fieldErrors);
      }

      // Update file status to error
      setFiles(prevFiles => {
        const newFiles = [...prevFiles];
        newFiles[index] = { 
          ...newFiles[index], 
          uploadStatus: 'error', 
          uploadError: errorMessage,
          fieldErrors: fieldErrors
        };
        return newFiles;
      });

      // Set general error if no specific field errors
      if (Object.keys(fieldErrors).length === 0) {
        setGeneralError(errorMessage);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setFormErrors({});
    setGeneralError("");
    
    if (files.length === 0) {
      setGeneralError("Please select at least one file to upload");
      return;
    }

    // Client-side validation for single file upload
    if (files.length === 1) {
      const errors: Record<string, string> = {};
      
      if (!formData.title.trim()) {
        errors.title = "Title is required";
      } else if (formData.title.length > 255) {
        errors.title = "Title must be at most 255 characters";
      }
      
      if (formData.description.length > 1000) {
        errors.description = "Description must be at most 1000 characters";
      }
      
      if (formData.tags.length > 500) {
        errors.tags = "Tags must be at most 500 characters";
      }
      
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }
    }

    // Check for files with errors
    const invalidFiles = files.filter(file => file.uploadStatus === 'error');
    if (invalidFiles.length > 0) {
      setGeneralError("Please fix file errors before uploading");
      return;
    }

    setIsUploading(true);

    try {
      // Upload all valid files
      for (let i = 0; i < files.length; i++) {
        if (files[i].uploadStatus === 'pending') {
          await uploadFile(files[i], i);
        }
      }

      // Invalidate documents list
      queryClient.invalidateQueries({ queryKey: DOCUMENT_QUERY_KEYS.DOCUMENTS.ALL });

      // Check if all uploads completed successfully
      const allCompleted = files.every(file => file.uploadStatus === 'completed' || file.uploadStatus === 'error');
      const hasSuccessful = files.some(file => file.uploadStatus === 'completed');
      
      if (allCompleted && hasSuccessful) {
        // Navigate to documents list after successful upload
        router.push("/documents");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const clearAllFiles = () => {
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setFiles([]);
    setFormData({ title: "", description: "", tags: "", isPublic: false });
    setFormErrors({});
    setGeneralError("");
  };

  // Cleanup URLs on unmount
  React.useEffect(() => {
    return () => {
      files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [files]);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-background max-h-[calc(100vh-90px)] overflow-y-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-foreground">
          Upload Documents
        </h1>
        <p className="text-foreground-secondary">
          Upload your documents to make them searchable and accessible. Supported formats: PDF, DOCX, DOC, TXT, XLSX, XLS, PPTX, PPT, MD
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
            disabled={isUploading}
            maxFiles={10}
            maxSize={100 * 1024 * 1024} // 100MB
          />
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="card p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-foreground">
                Selected Files ({files.length})
              </h3>
              <button
                type="button"
                onClick={clearAllFiles}
                className="text-sm text-red-500 hover:text-red-700 transition-colors duration-200"
                disabled={isUploading}
              >
                Clear All
              </button>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
              {files.map((file, index) => (
                <FilePreview
                  key={file.id}
                  file={file}
                  onRemove={() => removeFile(file.id)}
                  showProgress={true}
                  progress={file.uploadProgress}
                  status={file.uploadStatus}
                  error={file.uploadError}
                />
              ))}
            </div>
          </div>
        )}

        {/* Metadata Form */}
        {files.length > 0 && (
          <div className="card p-6">
            <h3 className="text-lg font-medium mb-4 text-foreground">
              Document Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  Title {files.length === 1 && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, title: e.target.value }));
                    if (formErrors.title) {
                      setFormErrors(prev => ({ ...prev, title: '' }));
                    }
                  }}
                  className={`form-input w-full px-3 py-2 rounded-md focus-ring ${formErrors.title ? 'error' : ''}`}
                  placeholder={files.length === 1 ? "Enter document title" : "Will use filename for each document"}
                  disabled={files.length > 1 || isUploading}
                />
                {formErrors.title && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.title}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  Tags
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, tags: e.target.value }));
                    if (formErrors.tags) {
                      setFormErrors(prev => ({ ...prev, tags: '' }));
                    }
                  }}
                  className={`form-input w-full px-3 py-2 rounded-md focus-ring ${formErrors.tags ? 'error' : ''}`}
                  placeholder="tag1, tag2, tag3"
                  disabled={isUploading}
                />
                {formErrors.tags && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.tags}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2 text-foreground">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }));
                    if (formErrors.description) {
                      setFormErrors(prev => ({ ...prev, description: '' }));
                    }
                  }}
                  rows={3}
                  className={`form-input w-full px-3 py-2 rounded-md focus-ring ${formErrors.description ? 'error' : ''}`}
                  placeholder={files.length === 1 ? "Enter document description" : "Will be empty for multiple documents"}
                  disabled={files.length > 1 || isUploading}
                />
                {formErrors.description && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.description}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.isPublic}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        isPublic: e.target.checked,
                      }))
                    }
                    className="rounded focus:ring-2 focus:ring-blue-200 border-gray-200 text-blue-500"
                    disabled={isUploading}
                  />
                  <span className="text-sm font-medium text-foreground">
                    Make this document public
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Form Validation Errors */}
        {Object.keys(formErrors).length > 0 && (
          <div className="alert alert-error">
            <h4 className="text-sm font-medium mb-2 text-red-700">Please fix the following errors:</h4>
            <ul className="text-sm space-y-1 text-red-700">
              {Object.entries(formErrors).map(([field, error]) => (
                <li key={field}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Submit Button */}
        {files.length > 0 && (
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary px-6 py-3 rounded-md disabled:opacity-50"
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isUploading || 
                files.length === 0 || 
                (files.length === 1 && !formData.title.trim()) ||
                files.some(file => file.uploadStatus === 'error') ||
                Object.keys(formErrors).length > 0
              }
              className="btn-primary px-6 py-3 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isUploading && (
                <Loader2 className="animate-spin h-4 w-4" />
              )}
              <span>
                {isUploading ? "Uploading..." : `Upload ${files.length} File${files.length > 1 ? 's' : ''}`}
              </span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default DocumentUploadPage;