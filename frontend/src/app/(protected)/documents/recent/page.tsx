"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useDeferredValue,
  useTransition,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  File,
  FileSpreadsheet,
  Presentation,
  FileImage,
  X,
  Download,
  Trash2,
  Check,
  Eye,
  Share as ShareIcon,
  Heart,
  Clock,
  HardDrive,
  Filter,
  ExternalLink,
  Folder,
  Grid,
  List,
} from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import Image to avoid SSR hydration issues
const Image = dynamic(() => import("next/image"), {
  ssr: false,
  loading: () => (
    <div className="w-16 h-20 bg-background-secondary rounded border border-border animate-pulse flex items-center justify-center">
      <div className="w-6 h-6 bg-border rounded animate-pulse"></div>
    </div>
  ),
});

import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import LinkButton from "@/components/ui/LinkButton";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Select, SelectOption } from "@/components/ui/Select";

import DocumentTypeIndicator from "@/components/DocumentTypeIndicator";
import SearchInput from "@/components/SearchInput";
import CustomTooltip from "@/components/ui/CustomTooltip";

import {
  Document,
  DocumentListRequest,
  DocumentType,
  DocumentStatus,
  DocumentSortField,
  DocumentSortDirection,
  DOCUMENT_QUERY_KEYS,
  DOCUMENT_ENDPOINTS,
  getErrorMessage,
} from "@/types";
import {
  documentQueries,
  documentMutations,
  documentService,
} from "@/services/document.service";
import { favoriteMutations } from "@/services/favorite.service";
import { debounce, toast, formatDate, formatFileSize } from "@/utils";
import { API_CONFIG } from "@/config/api";

// Types for recent documents tracking
interface RecentDocumentActivity {
  documentId: string;
  lastOpened: string;
  openCount: number;
}

interface DateBucket {
  label: string;
  documents: Document[];
  startDate: Date;
  endDate: Date;
}

const DocumentRecentPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // State for view mode
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  
  // State for filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const deferredSearchInput = useDeferredValue(searchInput);
  const [filterType, setFilterType] = useState<DocumentType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<DocumentStatus | "all">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [quickFilter, setQuickFilter] = useState<string[]>([]);

  // Multi-select state
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Continue where you left off state
  const [recentActivity, setRecentActivity] = useState<RecentDocumentActivity[]>([]);
  const [dismissedContinue, setDismissedContinue] = useState(false);

  // Quick filter options
  const quickFilterOptions = [
    { value: "pdf", label: "PDF", icon: <FileText className="w-4 h-4" /> },
    { value: "scanned", label: "Scanned", icon: <FileImage className="w-4 h-4" /> },
    { value: "contracts", label: "Contracts", icon: <File className="w-4 h-4" /> },
    { value: "images", label: "Images", icon: <FileImage className="w-4 h-4" /> },
  ];

  // Document type filter options
  const documentTypeOptions: SelectOption[] = [
    { value: "all", label: "All Types", icon: <File className="w-4 h-4" /> },
    { value: "pdf", label: "PDF", icon: <FileText className="w-4 h-4" /> },
    { value: "docx", label: "Word", icon: <FileText className="w-4 h-4" /> },
    { value: "txt", label: "Text", icon: <FileText className="w-4 h-4" /> },
    { value: "xlsx", label: "Excel", icon: <FileSpreadsheet className="w-4 h-4" /> },
    { value: "pptx", label: "PowerPoint", icon: <Presentation className="w-4 h-4" /> },
    { value: "other", label: "Other", icon: <FileImage className="w-4 h-4" /> },
  ];

  const documentStatusOptions: SelectOption[] = [
    { value: "all", label: "All Status" },
    { value: "ready", label: "Ready" },
    { value: "processing", label: "Processing" },
    { value: "failed", label: "Failed" },
  ];

  // Load recent activity from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("recentDocumentActivity");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setRecentActivity(parsed);
      } catch (error) {
        console.error("Failed to parse recent activity:", error);
      }
    }
    
    const dismissedStored = localStorage.getItem("dismissedContinue");
    setDismissedContinue(dismissedStored === "true");
  }, []);

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      startTransition(() => {
        setSearchQuery(query);
      });
    }, 700),
    []
  );

  useEffect(() => {
    debouncedSearch(deferredSearchInput);
  }, [deferredSearchInput, debouncedSearch]);

  const handleSearchInputChange = useCallback((value: string) => {
    setSearchInput(value);
  }, []);

  const handleSearchClear = useCallback(() => {
    setSearchInput("");
    startTransition(() => {
      setSearchQuery("");
    });
  }, []);

  // Build query parameters for recent documents
  const queryParams: DocumentListRequest = useMemo(
    () => ({
      page: 1,
      limit: 100, // Get more documents to properly bucket them
      search: searchQuery || undefined,
      fileType: filterType !== "all" ? filterType : undefined,
      status: filterStatus !== "all" ? filterStatus : undefined,
      sortBy: "date" as DocumentSortField,
      sortDir: "desc" as DocumentSortDirection,
    }),
    [searchQuery, filterType, filterStatus]
  );

  // Fetch recent documents
  const {
    data: documentsData,
    isLoading,
    error,
    refetch,
  } = useQuery(documentQueries.list(queryParams));

  // Mutations
  const deleteMutation = useMutation({
    ...documentMutations.delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: DOCUMENT_QUERY_KEYS.DOCUMENTS.ALL,
      });
      toast.success("Document deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete document: ${getErrorMessage(error)}`);
    },
  });

  const bulkDeleteMutation = useMutation({
    ...documentMutations.bulkDelete(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: DOCUMENT_QUERY_KEYS.DOCUMENTS.ALL,
      });
      setSelectedDocuments(new Set());
      setIsSelectionMode(false);
      toast.success("Documents deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete documents: ${getErrorMessage(error)}`);
    },
  });

  const downloadMutation = useMutation(documentMutations.download());
  const bulkDownloadMutation = useMutation(documentMutations.bulkDownload());

  const addToFavoritesMutation = useMutation({
    ...favoriteMutations.add(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["favorites"],
      });
      toast.success("Document added to favorites");
    },
    onError: (error) => {
      toast.error(`Failed to add to favorites: ${getErrorMessage(error)}`);
    },
  });

  // Document action handlers
  const handleOpenDocument = useCallback((document: Document) => {
    // Track the document opening
    const newActivity: RecentDocumentActivity = {
      documentId: document.id,
      lastOpened: new Date().toISOString(),
      openCount: 1,
    };

    setRecentActivity(prev => {
      const existing = prev.find(a => a.documentId === document.id);
      let updated: RecentDocumentActivity[];
      
      if (existing) {
        updated = prev.map(a => 
          a.documentId === document.id 
            ? { ...a, lastOpened: newActivity.lastOpened, openCount: a.openCount + 1 }
            : a
        );
      } else {
        updated = [newActivity, ...prev];
      }
      
      // Keep only last 10 activities
      updated = updated.slice(0, 10);
      
      localStorage.setItem("recentDocumentActivity", JSON.stringify(updated));
      return updated;
    });

    // Navigate to document
    window.open(`/documents/${document.id}`, '_blank');
  }, []);

  const handleDownloadDocument = useCallback(async (document: Document) => {
    try {
      await downloadMutation.mutateAsync({
        id: document.id,
        originalFileName: document.originalFileName,
      });
      toast.success("Download started");
    } catch (error) {
      console.error("Download failed:", error);
      toast.error(`Failed to download document: ${getErrorMessage(error)}`);
    }
  }, [downloadMutation]);

  const handleDeleteDocument = useCallback(async (document: Document) => {
    if (window.confirm(`Are you sure you want to delete "${document.title}"?`)) {
      try {
        await deleteMutation.mutateAsync(document.id);
      } catch (error) {
        console.error("Delete failed:", error);
      }
    }
  }, [deleteMutation]);

  const handlePreviewDocument = useCallback(async (document: Document) => {
    try {
      const response = await documentService.getDocumentPreview(document.id);
      const previewUrl = response.data.url;
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error("Preview failed:", error);
      toast.error(`Failed to preview document: ${getErrorMessage(error)}`);
    }
  }, []);

  const handleAddToFavorites = useCallback(async (document: Document) => {
    try {
      await addToFavoritesMutation.mutateAsync({ documentId: document.id });
    } catch (error) {
      console.error("Add to favorites failed:", error);
    }
  }, [addToFavoritesMutation]);

  const handleShareDocument = useCallback((document: Document) => {
    // This would open a share modal - for now just show a toast
    toast.info("Share functionality will be implemented soon");
  }, []);

  // Multi-select handlers
  const handleDocumentSelect = useCallback((documentId: string, selected: boolean) => {
    setSelectedDocuments(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(documentId);
      } else {
        newSet.delete(documentId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (!documentsData?.documents.length) return;
    
    const allSelected = documentsData.documents.every(doc => selectedDocuments.has(doc.id));
    
    if (allSelected) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(documentsData.documents.map(doc => doc.id)));
    }
  }, [documentsData?.documents, selectedDocuments]);

  const handleBulkDownload = useCallback(async () => {
    if (selectedDocuments.size === 0) return;
    
    try {
      const documentIds = Array.from(selectedDocuments);
      await bulkDownloadMutation.mutateAsync({ documentIds });
      toast.success("Bulk download started");
    } catch (error) {
      console.error("Bulk download failed:", error);
      toast.error(`Failed to download documents: ${getErrorMessage(error)}`);
    }
  }, [selectedDocuments, bulkDownloadMutation]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedDocuments.size === 0) return;
    
    const confirmed = window.confirm(`Are you sure you want to delete ${selectedDocuments.size} documents?`);
    if (!confirmed) return;
    
    try {
      const documentIds = Array.from(selectedDocuments);
      await bulkDeleteMutation.mutateAsync({ documentIds });
    } catch (error) {
      console.error("Bulk delete failed:", error);
    }
  }, [selectedDocuments, bulkDeleteMutation]);

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode(prev => {
      const next = !prev;
      if (!next) {
        setSelectedDocuments(new Set());
      }
      return next;
    });
  }, []);

  const handleQuickFilter = useCallback((filter: string) => {
    setQuickFilter(prev => {
      const isActive = prev.includes(filter);
      if (isActive) {
        return prev.filter(f => f !== filter);
      } else {
        return [...prev, filter];
      }
    });
  }, []);

  const handleDismissContinue = useCallback(() => {
    setDismissedContinue(true);
    localStorage.setItem("dismissedContinue", "true");
  }, []);

  // Process documents and create date buckets
  const processedData = useMemo(() => {
    if (!documentsData?.documents) return { continueDocuments: [], dateBuckets: [] };

    const documents = documentsData.documents;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    // Get continue documents (last 5 from recent activity)
    const continueDocuments = recentActivity
      .slice(0, 5)
      .map(activity => documents.find(doc => doc.id === activity.documentId))
      .filter(Boolean) as Document[];

    // Filter documents based on quick filters
    let filteredDocuments = documents;
    if (quickFilter.length > 0) {
      filteredDocuments = documents.filter(doc => {
        return quickFilter.some(filter => {
          switch (filter) {
            case "pdf":
              return doc.fileType === "pdf";
            case "scanned":
              return doc.tags?.toLowerCase().includes("scanned");
            case "contracts":
              return doc.tags?.toLowerCase().includes("contract");
            case "images":
              return ["jpg", "jpeg", "png", "gif", "bmp", "svg"].includes(doc.fileType);
            default:
              return false;
          }
        });
      });
    }

    // Create date buckets
    const todayDocs = filteredDocuments.filter(doc => {
      const docDate = new Date(doc.updatedAt);
      return docDate >= today;
    });

    const yesterdayDocs = filteredDocuments.filter(doc => {
      const docDate = new Date(doc.updatedAt);
      return docDate >= yesterday && docDate < today;
    });

    const lastWeekDocs = filteredDocuments.filter(doc => {
      const docDate = new Date(doc.updatedAt);
      return docDate >= lastWeek && docDate < yesterday;
    });

    const olderDocs = filteredDocuments.filter(doc => {
      const docDate = new Date(doc.updatedAt);
      return docDate < lastWeek;
    });

    const dateBuckets: DateBucket[] = [
      { label: "Today", documents: todayDocs, startDate: today, endDate: now },
      { label: "Yesterday", documents: yesterdayDocs, startDate: yesterday, endDate: today },
      { label: "Last 7 days", documents: lastWeekDocs, startDate: lastWeek, endDate: yesterday },
      { label: "Older", documents: olderDocs, startDate: new Date(0), endDate: lastWeek },
    ].filter(bucket => bucket.documents.length > 0);

    return { continueDocuments, dateBuckets };
  }, [documentsData?.documents, recentActivity, quickFilter]);

  const allSelected = documentsData?.documents && documentsData.documents.length > 0 && 
    documentsData.documents.every(doc => selectedDocuments.has(doc.id));
  const someSelected = selectedDocuments.size > 0 && !allSelected;

  return (
    <div className="flex-1 max-h-[calc(100vh-102px)] overflow-y-scroll bg-background">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Recent Documents</h1>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant={showFilters ? "secondary" : "ghost"}
              size="sm"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <div className="flex items-center bg-background-secondary rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded transition-colors ${
                  viewMode === "grid" 
                    ? "bg-background text-foreground" 
                    : "text-foreground-secondary hover:text-foreground"
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded transition-colors ${
                  viewMode === "list" 
                    ? "bg-background text-foreground" 
                    : "text-foreground-secondary hover:text-foreground"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <LinkButton href="/documents/upload">Upload</LinkButton>
          </div>
        </div>

        {/* Filters Row */}
        {showFilters && (
          <div className="mb-6 p-4 bg-background-secondary rounded-lg border border-border">
            <div className="flex flex-col gap-4">
              {/* Search */}
              <div className="flex-1">
                <SearchInput
                  value={searchInput}
                  onChange={handleSearchInputChange}
                  onClear={handleSearchClear}
                  placeholder="Search within recent documents..."
                />
              </div>

              {/* Quick Filters */}
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-foreground-secondary self-center mr-2">Quick filters:</span>
                {quickFilterOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleQuickFilter(option.value)}
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm transition-colors ${
                      quickFilter.includes(option.value)
                        ? "bg-info text-primary-foreground"
                        : "bg-background border border-border hover:bg-background-tertiary"
                    }`}
                  >
                    {option.icon}
                    {option.label}
                  </button>
                ))}
              </div>

              {/* Advanced Filters */}
              <div className="flex flex-wrap gap-3">
                <Select
                  options={documentTypeOptions}
                  value={filterType}
                  onChange={(value) => setFilterType(value as DocumentType | "all")}
                  className="min-w-[160px]"
                  aria-label="Filter by document type"
                />
                <Select
                  options={documentStatusOptions}
                  value={filterStatus}
                  onChange={(value) => setFilterStatus(value as DocumentStatus | "all")}
                  className="min-w-[140px]"
                  aria-label="Filter by document status"
                />
              </div>
            </div>
          </div>
        )}

        {/* Continue Where You Left Off */}
        {!dismissedContinue && processedData.continueDocuments.length > 0 && (
          <Card className="mb-6">
            <Card.Header>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Continue where you left off</h2>
                <IconButton
                  Icon={X}
                  onClick={handleDismissContinue}
                  variant="default"
                  size="sm"
                  className="text-foreground-secondary"
                />
              </div>
            </Card.Header>
            <Card.Content>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {processedData.continueDocuments.map(document => (
                  <div
                    key={document.id}
                    className="flex-shrink-0 w-48 p-3 bg-background-secondary rounded-lg border border-border hover:bg-background-tertiary transition-colors cursor-pointer"
                    onClick={() => handleOpenDocument(document)}
                  >
                    <div className="flex items-center justify-center h-24 mb-3 bg-background rounded border border-border">
                      {document.fileType === "pdf" && document.hasThumbnail ? (
                        <Image
                          src={`${API_CONFIG.BASE_URL}${DOCUMENT_ENDPOINTS.THUMBNAIL(document.id)}?v=${document.version}`}
                          alt={`${document.title} thumbnail`}
                          width={80}
                          height={96}
                          className="max-h-full max-w-full object-contain rounded"
                        />
                      ) : (
                        <DocumentTypeIndicator fileType={document.fileType} size="lg" />
                      )}
                    </div>
                    <h3 className="font-medium text-sm mb-1 truncate">{document.title}</h3>
                    <p className="text-xs text-foreground-secondary truncate">{document.originalFileName}</p>
                    <div className="flex items-center justify-between mt-2">
                      <Button size="sm" variant="secondary" className="text-xs">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Open
                      </Button>
                      <span className="text-xs text-foreground-secondary">
                        {formatDate(document.updatedAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>
        )}

        {/* Selection Mode Controls */}
        {isSelectionMode && (
          <div className="mb-4 p-3 bg-background-secondary border border-border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = someSelected;
                      }}
                      onChange={handleSelectAll}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                      allSelected 
                        ? 'bg-info border-info' 
                        : someSelected 
                        ? 'bg-info-light border-info' 
                        : 'border-border hover:border-info'
                    }`}>
                      {allSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                      {someSelected && !allSelected && <div className="w-2 h-2 bg-info rounded-sm" />}
                    </div>
                  </div>
                  <span className="ml-2 text-sm text-foreground-secondary">
                    Select all
                  </span>
                </label>
                <span className="text-sm text-foreground-secondary">
                  {selectedDocuments.size} document{selectedDocuments.size > 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleBulkDownload}
                  disabled={bulkDownloadMutation.isPending}
                  size="sm"
                  variant="ghost"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {bulkDownloadMutation.isPending ? "Downloading..." : "Download Selected"}
                </Button>
                <Button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleteMutation.isPending}
                  size="sm"
                  variant="error"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {bulkDeleteMutation.isPending ? "Deleting..." : "Delete Selected"}
                </Button>
                <Button
                  onClick={toggleSelectionMode}
                  size="sm"
                  variant="secondary"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Action Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button
              onClick={toggleSelectionMode}
              variant={isSelectionMode ? "secondary" : "ghost"}
              size="sm"
            >
              {isSelectionMode ? "Cancel Selection" : "Select Documents"}
            </Button>
            {isLoading ? (
              <LoadingSpinner size="sm" variant="default" />
            ) : processedData.dateBuckets.reduce((acc, bucket) => acc + bucket.documents.length, 0) > 0 && (
              <div className="text-sm text-foreground-secondary">
                {processedData.dateBuckets.reduce((acc, bucket) => acc + bucket.documents.length, 0)} recent documents
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        {error ? (
          <div className="text-center py-12">
            <div className="text-error mb-4">
              Failed to load recent documents: {getErrorMessage(error)}
            </div>
            <Button onClick={() => refetch()} variant="primary">
              Try Again
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="xl" variant="primary" />
          </div>
        ) : processedData.dateBuckets.length === 0 ? (
          <div className="text-center py-12">
            <Folder className="w-16 h-16 text-foreground-secondary mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2 text-foreground">
              No recent documents found
            </h3>
            <p className="mb-4 text-foreground-secondary">
              {searchInput 
                ? "Try adjusting your search criteria or filters"
                : "Documents you've recently viewed or modified will appear here"}
            </p>
            <LinkButton href="/documents/upload">Upload Your First Document</LinkButton>
          </div>
        ) : (
          // Date Buckets
          <div className="space-y-6">
            {processedData.dateBuckets.map(bucket => (
              <div key={bucket.label} className="space-y-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-foreground">{bucket.label}</h2>
                  <div className="flex-1 h-px bg-border"></div>
                  <span className="text-sm text-foreground-secondary">
                    {bucket.documents.length} document{bucket.documents.length > 1 ? 's' : ''}
                  </span>
                </div>

                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {bucket.documents.map(document => (
                      <DocumentCard key={document.id} document={document} />
                    ))}
                  </div>
                ) : (
                  <div className="bg-background border border-border rounded-lg overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-background-secondary border-b border-border">
                          <tr className="text-left">
                            {isSelectionMode && (
                              <th className="w-16 px-6 py-4">
                                <div className="w-5 h-5"></div>
                              </th>
                            )}
                            <th className="px-6 py-4 text-sm font-semibold text-foreground-secondary w-80">Document</th>
                            <th className="px-6 py-4 text-sm font-semibold text-foreground-secondary w-40">Last Modified</th>
                            <th className="px-6 py-4 text-sm font-semibold text-foreground-secondary w-28">Size</th>
                            <th className="px-6 py-4 text-sm font-semibold text-foreground-secondary w-24">Type</th>
                            <th className="px-6 py-4 text-sm font-semibold text-foreground-secondary w-32">Tags</th>
                            <th className="px-6 py-4 text-sm font-semibold text-foreground-secondary w-40">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {bucket.documents.map(document => (
                            <DocumentRow
                              key={document.id}
                              document={document}
                              isSelectionMode={isSelectionMode}
                              isSelected={selectedDocuments.has(document.id)}
                              onSelect={handleDocumentSelect}
                              onOpen={handleOpenDocument}
                              onDownload={handleDownloadDocument}
                              onDelete={handleDeleteDocument}
                              onPreview={handlePreviewDocument}
                              onAddToFavorites={handleAddToFavorites}
                              onShare={handleShareDocument}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Document Row Component for List View
interface DocumentRowProps {
  document: Document;
  isSelectionMode: boolean;
  isSelected: boolean;
  onSelect: (documentId: string, selected: boolean) => void;
  onOpen: (document: Document) => void;
  onDownload: (document: Document) => void;
  onDelete: (document: Document) => void;
  onPreview: (document: Document) => void;
  onAddToFavorites: (document: Document) => void;
  onShare: (document: Document) => void;
}

const DocumentRow: React.FC<DocumentRowProps> = ({
  document,
  isSelectionMode,
  isSelected,
  onSelect,
  onOpen,
  onDownload,
  onDelete,
  onPreview,
  onAddToFavorites,
  onShare,
}) => {
  const handleRowClick = useCallback((e: React.MouseEvent) => {
    if (isSelectionMode) {
      e.preventDefault();
      onSelect(document.id, !isSelected);
    } else {
      onOpen(document);
    }
  }, [isSelectionMode, isSelected, onSelect, onOpen, document.id]);

  const handleActionClick = useCallback((action: () => void) => {
    action();
  }, []);

  return (
    <tr
      className={`hover:bg-background-secondary transition-colors cursor-pointer ${
        isSelected ? 'bg-info-light/20' : ''
      }`}
      onClick={handleRowClick}
    >
      {isSelectionMode && (
        <td className="px-6 py-4 w-16">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSelect(document.id, e.target.checked)}
              className="w-4 h-4 text-info border-border rounded focus:ring-info/30"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </td>
      )}
      <td className="px-6 py-4 w-80">
        <div className="flex items-center gap-4 max-w-full">
          <div className="flex-shrink-0 w-12 h-16">
            {document.fileType === "pdf" && document.hasThumbnail ? (
              <Image
                src={`${API_CONFIG.BASE_URL}${DOCUMENT_ENDPOINTS.THUMBNAIL(document.id)}?v=${document.version}`}
                alt={`${document.title} thumbnail`}
                width={48}
                height={64}
                className="w-full h-full object-cover rounded border border-border"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-background-secondary rounded border border-border">
                <DocumentTypeIndicator fileType={document.fileType} size="md" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 max-w-56">
            <h3 className="font-medium text-sm text-foreground truncate" title={document.title}>
              {document.title}
            </h3>
            <p className="text-xs text-foreground-secondary truncate mt-1" title={document.originalFileName}>
              {document.originalFileName}
            </p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 w-40">
        <div className="flex items-center gap-2 text-sm text-foreground-secondary">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span>{formatDate(document.updatedAt)}</span>
        </div>
      </td>
      <td className="px-6 py-4 w-28">
        <div className="flex items-center gap-2 text-sm text-foreground-secondary">
          <HardDrive className="w-4 h-4 flex-shrink-0" />
          <span>{formatFileSize(document.fileSize)}</span>
        </div>
      </td>
      <td className="px-6 py-4 w-24">
        <div className="flex items-center gap-2">
          <DocumentTypeIndicator fileType={document.fileType} size="sm" />
          <span className="text-sm font-medium text-foreground uppercase truncate">
            {document.fileType}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 w-32">
        {document.tags ? (
          <div className="flex flex-wrap gap-1">
            {document.tags.split(",").slice(0, 2).map((tag, index) => (
              <Badge key={index} color="blue" size="sm">
                {tag.trim()}
              </Badge>
            ))}
            {document.tags.split(",").length > 2 && (
              <Badge color="gray" size="sm">
                +{document.tags.split(",").length - 2} more
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-sm text-foreground-secondary">No tags</span>
        )}
      </td>
      <td className="px-6 py-4 w-40">
        <div className="flex items-center gap-1">
          <div id={`preview-${document.id}`}>
            <IconButton
              Icon={Eye}
              onClick={() => handleActionClick(() => onPreview(document))}
              variant="default"
              size="sm"
              bordered={false}
            />
          </div>
          <div id={`download-${document.id}`}>
            <IconButton
              Icon={Download}
              onClick={() => handleActionClick(() => onDownload(document))}
              variant="default"
              size="sm"
              bordered={false}
            />
          </div>
          <div id={`favorite-${document.id}`}>
            <IconButton
              Icon={Heart}
              onClick={() => handleActionClick(() => onAddToFavorites(document))}
              variant="default"
              size="sm"
              bordered={false}
            />
          </div>
          <div id={`share-${document.id}`}>
            <IconButton
              Icon={ShareIcon}
              onClick={() => handleActionClick(() => onShare(document))}
              variant="default"
              size="sm"
              bordered={false}
            />
          </div>
          <div id={`delete-${document.id}`}>
            <IconButton
              Icon={Trash2}
              onClick={() => handleActionClick(() => onDelete(document))}
              variant="danger"
              size="sm"
              bordered={false}
            />
          </div>
          
          {/* Tooltips */}
          <CustomTooltip anchorSelect={`#preview-${document.id}`} place="bottom">
            Preview
          </CustomTooltip>
          <CustomTooltip anchorSelect={`#download-${document.id}`} place="bottom">
            Download
          </CustomTooltip>
          <CustomTooltip anchorSelect={`#favorite-${document.id}`} place="bottom">
            Add to Favorites
          </CustomTooltip>
          <CustomTooltip anchorSelect={`#share-${document.id}`} place="bottom">
            Share
          </CustomTooltip>
          <CustomTooltip anchorSelect={`#delete-${document.id}`} place="bottom">
            Delete
          </CustomTooltip>
        </div>
      </td>
    </tr>
  );
};

// Simple Document Card Component for Grid View
interface DocumentCardProps {
  document: Document;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ document }) => {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <Card.Content>
        <div className="flex items-center justify-center h-32 mb-3 bg-background-secondary rounded border border-border">
          {document.fileType === "pdf" && document.hasThumbnail ? (
            <Image
              src={`${API_CONFIG.BASE_URL}${DOCUMENT_ENDPOINTS.THUMBNAIL(document.id)}?v=${document.version}`}
              alt={`${document.title} thumbnail`}
              width={120}
              height={120}
              className="max-h-full max-w-full object-contain rounded"
            />
          ) : (
            <DocumentTypeIndicator fileType={document.fileType} size="lg" />
          )}
        </div>
        <h3 className="font-medium text-sm mb-1 truncate">{document.title}</h3>
        <p className="text-xs text-foreground-secondary mb-2 truncate">{document.originalFileName}</p>
        <div className="flex items-center justify-between text-xs text-foreground-secondary">
          <span>{formatDate(document.updatedAt)}</span>
          <span>{formatFileSize(document.fileSize)}</span>
        </div>
      </Card.Content>
    </Card>
  );
};

export default DocumentRecentPage;