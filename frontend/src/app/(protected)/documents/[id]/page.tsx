"use client";

import React, { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Download,
  Trash2,
  Eye,
  Calendar,
  HardDrive,
  Tag,
  ArrowDown,
  Globe,
  Lock,
  Edit,
  RefreshCw,
  Heart,
  } from "lucide-react";
  import Link from "next/link";
  import dynamic from "next/dynamic";

// Dynamically import Image to avoid SSR hydration issues
const Image = dynamic(() => import("next/image"), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full">
      <div className="w-48 h-64 bg-background-secondary rounded border border-border animate-pulse flex items-center justify-center">
        <div className="w-12 h-12 bg-border rounded animate-pulse"></div>
      </div>
    </div>
  )
});

import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import DocumentTypeIndicator from "@/components/DocumentTypeIndicator";
import DocumentUpdateModal from "@/components/DocumentUpdateModal";
import { 
  documentQueries, 
  documentMutations, 
  documentService 
} from "@/services/document.services";
import { favoriteQueries, favoriteMutations } from "@/services/favorite.service";
import { 
  DocumentType, 
  DocumentStatus, 
  UpdateDocumentRequest,
  DOCUMENT_ENDPOINTS,
  DOCUMENT_QUERY_KEYS,
  FAVORITE_QUERY_KEYS,
  getErrorMessage 
} from "@/types";
import { toast, formatDate, formatFileSize } from "@/utils";
import { API_CONFIG } from "@/config/api";
import PDFViewerModal from "@/components/PDFViewerModal";

const DocumentDetailPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const documentId = params.id as string;

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showPDFViewer, setShowPDFViewer] = useState(false);

  // Fetch document details
  const {
    data: documentData,
    isLoading,
    error,
    refetch,
  } = useQuery(documentQueries.detail(documentId));

  // Delete mutation
  const deleteMutation = useMutation({
    ...documentMutations.delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: DOCUMENT_QUERY_KEYS.DOCUMENTS.ALL,
      });
      toast.success("Document deleted successfully");
      router.push("/documents");
    },
    onError: (error) => {
      toast.error(`Failed to delete document: ${getErrorMessage(error)}`);
    },
  });

  // Download mutation
  const downloadMutation = useMutation({
    ...documentMutations.download(),
    onSuccess: () => {
      toast.success("Download started");
    },
    onError: (error) => {
      toast.error(`Failed to download document: ${getErrorMessage(error)}`);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    ...documentMutations.update(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: DOCUMENT_QUERY_KEYS.DOCUMENTS.ALL,
      });
      toast.success("Document updated successfully");
      setShowUpdateModal(false);
      refetch(); // Refresh current document data
    },
    onError: (error) => {
      toast.error(`Failed to update document: ${getErrorMessage(error)}`);
    },
  });

  // Query for favorite status
  const {
    data: favoriteStatus,
    isLoading: isLoadingFavorite,
  } = useQuery(favoriteQueries.status(documentId));

  // Add to favorites mutation
  const addToFavoritesMutation = useMutation({
    ...favoriteMutations.add(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: FAVORITE_QUERY_KEYS.FAVORITES.STATUS(documentId),
      });
      queryClient.invalidateQueries({
        queryKey: FAVORITE_QUERY_KEYS.FAVORITES.LIST,
      });
      toast.success("Document added to favorites");
    },
    onError: (error) => {
      toast.error(`Failed to add to favorites: ${getErrorMessage(error)}`);
    },
  });

  // Remove from favorites mutation
  const removeFromFavoritesMutation = useMutation({
    ...favoriteMutations.remove(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: FAVORITE_QUERY_KEYS.FAVORITES.STATUS(documentId),
      });
      queryClient.invalidateQueries({
        queryKey: FAVORITE_QUERY_KEYS.FAVORITES.LIST,
      });
      toast.success("Document removed from favorites");
    },
    onError: (error) => {
      toast.error(`Failed to remove from favorites: ${getErrorMessage(error)}`);
    },
  });

  const document = documentData?.document;

  const handleDownload = useCallback(async () => {
    if (!document) return;
    
    try {
      await downloadMutation.mutateAsync({
        id: document.id,
        originalFileName: document.originalFileName,
      });
    } catch (error) {
      console.error("Download failed:", error);
    }
  }, [document, downloadMutation]);

  const handleDelete = useCallback(async () => {
    if (!document) return;
    
    try {
      await deleteMutation.mutateAsync(document.id);
    } catch (error) {
      console.error("Delete failed:", error);
    }
  }, [document, deleteMutation]);

  const handlePreview = useCallback(async () => {
    if (!document) return;
    
    try {
      const response = await documentService.getDocumentPreview(document.id);
      const previewUrl = response.data.url;
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error("Preview failed:", error);
      toast.error(`Failed to preview document: ${getErrorMessage(error)}`);
    }
  }, [document]);

  const handleUpdate = useCallback(async (updateRequest: UpdateDocumentRequest) => {
    if (!document) return;
    
    try {
      await updateMutation.mutateAsync({
        documentId: document.id,
        request: updateRequest,
      });
    } catch (error) {
      console.error("Update failed:", error);
    }
  }, [document, updateMutation]);

  const handlePDFViewerOpen = useCallback(() => {
    if (!document) return;
    if (document.fileType === DocumentType.PDF) {
      setShowPDFViewer(true);
    }
  }, [document]);

  const handlePDFViewerClose = useCallback(() => {
    setShowPDFViewer(false);
  }, []);

  const handleFavoriteToggle = useCallback(async () => {
    if (!document || isLoadingFavorite) return;

    try {
      if (favoriteStatus?.isFavorited) {
        await removeFromFavoritesMutation.mutateAsync({ documentId: document.id });
      } else {
        await addToFavoritesMutation.mutateAsync({ documentId: document.id });
      }
    } catch (error) {
      console.error("Favorite toggle failed:", error);
    }
  }, [favoriteStatus?.isFavorited, document, addToFavoritesMutation, removeFromFavoritesMutation, isLoadingFavorite]);

  const getStatusBadge = useCallback((status: DocumentStatus) => {
    const statusConfig = {
      ready: { color: "green" as const, label: "Ready" },
      processing: { color: "yellow" as const, label: "Processing" },
      failed: { color: "red" as const, label: "Failed" },
      deleted: { color: "gray" as const, label: "Deleted" },
    };

    const config = statusConfig[status];
    return (
      <Badge color={config.color} size="sm">
        {config.label}
      </Badge>
    );
  }, []);

  const getVisibilityBadge = useCallback((isPublic: boolean) => {
    return isPublic ? (
      <Badge color="blue" size="sm">
        <Globe className="w-3 h-3 mr-1" />
        Public
      </Badge>
    ) : (
      <Badge color="gray" size="sm">
        <Lock className="w-3 h-3 mr-1" />
        Private
      </Badge>
    );
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 max-h-[calc(100vh-102px)] overflow-y-scroll bg-background">
        <div className="max-w-6xl mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="flex-1 max-h-[calc(100vh-102px)] overflow-y-scroll bg-background">
        <div className="max-w-6xl mx-auto p-6">
          <div className="text-center py-12">
            <div className="text-red-600 dark:text-red-400 mb-4">
              {error ? `Error: ${getErrorMessage(error)}` : "Document not found"}
            </div>
            <div className="space-x-4">
              <Button onClick={() => refetch()} variant="primary">
                Try Again
              </Button>
              <Link href="/documents">
                <Button variant="secondary">Back to Documents</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 max-h-[calc(100vh-102px)] overflow-y-scroll bg-background">
        <div className="max-w-6xl mx-auto p-6">
          {/* Header */}
          <div className="flex items-center mb-6">
            <Link href="/documents">
              <IconButton
                Icon={ArrowLeft}
                onClick={() => {}}
                variant="default"
                size="sm"
                className="mr-4"
              />
            </Link>
            <h1 className="text-2xl font-bold text-foreground flex-1">
              {document.title}
            </h1>
            <div className="flex items-center space-x-2">
              {getStatusBadge(document.status)}
              {getVisibilityBadge(document.isPublic)}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Document Preview */}
              <Card>
                <Card.Header>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Document Preview</h2>
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={handlePreview}
                        variant="secondary"
                        size="sm"
                        className="flex items-center"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Open in New Tab
                      </Button>
                    </div>
                  </div>
                </Card.Header>
                <Card.Content>
                  <div className="flex items-center justify-center h-64 bg-background-secondary rounded-lg border-2 border-dashed border-border">
                    {document.fileType === DocumentType.PDF && document.hasThumbnail ? (
                      <Image
                        src={`${API_CONFIG.BASE_URL}${DOCUMENT_ENDPOINTS.THUMBNAIL(document.id)}?v=${document.version}`}
                        alt={`${document.title} thumbnail`}
                        width={300}
                        height={400}
                        className="max-h-full max-w-full object-contain rounded cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={handlePDFViewerOpen}
                        title={`Open ${document.title} in PDF viewer`}
                      />
                    ) : document.fileType === DocumentType.PDF ? (
                      <div 
                        className="text-center cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={handlePDFViewerOpen}
                        title={`Open ${document.title} in PDF viewer`}
                      >
                        <DocumentTypeIndicator
                          fileType={document.fileType}
                          size="lg"
                        />
                        <p className="mt-4 text-sm text-foreground-secondary">
                          Click to open PDF viewer
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <DocumentTypeIndicator
                          fileType={document.fileType}
                          size="lg"
                        />
                        <p className="mt-4 text-sm text-foreground-secondary">
                          Click 'Open in New Tab' to view this document
                        </p>
                      </div>
                    )}
                  </div>
                </Card.Content>
              </Card>

              {/* Document Information */}
              <Card>
                <Card.Header>
                  <h2 className="text-lg font-semibold">Document Information</h2>
                </Card.Header>
                <Card.Content>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-foreground-secondary mb-2">Title</h3>
                      <p className="text-foreground">{document.title}</p>
                    </div>
                    
                    {document.description && (
                      <div>
                        <h3 className="text-sm font-medium text-foreground-secondary mb-2">Description</h3>
                        <p className="text-foreground">{document.description}</p>
                      </div>
                    )}
                    
                    <div>
                      <h3 className="text-sm font-medium text-foreground-secondary mb-2">Original Filename</h3>
                      <p className="text-foreground font-mono text-sm">{document.originalFileName}</p>
                    </div>
                    
                    {document.tags && (
                      <div>
                        <h3 className="text-sm font-medium text-foreground-secondary mb-2">Tags</h3>
                        <div className="flex flex-wrap gap-2">
                          {document.tags.split(',').map((tag, index) => (
                            <Badge key={index} color="blue" size="sm">
                              <Tag className="w-3 h-3 mr-1" />
                              {tag.trim()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card.Content>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Actions */}
              <Card>
                <Card.Header>
                  <h2 className="text-lg font-semibold">Actions</h2>
                </Card.Header>
                <Card.Content>
                  <div className="space-y-3">
                    <Button
                      onClick={handleDownload}
                      disabled={downloadMutation.isPending}
                      variant="primary"
                      className="w-full flex items-center justify-center"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {downloadMutation.isPending ? "Downloading..." : "Download"}
                    </Button>
                    
                    <Button
                      onClick={handleFavoriteToggle}
                      disabled={isLoadingFavorite || addToFavoritesMutation.isPending || removeFromFavoritesMutation.isPending}
                      variant="secondary"
                      className={`w-full flex items-center justify-center ${
                        favoriteStatus?.isFavorited ? "text-red-500 border-red-200 hover:border-red-300" : ""
                      }`}
                    >
                      <Heart className={`w-4 h-4 mr-2 ${favoriteStatus?.isFavorited ? "fill-current" : ""}`} />
                      {isLoadingFavorite 
                        ? "Loading..." 
                        : addToFavoritesMutation.isPending || removeFromFavoritesMutation.isPending
                        ? "Updating..."
                        : favoriteStatus?.isFavorited 
                        ? "Remove from Favorites" 
                        : "Add to Favorites"
                      }
                    </Button>
                    
                    <Button
                      onClick={() => setShowUpdateModal(true)}
                      disabled={updateMutation.isPending}
                      variant="secondary"
                      className="w-full flex items-center justify-center"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    
                    <Button
                      onClick={() => setShowDeleteModal(true)}
                      disabled={deleteMutation.isPending}
                      variant="error"
                      className="w-full flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </Card.Content>
              </Card>

              {/* File Details */}
              <Card>
                <Card.Header>
                  <h2 className="text-lg font-semibold">File Details</h2>
                </Card.Header>
                <Card.Content>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground-secondary">File Type</span>
                      <div className="flex items-center">
                        <DocumentTypeIndicator fileType={document.fileType} size="sm" />
                        <span className="ml-2 text-sm font-medium">{document.fileType.toUpperCase()}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground-secondary">File Size</span>
                      <div className="flex items-center">
                        <HardDrive className="w-4 h-4 mr-2 text-foreground-secondary" />
                        <span className="text-sm font-medium">{formatFileSize(document.fileSize)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground-secondary">MIME Type</span>
                      <span className="text-sm font-mono">{document.mimeType}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground-secondary">Version</span>
                      <span className="text-sm font-medium">v{document.version}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground-secondary">Status</span>
                      {getStatusBadge(document.status)}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground-secondary">Visibility</span>
                      {getVisibilityBadge(document.isPublic)}
                    </div>
                  </div>
                </Card.Content>
              </Card>

              {/* Statistics */}
              <Card>
                <Card.Header>
                  <h2 className="text-lg font-semibold">Statistics</h2>
                </Card.Header>
                <Card.Content>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Eye className="w-4 h-4 mr-2 text-foreground-secondary" />
                        <span className="text-sm text-foreground-secondary">Views</span>
                      </div>
                      <span className="text-sm font-medium">{document.viewCount}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <ArrowDown className="w-4 h-4 mr-2 text-foreground-secondary" />
                        <span className="text-sm text-foreground-secondary">Downloads</span>
                      </div>
                      <span className="text-sm font-medium">{document.downloadCount}</span>
                    </div>
                  </div>
                </Card.Content>
              </Card>

              {/* Timestamps */}
              <Card>
                <Card.Header>
                  <h2 className="text-lg font-semibold">Timeline</h2>
                </Card.Header>
                <Card.Content>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center mb-1">
                        <Calendar className="w-4 h-4 mr-2 text-foreground-secondary" />
                        <span className="text-sm text-foreground-secondary">Created</span>
                      </div>
                      <span className="text-sm font-medium">{formatDate(document.createdAt)}</span>
                    </div>
                    
                    <div>
                      <div className="flex items-center mb-1">
                        <Edit className="w-4 h-4 mr-2 text-foreground-secondary" />
                        <span className="text-sm text-foreground-secondary">Last Modified</span>
                      </div>
                      <span className="text-sm font-medium">{formatDate(document.updatedAt)}</span>
                    </div>
                    
                    {document.processedAt && (
                      <div>
                        <div className="flex items-center mb-1">
                          <RefreshCw className="w-4 h-4 mr-2 text-foreground-secondary" />
                          <span className="text-sm text-foreground-secondary">Processed</span>
                        </div>
                        <span className="text-sm font-medium">{formatDate(document.processedAt)}</span>
                      </div>
                    )}
                  </div>
                </Card.Content>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
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
            This action cannot be undone. The document and all its associated data will be permanently removed.
          </p>
        </Modal.Content>
        
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowDeleteModal(false)}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="error"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Document Update Modal */}
      <DocumentUpdateModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        document={document}
        onUpdate={handleUpdate}
        isUpdating={updateMutation.isPending}
      />

      {/* PDF Viewer Modal */}
      <PDFViewerModal
        isOpen={showPDFViewer}
        onClose={handlePDFViewerClose}
        document={document}
      />
    </>
  );
};

export default DocumentDetailPage;