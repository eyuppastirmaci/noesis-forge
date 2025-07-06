"use client";

import React, { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
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
  ShareIcon,
  Link2,
  Clock,
  DownloadIcon,
  Copy,
  ExternalLink,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { Accordion } from "@/components/ui/Accordion";
import DynamicImage from "@/components/ui/DynamicImage";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import DocumentTypeIndicator from "@/components/DocumentTypeIndicator";
import DocumentUpdateModal from "@/components/DocumentUpdateModal";
import CommentSection from "@/components/CommentSection";
import ActivityTimeline from "@/components/ActivityTimeline";
import {
  documentQueries,
  documentMutations,
  documentService,
} from "@/services/document.service";
import {
  favoriteQueries,
  favoriteMutations,
} from "@/services/favorite.service";
import {
  DocumentType,
  DocumentStatus,
  UpdateDocumentRequest,
  DOCUMENT_ENDPOINTS,
  DOCUMENT_QUERY_KEYS,
  FAVORITE_QUERY_KEYS,
  getErrorMessage,
  CommentPosition,
  CommentResponse,
} from "@/types";
import { toast, formatDate, formatFileSize } from "@/utils";
import { API_CONFIG } from "@/config/api";
import { ENV } from "@/config/env";
import PDFViewerModal from "@/components/PDFViewerModal";
import type { DocumentRevision } from "@/types/document";
import type { ShareItem } from "@/types/share";
import { createCustomDateFormatter } from "@/utils/dateUtils";
import ShareModal from "@/components/ShareModal";
import CustomTooltip from "@/components/ui/CustomTooltip";
import { shareQueries, shareUtils } from "@/services/share.service";

const DocumentDetailPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const documentId = params.id as string;
  const { data: session } = useSession();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [selectedShareId, setSelectedShareId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'comments' | 'activity'>('overview');
  const [pendingAnnotation, setPendingAnnotation] = useState<CommentPosition | null>(null);
  const [targetAnnotation, setTargetAnnotation] = useState<CommentResponse | null>(null);

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
      queryClient.invalidateQueries({
        queryKey: DOCUMENT_QUERY_KEYS.DOCUMENTS.REVISIONS(documentId),
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
  const { data: favoriteStatus, isLoading: isLoadingFavorite } = useQuery(
    favoriteQueries.status(documentId)
  );

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

  // Revoke share mutation
  const revokeShareMutation = useMutation({
    ...documentMutations.revokeShare(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["documents", "shares", documentId],
      });
      toast.success("Share revoked successfully");
    },
    onError: (error) => {
      toast.error(`Failed to revoke share: ${getErrorMessage(error)}`);
    },
  });

  // Query for revision history
  const {
    data: revisionsData,
    isLoading: isLoadingRevisions,
    error: revisionsError,
  } = useQuery(documentQueries.revisions(documentId));

  // Query for document shares
  const {
    data: sharesData,
    isLoading: isLoadingShares,
    error: sharesError,
  } = useQuery(documentQueries.shares(documentId));

  // Query for user shares (per-user sharing)
  const {
    data: sharedByMeData,
    isLoading: isLoadingUserShares,
    error: userSharesError,
  } = useQuery(shareQueries.sharedByMe());

  const userSharesData = sharedByMeData
    ? sharedByMeData
        .filter((item) => item.document.id === documentId)
        .flatMap((item) => item.shares)
    : undefined;

  const document = documentData?.document;
  
  // Check user access level
  const userAccessLevel = document?.userAccessLevel || 'view';
  const isOwner = userAccessLevel === 'owner';
  const canEdit = userAccessLevel === 'owner' || userAccessLevel === 'edit';
  const canShare = userAccessLevel === 'owner';
  const canDelete = userAccessLevel === 'owner';

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
      window.open(previewUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Preview failed:", error);
      toast.error(`Failed to preview document: ${getErrorMessage(error)}`);
    }
  }, [document]);

  const handleUpdate = useCallback(
    async (updateRequest: UpdateDocumentRequest) => {
      if (!document) return;

      try {
        await updateMutation.mutateAsync({
          documentId: document.id,
          request: updateRequest,
        });
      } catch (error) {
        console.error("Update failed:", error);
      }
    },
    [document, updateMutation]
  );

  const handlePDFViewerOpen = useCallback(() => {
    if (!document) return;
    if (document.fileType === DocumentType.PDF) {
      setShowPDFViewer(true);
    }
  }, [document]);

  const handlePDFViewerClose = useCallback(() => {
    setShowPDFViewer(false);
    setTargetAnnotation(null); // Clear target annotation when closing
  }, []);

  const handleFavoriteToggle = useCallback(async () => {
    if (!document || isLoadingFavorite) return;

    try {
      if (favoriteStatus?.isFavorited) {
        await removeFromFavoritesMutation.mutateAsync({
          documentId: document.id,
        });
      } else {
        await addToFavoritesMutation.mutateAsync({ documentId: document.id });
      }
    } catch (error) {
      console.error("Favorite toggle failed:", error);
    }
  }, [
    favoriteStatus?.isFavorited,
    document,
    addToFavoritesMutation,
    removeFromFavoritesMutation,
    isLoadingFavorite,
  ]);

  const handleRevokeShare = useCallback(
    async (shareId: string) => {
      if (!document) return;

      setSelectedShareId(shareId);
      setShowRevokeModal(true);
    },
    [document]
  );

  const confirmRevokeShare = useCallback(async () => {
    if (!document || !selectedShareId) return;

    try {
      await revokeShareMutation.mutateAsync({
        documentId: document.id,
        shareId: selectedShareId,
      });
      setSelectedShareId(null);
    } catch (error) {
      console.error("Revoke share failed:", error);
    }
  }, [document, selectedShareId, revokeShareMutation]);

  const handleCopyShareLink = useCallback((shareToken: string) => {
    const shareUrl = `${ENV.API_URL.replace('/api/v1', '')}/share/${shareToken}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Share link copied to clipboard");
  }, []);

  const handleOpenShareInNewTab = useCallback((shareToken: string) => {
    const shareUrl = `${ENV.API_URL.replace('/api/v1', '')}/share/${shareToken}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  }, []);

  const handleAnnotationCreate = useCallback((position: CommentPosition) => {
    // Store the position but keep PDF viewer open
    setPendingAnnotation(position);
    // Note: Don't close the PDF viewer anymore - let it handle annotation creation inline
  }, []);

  const handleAnnotationClick = useCallback((annotation: CommentResponse) => {
    // Only handle annotation clicks for PDF documents
    if (!document || document.fileType !== DocumentType.PDF) {
      toast.error("Annotation viewing is only available for PDF documents");
      return;
    }

    // Set the target annotation and open PDF viewer
    setTargetAnnotation(annotation);
    setShowPDFViewer(true);
  }, [document]);

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
            <LoadingSpinner size="2xl" variant="primary" />
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
              {error
                ? `Error: ${getErrorMessage(error)}`
                : "Document not found"}
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
                    {document.fileType === DocumentType.PDF &&
                    document.hasThumbnail ? (
                      <DynamicImage
                        src={`${
                          API_CONFIG.BASE_URL
                        }${DOCUMENT_ENDPOINTS.THUMBNAIL(document.id)}?v=${
                          document.version
                        }`}
                        alt={`${document.title} thumbnail`}
                        width={300}
                        height={400}
                        className="max-h-full max-w-full object-contain rounded cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={handlePDFViewerOpen}
                        title={`Open ${document.title} in PDF viewer`}
                        loadingSkeleton={{ width: 200, height: 250, className: "max-h-full max-w-full object-contain rounded" }}
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

              {/* Comments Section */}
              <Card data-section="comments">
                <Card.Header>
                  <h2 className="text-lg font-semibold">Comments</h2>
                </Card.Header>
                <Card.Content>
                  <CommentSection
                    documentId={documentId}
                    currentUserId={session?.user?.id}
                    pendingAnnotation={pendingAnnotation}
                    onAnnotationUsed={() => setPendingAnnotation(null)}
                    onAnnotationClick={handleAnnotationClick}
                  />
                </Card.Content>
              </Card>

              {/* Document Information */}
              <Card>
                <Card.Header>
                  <h2 className="text-lg font-semibold">
                    Document Information
                  </h2>
                </Card.Header>
                <Card.Content>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-foreground-secondary mb-2">
                        Title
                      </h3>
                      <p className="text-foreground">{document.title}</p>
                    </div>

                    {document.description && (
                      <div>
                        <h3 className="text-sm font-medium text-foreground-secondary mb-2">
                          Description
                        </h3>
                        <p className="text-foreground">
                          {document.description}
                        </p>
                      </div>
                    )}

                    <div>
                      <h3 className="text-sm font-medium text-foreground-secondary mb-2">
                        Original Filename
                      </h3>
                      <p className="text-foreground font-mono text-sm">
                        {document.originalFileName}
                      </p>
                    </div>

                    {document.tags && (
                      <div>
                        <h3 className="text-sm font-medium text-foreground-secondary mb-2">
                          Tags
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {document.tags.split(",").map((tag, index) => (
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

              {/* Version History */}
              <Card>
                <Card.Header>
                  <h2 className="text-lg font-semibold">Version History</h2>
                </Card.Header>
                <Card.Content>
                  {isLoadingRevisions ? (
                    <div className="flex items-center justify-center py-4">
                      <LoadingSpinner size="lg" variant="default" />
                    </div>
                  ) : revisionsError ? (
                    <p className="text-sm text-red-500">
                      Failed to load revisions.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {revisionsData?.revisions.length ? (
                        <Accordion>
                          {revisionsData.revisions.map(
                            (rev: DocumentRevision) => {
                              let changesEntries: Array<{
                                field: string;
                                old?: any;
                                new?: any;
                              }> = [];
                              let hasFileChange = false;
                              try {
                                const parsed = JSON.parse(rev.changeSummary);
                                for (const key in parsed) {
                                  const val = parsed[key];
                                  if (key === "file") {
                                    hasFileChange = true;
                                    continue;
                                  }
                                  if (
                                    typeof val === "object" &&
                                    val.old !== undefined
                                  ) {
                                    changesEntries.push({
                                      field: key,
                                      old: val.old,
                                      new: val.new,
                                    });
                                  }
                                }
                              } catch {}

                              return (
                                <Accordion.Item key={rev.id} id={rev.id}>
                                  <Accordion.Title>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">
                                        Version v{rev.version}
                                      </p>
                                      <p className="text-xs text-foreground-secondary">
                                        {createCustomDateFormatter({
                                          year: "numeric",
                                          month: "long",
                                          day: "numeric",
                                          weekday: "long",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                          second: "2-digit",
                                        })(rev.createdAt)}
                                      </p>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {changesEntries.map((chg) => (
                                        <Badge
                                          key={chg.field}
                                          color="blue"
                                          size="sm"
                                        >
                                          {chg.field}
                                        </Badge>
                                      ))}
                                    </div>
                                  </Accordion.Title>

                                  <Accordion.Content>
                                    <div className="space-y-2 text-xs">
                                      {changesEntries.map((chg) => (
                                        <div
                                          key={chg.field}
                                          className="flex flex-wrap items-center gap-1"
                                        >
                                          <span className="font-medium text-foreground">
                                            {chg.field}:
                                          </span>
                                          <span className="line-through text-red-500 truncate max-w-full">
                                            {String(chg.old)}
                                          </span>
                                          <span className="mx-1 text-foreground-secondary">
                                            →
                                          </span>
                                          <span className="text-green-600 truncate max-w-full">
                                            {String(chg.new)}
                                          </span>
                                        </div>
                                      ))}
                                      {hasFileChange && (
                                        <div className="text-foreground-secondary">
                                          File replaced.
                                        </div>
                                      )}
                                    </div>
                                  </Accordion.Content>
                                </Accordion.Item>
                              );
                            }
                          )}
                        </Accordion>
                      ) : (
                        <p className="text-sm text-foreground-secondary">
                          No revisions yet.
                        </p>
                      )}
                    </div>
                  )}
                </Card.Content>
              </Card>

              {/* Share Status - Only show for document owners */}
              {isOwner && (
                <Card>
                  <Card.Header>
                    <h2 className="text-lg font-semibold">Share Status</h2>
                  </Card.Header>
                  <Card.Content>
                    {isLoadingShares ? (
                      <div className="flex items-center justify-center py-4">
                        <LoadingSpinner size="lg" variant="default" />
                      </div>
                    ) : sharesError ? (
                      <p className="text-sm text-red-500">
                        Failed to load shares.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {sharesData?.shares.length ? (
                          <div className="space-y-3">
                            {sharesData.shares.map((share: ShareItem) => (
                              <div
                                key={share.id}
                                className="p-3 bg-background-secondary rounded-lg border border-border"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Link2 className="w-4 h-4 text-blue-500" />
                                    <span className="text-sm font-medium">
                                      Active Share
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge color="green" size="sm">
                                      Active
                                    </Badge>
                                    <button
                                      id={`revoke-share-${share.id}`}
                                      onClick={() => handleRevokeShare(share.id)}
                                      disabled={revokeShareMutation.isPending}
                                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-500/10 rounded transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-2 text-xs text-foreground-secondary">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3" />
                                    <span>
                                      Created: {formatDate(share.createdAt)}
                                    </span>
                                  </div>

                                  {share.expiresAt && (
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-3 h-3" />
                                      <span>
                                        Expires: {formatDate(share.expiresAt)}
                                      </span>
                                    </div>
                                  )}

                                  <div className="flex items-center gap-2">
                                    <DownloadIcon className="w-3 h-3" />
                                    <span>
                                      Downloads: {share.downloadCount}
                                      {share.maxDownloads
                                        ? ` / ${share.maxDownloads}`
                                        : " (unlimited)"}
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-2 p-2 bg-background rounded border border-border">
                                  <p className="text-xs font-mono break-all text-foreground">
                                    {ENV.API_URL.replace('/api/v1', '')}/share/{share.token}
                                  </p>
                                </div>

                                <div className="flex items-center justify-start gap-2 mt-2">
                                  <button
                                    id={`open-share-${share.id}`}
                                    onClick={() =>
                                      handleOpenShareInNewTab(share.token)
                                    }
                                    className="p-1 text-white hover:text-gray-300 transition-colors"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </button>
                                  <button
                                    id={`copy-share-${share.id}`}
                                    onClick={() =>
                                      handleCopyShareLink(share.token)
                                    }
                                    className="p-1 text-white hover:text-gray-300 transition-colors"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                </div>

                                <CustomTooltip
                                  anchorSelect={`#open-share-${share.id}`}
                                  place="bottom"
                                >
                                  Open in new tab
                                </CustomTooltip>
                                <CustomTooltip
                                  anchorSelect={`#copy-share-${share.id}`}
                                  place="bottom"
                                >
                                  Copy link
                                </CustomTooltip>
                                <CustomTooltip
                                  anchorSelect={`#revoke-share-${share.id}`}
                                  place="bottom"
                                >
                                  Revoke share
                                </CustomTooltip>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <Link2 className="w-8 h-8 text-foreground-secondary mx-auto mb-2" />
                            <p className="text-sm text-foreground-secondary">
                              No active shares
                            </p>
                            <p className="text-xs text-foreground-secondary">
                              Click the Share button to create a public link
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </Card.Content>
                </Card>
              )}

              {/* User Shares - Only for document owners */}
              {isOwner && (
                <Card>
                  <Card.Header>
                    <h2 className="text-lg font-semibold">Shared With Users</h2>
                  </Card.Header>
                  <Card.Content>
                    {isLoadingUserShares ? (
                      <div className="flex items-center justify-center py-4">
                        <LoadingSpinner size="lg" variant="default" />
                      </div>
                    ) : userSharesError ? (
                      <p className="text-sm text-red-500">Failed to load user shares.</p>
                    ) : (
                      <div className="space-y-3">
                        {userSharesData?.length ? (
                          userSharesData.map((share) => (
                            <div key={share.id} className="p-3 bg-background-secondary rounded-lg border border-border flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {share.sharedWith.email}
                                </p>
                                <p className="text-xs text-foreground-secondary">
                                  Access: {shareUtils.getAccessLevelText(share.accessLevel)}
                                </p>
                              </div>
                              <Badge color={shareUtils.getAccessLevelColor(share.accessLevel)} size="sm">
                                {share.accessLevel.toUpperCase()}
                              </Badge>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-foreground-secondary">No user shares</p>
                        )}
                      </div>
                    )}
                  </Card.Content>
                </Card>
              )}

              {/* Activity Section */}
              <Card>
                <Card.Header>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Activity</h2>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                          activeTab === 'overview'
                            ? 'bg-blue-500 text-white'
                            : 'text-foreground-secondary hover:text-foreground hover:bg-background-secondary'
                        }`}
                      >
                        Overview
                      </button>
                      <button
                        onClick={() => setActiveTab('activity')}
                        className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center ${
                          activeTab === 'activity'
                            ? 'bg-blue-500 text-white'
                            : 'text-foreground-secondary hover:text-foreground hover:bg-background-secondary'
                        }`}
                      >
                        <Activity className="w-4 h-4 mr-1" />
                        Timeline
                      </button>
                    </div>
                  </div>
                </Card.Header>
                <Card.Content>
                  <div className="min-h-[400px]">
                    {activeTab === 'overview' && (
                      <div className="space-y-6">
                        {/* Document Information */}
                        <div>
                          <h3 className="text-base font-semibold mb-4">Document Information</h3>
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium text-foreground-secondary mb-2">
                                Title
                              </h4>
                              <p className="text-foreground">{document.title}</p>
                            </div>

                            {document.description && (
                              <div>
                                <h4 className="text-sm font-medium text-foreground-secondary mb-2">
                                  Description
                                </h4>
                                <p className="text-foreground">
                                  {document.description}
                                </p>
                              </div>
                            )}

                            <div>
                              <h4 className="text-sm font-medium text-foreground-secondary mb-2">
                                Original Filename
                              </h4>
                              <p className="text-foreground font-mono text-sm">
                                {document.originalFileName}
                              </p>
                            </div>

                            {document.tags && (
                              <div>
                                <h4 className="text-sm font-medium text-foreground-secondary mb-2">
                                  Tags
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {document.tags.split(",").map((tag, index) => (
                                    <Badge key={index} color="blue" size="sm">
                                      <Tag className="w-3 h-3 mr-1" />
                                      {tag.trim()}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Version History */}
                        <div>
                          <h3 className="text-base font-semibold mb-4">Version History</h3>
                          {isLoadingRevisions ? (
                            <div className="flex items-center justify-center py-4">
                              <LoadingSpinner size="lg" variant="default" />
                            </div>
                          ) : revisionsError ? (
                            <p className="text-sm text-red-500">
                              Failed to load revisions.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {revisionsData?.revisions.length ? (
                                <div className="text-sm text-foreground-secondary">
                                  <p className="mb-2">
                                    {revisionsData.revisions.length} revision(s) available
                                  </p>
                                  <p className="text-xs">
                                    Latest: Version v{revisionsData.revisions[0]?.version} - {formatDate(revisionsData.revisions[0]?.createdAt)}
                                  </p>
                                </div>
                              ) : (
                                <p className="text-sm text-foreground-secondary">
                                  No revisions yet.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {activeTab === 'activity' && (
                      <div className="py-2">
                        <ActivityTimeline
                          documentId={documentId}
                          maxHeight="500px"
                          showStats={true}
                          showFilters={true}
                          limit={15}
                          className="border-0 shadow-none"
                        />
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
                      {downloadMutation.isPending
                        ? "Downloading..."
                        : "Download"}
                    </Button>

                    <Button
                      onClick={handleFavoriteToggle}
                      disabled={
                        isLoadingFavorite ||
                        addToFavoritesMutation.isPending ||
                        removeFromFavoritesMutation.isPending
                      }
                      variant="secondary"
                      className={`w-full flex items-center justify-center ${
                        favoriteStatus?.isFavorited
                          ? "text-red-500 border-red-200 hover:border-red-300"
                          : ""
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 mr-2 ${
                          favoriteStatus?.isFavorited ? "fill-current" : ""
                        }`}
                      />
                      {isLoadingFavorite
                        ? "Loading..."
                        : addToFavoritesMutation.isPending ||
                          removeFromFavoritesMutation.isPending
                        ? "Updating..."
                        : favoriteStatus?.isFavorited
                        ? "Remove from Favorites"
                        : "Add to Favorites"}
                    </Button>

                    {canEdit && (
                      <Button
                        onClick={() => setShowUpdateModal(true)}
                        disabled={updateMutation.isPending}
                        variant="secondary"
                        className="w-full flex items-center justify-center"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    )}

                    {canDelete && (
                      <Button
                        onClick={() => setShowDeleteModal(true)}
                        disabled={deleteMutation.isPending}
                        variant="error"
                        className="w-full flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    )}

                    {canShare && (
                      <Button
                        onClick={() => setShowShareModal(true)}
                        variant="secondary"
                        className="w-full flex items-center justify-center"
                      >
                        <ShareIcon className="w-4 h-4 mr-2" />
                        Share
                      </Button>
                    )}
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
                      <span className="text-sm text-foreground-secondary">
                        File Type
                      </span>
                      <div className="flex items-center">
                        <DocumentTypeIndicator
                          fileType={document.fileType}
                          size="sm"
                        />
                        <span className="ml-2 text-sm font-medium">
                          {document.fileType.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground-secondary">
                        File Size
                      </span>
                      <div className="flex items-center">
                        <HardDrive className="w-4 h-4 mr-2 text-foreground-secondary" />
                        <span className="text-sm font-medium">
                          {formatFileSize(document.fileSize)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground-secondary">
                        MIME Type
                      </span>
                      <span className="text-sm font-mono">
                        {document.mimeType}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground-secondary">
                        Version
                      </span>
                      <span className="text-sm font-medium">
                        v{document.version}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground-secondary">
                        Status
                      </span>
                      {getStatusBadge(document.status)}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground-secondary">
                        Visibility
                      </span>
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
                        <span className="text-sm text-foreground-secondary">
                          Views
                        </span>
                      </div>
                      <span className="text-sm font-medium">
                        {document.viewCount}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <ArrowDown className="w-4 h-4 mr-2 text-foreground-secondary" />
                        <span className="text-sm text-foreground-secondary">
                          Downloads
                        </span>
                      </div>
                      <span className="text-sm font-medium">
                        {document.downloadCount}
                      </span>
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
                        <span className="text-sm text-foreground-secondary">
                          Created
                        </span>
                      </div>
                      <span className="text-sm font-medium">
                        {formatDate(document.createdAt)}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center mb-1">
                        <Edit className="w-4 h-4 mr-2 text-foreground-secondary" />
                        <span className="text-sm text-foreground-secondary">
                          Last Modified
                        </span>
                      </div>
                      <span className="text-sm font-medium">
                        {formatDate(document.updatedAt)}
                      </span>
                    </div>

                    {document.processedAt && (
                      <div>
                        <div className="flex items-center mb-1">
                          <RefreshCw className="w-4 h-4 mr-2 text-foreground-secondary" />
                          <span className="text-sm text-foreground-secondary">
                            Processed
                          </span>
                        </div>
                        <span className="text-sm font-medium">
                          {formatDate(document.processedAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </Card.Content>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal - Only for users who can delete */}
      {canDelete && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          size="md"
          closeOnOverlayClick={true}
          closeOnEscape={true}
        >
          <Modal.Header>Delete Document</Modal.Header>

          <Modal.Content>
            <p className="mb-4">
              Are you sure you want to delete <strong>"{document.title}"</strong>?
            </p>
            <p className="text-sm text-foreground-secondary">
              This action cannot be undone. The document and all its associated
              data will be permanently removed.
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
      )}

      {/* Document Update Modal - Only for users who can edit */}
      {canEdit && (
        <DocumentUpdateModal
          isOpen={showUpdateModal}
          onClose={() => setShowUpdateModal(false)}
          document={document}
          onUpdate={handleUpdate}
          isUpdating={updateMutation.isPending}
        />
      )}

      {/* PDF Viewer Modal - Available for all users */}
      <PDFViewerModal
        isOpen={showPDFViewer}
        onClose={handlePDFViewerClose}
        document={document}
        onAnnotationCreate={handleAnnotationCreate}
        targetAnnotation={targetAnnotation}
        onTargetAnnotationViewed={() => setTargetAnnotation(null)}
      />

      {/* Share Modal - Only for users who can share (owners) */}
      {canShare && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          documentId={document.id}
        />
      )}

      {/* Revoke Share Confirmation Modal - Only for users who can share (owners) */}
      {canShare && (
        <ConfirmationModal
          isOpen={showRevokeModal}
          onClose={() => {
            setShowRevokeModal(false);
            setSelectedShareId(null);
          }}
          onConfirm={confirmRevokeShare}
          title="Revoke Share"
          message="Are you sure you want to revoke this share? This action cannot be undone and the link will no longer work."
          confirmText="Revoke"
          cancelText="Cancel"
          variant="danger"
          isLoading={revokeShareMutation.isPending}
        />
      )}
    </>
  );
};

export default DocumentDetailPage;
