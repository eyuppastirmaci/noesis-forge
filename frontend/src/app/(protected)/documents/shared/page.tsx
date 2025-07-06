"use client";

import { FC, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Share2, Users, Link2, Calendar, Download, Eye, ExternalLink, Copy, X, Edit } from "lucide-react";
import Tab from "@/components/ui/Tab";
import DocumentCard from "@/components/DocumentCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import CustomTooltip from "@/components/ui/CustomTooltip";
import PDFViewerModal from "@/components/PDFViewerModal";
import EditSharingModal from "@/components/EditSharingModal";
import { formatDate, toast } from "@/utils";
import { Document, getErrorMessage, DocumentType } from "@/types";
import { shareQueries, shareMutations, shareUtils } from "@/services/share.service";
import { documentMutations, documentService } from "@/services/document.service";

const DocumentSharedPage: FC = () => {
  const [downloadingDocs, setDownloadingDocs] = useState<Set<string>>(new Set());
  const [deletingDocs, setDeletingDocs] = useState<Set<string>>(new Set());
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [selectedShareId, setSelectedShareId] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showEditSharingModal, setShowEditSharingModal] = useState(false);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  
  const queryClient = useQueryClient();

  // Fetch shared documents data
  const { data: sharedWithMe = [], isLoading: isLoadingSharedWithMe, error: errorSharedWithMe } = useQuery(shareQueries.sharedWithMe());
  const { data: sharedByMe = [], isLoading: isLoadingSharedByMe, error: errorSharedByMe } = useQuery(shareQueries.sharedByMe());
  const { data: publicLinks = [], isLoading: isLoadingPublicLinks, error: errorPublicLinks } = useQuery(shareQueries.publicLinks());

  // Download mutation
  const downloadMutation = useMutation({
    ...documentMutations.download(),
    onSuccess: () => {
      toast.success("Download started");
    },
    onError: (error: any) => {
      toast.error(`Failed to download document: ${getErrorMessage(error)}`);
    },
  });

  // Revoke mutations
  const revokeUserShareMutation = useMutation({
    ...shareMutations.revokeUserShare(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shareQueries.sharedByMe().queryKey });
      queryClient.invalidateQueries({ queryKey: shareQueries.sharedWithMe().queryKey });
      toast.success("Access revoked successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to revoke access: ${getErrorMessage(error)}`);
    },
  });

  const revokePublicLinkMutation = useMutation({
    ...documentMutations.revokeShare(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shareQueries.publicLinks().queryKey });
      toast.success("Public link revoked successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to revoke public link: ${getErrorMessage(error)}`);
    },
  });

  const handleDownload = useCallback(async (document: Document) => {
    if (!document) return;

    setDownloadingDocs(prev => new Set([...prev, document.id]));
    try {
      await downloadMutation.mutateAsync({
        id: document.id,
        originalFileName: document.originalFileName,
      });
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setDownloadingDocs(prev => {
        const newSet = new Set(prev);
        newSet.delete(document.id);
        return newSet;
      });
    }
  }, [downloadMutation]);

  const handleDelete = useCallback(async (document: Document) => {
    setDeletingDocs(prev => new Set([...prev, document.id]));
    try {
      // TODO: Implement delete logic here
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setDeletingDocs(prev => {
        const newSet = new Set(prev);
        newSet.delete(document.id);
        return newSet;
      });
    }
  }, []);

  const handlePreview = useCallback(async (document: Document) => {
    if (!document) return;

    if (document.fileType === DocumentType.PDF) {
      setShowPDFViewer(true);
      setSelectedDocument(document);
    } else {
      try {
        const response = await documentService.getDocumentPreview(document.id);
        const previewUrl = response.data.url;
        window.open(previewUrl, "_blank", "noopener,noreferrer");
      } catch (error) {
        console.error("Preview failed:", error);
        toast.error(`Failed to preview document: ${getErrorMessage(error)}`);
      }
    }
  }, []);

  const handleCopyLink = useCallback((url: string) => {
    navigator.clipboard.writeText(url);
    // Show toast notification
  }, []);

  const handleOpenLink = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const handleRevokeShare = useCallback(async (documentId: string, shareId: string) => {
    try {
      await revokeUserShareMutation.mutateAsync({ shareId });
    } catch (error) {
      console.error("Revoke failed:", error);
    }
  }, [revokeUserShareMutation]);

  const handleRevokePublicLink = useCallback((documentId: string, shareId: string) => {
    setSelectedDocumentId(documentId);
    setSelectedShareId(shareId);
    setShowRevokeModal(true);
  }, []);

  const confirmRevokePublicLink = useCallback(async () => {
    if (!selectedDocumentId || !selectedShareId) return;

    try {
      await revokePublicLinkMutation.mutateAsync({
        documentId: selectedDocumentId,
        shareId: selectedShareId,
      });
      setSelectedDocumentId(null);
      setSelectedShareId(null);
      setShowRevokeModal(false);
    } catch (error) {
      console.error("Revoke public link failed:", error);
    }
  }, [selectedDocumentId, selectedShareId, revokePublicLinkMutation]);

  const handleEditSharing = useCallback((documentId: string) => {
    setEditingDocumentId(documentId);
    setShowEditSharingModal(true);
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-info/10 rounded-lg">
            <Share2 className="w-5 h-5 text-info" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Shared Documents</h1>
            <p className="text-sm text-foreground-secondary mt-1">
              Manage documents shared with you and by you
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <Tab defaultTab="shared-with-me">
        <Tab.List>
          <Tab.Title value="shared-with-me">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Shared With Me</span>
              <Badge color="gray" className="text-xs">
                {Array.isArray(sharedWithMe) ? sharedWithMe.length : 0}
              </Badge>
            </div>
          </Tab.Title>
          <Tab.Title value="shared-by-me">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              <span>Shared By Me</span>
              <Badge color="gray" className="text-xs">
                {Array.isArray(sharedByMe) ? sharedByMe.length : 0}
              </Badge>
            </div>
          </Tab.Title>
          <Tab.Title value="public-links">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              <span>Public Links</span>
              <Badge color="gray" className="text-xs">
                {Array.isArray(publicLinks) ? publicLinks.length : 0}
              </Badge>
            </div>
          </Tab.Title>
        </Tab.List>

        {/* Shared With Me Tab */}
        <Tab.Content value="shared-with-me">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-foreground-secondary">
                Documents that have been shared with you by other users
              </p>
            </div>
            
            {isLoadingSharedWithMe ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : errorSharedWithMe ? (
              <div className="text-center py-12">
                <div className="text-error mb-2">Error loading shared documents</div>
                <p className="text-sm text-foreground-secondary">{errorSharedWithMe.message}</p>
              </div>
            ) : !Array.isArray(sharedWithMe) || sharedWithMe.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-foreground-secondary mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No shared documents
                </h3>
                <p className="text-foreground-secondary">
                  Documents shared with you will appear here
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[calc(100vh-300px)] overflow-y-auto">
                {Array.isArray(sharedWithMe) && sharedWithMe.map((item) => (
                  <div key={item.id} className="border border-border rounded-lg p-4">
                    {/* Document Card */}
                    <div className="mb-4">
                      <DocumentCard
                        document={item.document as any}
                        onDownload={handleDownload}
                        onDelete={handleDelete}
                        onPreview={handlePreview}
                        isDownloading={downloadingDocs.has(item.document?.id || '')}
                        isDeleting={deletingDocs.has(item.document?.id || '')}
                        className="h-40"
                        hideDelete={true}
                        hideDownload={item.share?.accessLevel === 'view'}
                      />
                    </div>

                    {/* Document Title */}
                    <h3 className="font-medium text-foreground mb-2 line-clamp-1">
                      {item.document?.title || 'Untitled Document'}
                    </h3>

                    {/* Shared By Info */}
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                        <Users className="w-3 h-3" />
                        <span>Shared by {item.sharedBy?.name || item.sharedBy?.email || 'Unknown User'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                        <Calendar className="w-3 h-3" />
                        <span>{item.share?.sharedAt ? formatDate(item.share.sharedAt) : 'Date unknown'}</span>
                      </div>
                    </div>

                    {/* Access Level Badge */}
                    <div className="mb-3">
                      <Badge 
                        color={shareUtils.getAccessLevelColor(item.share?.accessLevel || 'view')}
                        className="text-xs"
                      >
                        {shareUtils.getAccessLevelText(item.share?.accessLevel || 'view')}
                      </Badge>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handlePreview(item.document as any)}
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      {item.share?.accessLevel !== 'view' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleDownload(item.document as any)}
                          disabled={downloadingDocs.has(item.document?.id || '')}
                          className="flex-1"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      )}
                      <button
                        id={`remove-shared-${item.id}`}
                        onClick={() => handleRevokeShare(item.document.id, item.share?.id || '')}
                        disabled={revokeUserShareMutation.isPending}
                        className="p-2 hover:bg-danger/10 rounded transition-colors disabled:opacity-50"
                      >
                        <X className="w-4 h-4 text-danger hover:text-danger-dark" />
                      </button>
                    </div>

                    {/* Tooltip */}
                    <CustomTooltip anchorSelect={`#remove-shared-${item.id}`} place="bottom">
                      Remove from shared
                    </CustomTooltip>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Tab.Content>

        {/* Shared By Me Tab */}
        <Tab.Content value="shared-by-me">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-foreground-secondary">
                Documents you have shared with other users
              </p>
            </div>

            {isLoadingSharedByMe ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : errorSharedByMe ? (
              <div className="text-center py-12">
                <div className="text-error mb-2">Error loading shared documents</div>
                <p className="text-sm text-foreground-secondary">{errorSharedByMe.message}</p>
              </div>
            ) : !Array.isArray(sharedByMe) || sharedByMe.length === 0 ? (
              <div className="text-center py-12">
                <Share2 className="w-12 h-12 text-foreground-secondary mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No shared documents
                </h3>
                <p className="text-foreground-secondary">
                  Documents you share with others will appear here
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[calc(100vh-300px)] overflow-y-auto">
                {Array.isArray(sharedByMe) && sharedByMe.map((item) => (
                  <div key={item.id} className="border border-border rounded-lg p-4 relative">
                    {/* Revoke Icon - Top Right */}
                    <button
                      onClick={() => handleRevokeShare(item.document.id, item.shares[0]?.id)}
                      disabled={revokeUserShareMutation.isPending}
                      className="absolute top-3 right-3 p-1 hover:bg-danger/10 rounded-full transition-colors disabled:opacity-50"
                      title="Revoke all shares"
                    >
                      <X className="w-4 h-4 text-danger hover:text-danger-dark" />
                    </button>

                    {/* Document Card */}
                    <div className="mb-4">
                      <DocumentCard
                        document={item.document as any}
                        onDownload={handleDownload}
                        onDelete={handleDelete}
                        onPreview={handlePreview}
                        isDownloading={downloadingDocs.has(item.document?.id || '')}
                        isDeleting={deletingDocs.has(item.document?.id || '')}
                        className="h-40"
                        hideDelete={true}
                      />
                    </div>

                    {/* Document Title */}
                    <h3 className="font-medium text-foreground mb-2 line-clamp-1">
                      {item.document?.title || 'Untitled Document'}
                    </h3>

                    {/* Share Stats */}
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                        <Users className="w-3 h-3" />
                        <span>Shared with {item.totalShares || 0} users</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                        <span>Active: {item.activeShares || 0}</span>
                      </div>
                    </div>

                    {/* Access Level Badge */}
                    <div className="mb-3">
                      <Badge 
                        color="blue"
                        className="text-xs"
                      >
                        Multiple Access Levels
                      </Badge>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handlePreview(item.document as any)}
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleEditSharing(item.document.id)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit Sharing
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Tab.Content>

        {/* Public Links Tab */}
        <Tab.Content value="public-links">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-foreground-secondary">
                Public sharing links you have created
              </p>
            </div>

            {isLoadingPublicLinks ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : errorPublicLinks ? (
              <div className="text-center py-12">
                <div className="text-error mb-2">Error loading public links</div>
                <p className="text-sm text-foreground-secondary">{errorPublicLinks.message}</p>
              </div>
            ) : !Array.isArray(publicLinks) || publicLinks.length === 0 ? (
              <div className="text-center py-12">
                <Link2 className="w-12 h-12 text-foreground-secondary mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No public links
                </h3>
                <p className="text-foreground-secondary">
                  Public sharing links will appear here
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[calc(100vh-300px)] overflow-y-auto">
                {Array.isArray(publicLinks) && publicLinks.map((item) => (
                  <div key={item.id} className="border border-border rounded-lg p-4 relative">

                    {/* Document Card */}
                    <div className="mb-4">
                      <DocumentCard
                        document={item.document as any}
                        onDownload={handleDownload}
                        onDelete={handleDelete}
                        onPreview={handlePreview}
                        isDownloading={downloadingDocs.has(item.document?.id || '')}
                        isDeleting={deletingDocs.has(item.document?.id || '')}
                        className="h-40"
                        hideDelete={true}
                      />
                    </div>

                    {/* Document Title */}
                    <h3 className="font-medium text-foreground mb-2 line-clamp-1">
                      {item.document?.title || 'Untitled Document'}
                    </h3>

                    {/* Info */}
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                        <Calendar className="w-3 h-3" />
                        <span>Created {item.createdAt ? formatDate(item.createdAt) : 'Date unknown'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                        <span>Expires: {item.expiresAt ? formatDate(item.expiresAt) : 'Never'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                        <Download className="w-3 h-3" />
                        <span>{item.currentDownloads || 0}/{item.maxDownloads || '∞'} downloads</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="mb-3">
                      <Badge 
                        color={item.status === 'active' ? 'green' : 'gray'}
                        className="text-xs"
                      >
                        {item.status || 'unknown'}
                      </Badge>
                    </div>

                    {/* Share URL */}
                    <div className="flex items-center gap-2 p-2 bg-background-secondary rounded border border-border">
                      <code className="text-xs flex-1 font-mono text-foreground truncate">
                        {item.shareUrl || 'No URL available'}
                      </code>
                      <button
                        id={`copy-link-${item.id}`}
                        onClick={() => handleCopyLink(item.shareUrl || '')}
                        className="p-1 hover:bg-background-tertiary rounded transition-colors"
                      >
                        <Copy className="w-4 h-4 text-foreground-secondary hover:text-foreground" />
                      </button>
                      <button
                        id={`open-link-${item.id}`}
                        onClick={() => handleOpenLink(item.shareUrl || '')}
                        className="p-1 hover:bg-background-tertiary rounded transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 text-foreground-secondary hover:text-foreground" />
                      </button>
                      <button
                        id={`revoke-link-${item.id}`}
                        onClick={() => handleRevokePublicLink(item.document?.id || '', item.id)}
                        disabled={revokePublicLinkMutation.isPending}
                        className="p-1 hover:bg-danger/10 rounded transition-colors disabled:opacity-50"
                      >
                        <X className="w-4 h-4 text-danger hover:text-danger-dark" />
                      </button>
                    </div>

                    {/* Tooltips */}
                    <CustomTooltip anchorSelect={`#copy-link-${item.id}`} place="bottom">
                      Copy link
                    </CustomTooltip>
                    <CustomTooltip anchorSelect={`#open-link-${item.id}`} place="bottom">
                      Open in new tab
                    </CustomTooltip>
                    <CustomTooltip anchorSelect={`#revoke-link-${item.id}`} place="bottom">
                      Revoke public link
                    </CustomTooltip>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Tab.Content>
      </Tab>

      {/* Revoke Public Link Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRevokeModal}
        onClose={() => {
          setShowRevokeModal(false);
          setSelectedShareId(null);
          setSelectedDocumentId(null);
        }}
        onConfirm={confirmRevokePublicLink}
        title="Revoke Public Link"
        message="Are you sure you want to revoke this public link? This action cannot be undone and the link will no longer work."
        confirmText="Revoke"
        cancelText="Cancel"
        variant="danger"
        isLoading={revokePublicLinkMutation.isPending}
      />

      {/* PDF Viewer Modal */}
      {showPDFViewer && selectedDocument && (
        <PDFViewerModal
          isOpen={showPDFViewer}
          onClose={() => {
            setShowPDFViewer(false);
            setSelectedDocument(null);
          }}
          document={selectedDocument}
        />
      )}

      {/* Edit Sharing Modal */}
      <EditSharingModal
        isOpen={showEditSharingModal}
        onClose={() => {
          setShowEditSharingModal(false);
          setEditingDocumentId(null);
        }}
        documentId={editingDocumentId}
      />
    </div>
  );
};

export default DocumentSharedPage;