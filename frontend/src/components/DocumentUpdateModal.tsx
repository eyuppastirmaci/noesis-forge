"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Upload, X, FileText } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Document, UpdateDocumentRequest } from "@/types";
import { documentService } from "@/services/document.services";
import { toast } from "@/utils";

interface DocumentUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document;
  onUpdate: (request: UpdateDocumentRequest) => Promise<void>;
  isUpdating: boolean;
}

const DocumentUpdateModal: React.FC<DocumentUpdateModalProps> = ({
  isOpen,
  onClose,
  document,
  onUpdate,
  isUpdating,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Initialize form with current document data
  useEffect(() => {
    if (document && isOpen) {
      setTitle(document.title);
      setDescription(document.description || "");
      setTags(document.tags || "");
      setIsPublic(document.isPublic);
      setSelectedFile(null);
      setFileError(null);
      setUploadProgress(0);
    }
  }, [document, isOpen]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Validate file
    const validation = documentService.validateFile(file);
    if (!validation.isValid) {
      setFileError(validation.error || "Invalid file");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  }, []);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    setFileError(null);
    // Reset file input
    const fileInput = window.document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFileError(null);

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    const updateRequest: UpdateDocumentRequest = {
      title: title.trim(),
      description: description.trim(),
      tags: tags.trim(),
      isPublic,
      file: selectedFile || undefined,
    };

    try {
      await onUpdate(updateRequest);
    } catch (error) {
      console.error("Update failed:", error);
    }
  }, [title, description, tags, isPublic, selectedFile, onUpdate]);

  const handleClose = useCallback(() => {
    if (isUpdating) return; // Prevent closing during update
    onClose();
  }, [isUpdating, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      closeOnOverlayClick={!isUpdating}
      closeOnEscape={!isUpdating}
    >
      <Modal.Header>
        Update Document
      </Modal.Header>

      <Modal.Content>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Document Info */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Document
            </h3>
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <p className="font-medium">{document.originalFileName}</p>
                <p className="text-sm text-gray-500">
                  Version {document.version} • {documentService.formatFileSize(document.fileSize)}
                </p>
              </div>
            </div>
          </div>

          {/* Title Field */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-2">
              Title *
            </label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter document title"
              required
              disabled={isUpdating}
              className="w-full"
            />
          </div>

          {/* Description Field */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter document description (optional)"
              disabled={isUpdating}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground resize-none"
            />
          </div>

          {/* Tags Field */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium mb-2">
              Tags
            </label>
            <Input
              id="tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Enter tags separated by commas"
              disabled={isUpdating}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Separate multiple tags with commas (e.g., research, pdf, important)
            </p>
          </div>

          {/* Visibility */}
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                disabled={isUpdating}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium">Make document public</span>
            </label>
          </div>

          {/* File Upload (Optional) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Replace File (Optional)
            </label>
            {selectedFile ? (
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-6 h-6 text-blue-600" />
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {documentService.formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    disabled={isUpdating}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <label
                htmlFor="file-upload"
                className="block border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
              >
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <span className="mt-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Click to upload a new file
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, DOCX, TXT, XLSX, PPTX up to 100MB
                    </p>
                  </div>
                </div>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  accept=".pdf,.docx,.doc,.txt,.xlsx,.xls,.pptx,.ppt,.md"
                  onChange={handleFileChange}
                  disabled={isUpdating}
                />
              </label>
            )}
            {fileError && (
              <p className="mt-2 text-sm text-red-600">{fileError}</p>
            )}
          </div>

          {/* Upload Progress */}
          {isUpdating && uploadProgress > 0 && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </form>
      </Modal.Content>

      <Modal.Footer>
        <Button
          type="button"
          variant="secondary"
          onClick={handleClose}
          disabled={isUpdating}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={handleSubmit}
          disabled={isUpdating || !title.trim()}
        >
          {isUpdating ? "Updating..." : "Update Document"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DocumentUpdateModal; 