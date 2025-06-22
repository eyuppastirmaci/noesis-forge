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
  ChevronLeft,
  ChevronRight,
  FileText,
  File,
  FileSpreadsheet,
  Presentation,
  FileImage,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Trash2,
  Check,
} from "lucide-react";
import LinkButton from "@/components/ui/LinkButton";
import Button from "@/components/ui/Button";
import {
  Document,
  DocumentListRequest,
  DocumentType,
  DocumentStatus,
  DocumentSortField,
  DocumentSortDirection,
  DOCUMENT_QUERY_KEYS,
  getErrorMessage,
} from "@/types";
import {
  documentQueries,
  documentMutations,
  documentService,
} from "@/services/document.services";

import { Select, SelectOption } from "@/components/ui/Select";
import { DocumentCardSkeleton, TextSkeleton } from "@/components/ui/Skeleton";
import { debounce } from "@/utils";
import SearchInput from "@/components/SearchInput";
import DocumentCard from "@/components/DocumentCard";

const DocumentsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // State for filters and pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const deferredSearchInput = useDeferredValue(searchInput);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<DocumentSortField>("date");
  const [sortDir, setSortDir] = useState<DocumentSortDirection>("desc");
  const [filterType, setFilterType] = useState<DocumentType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<DocumentStatus | "all">(
    "all"
  );

  // Multi-select state
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Select options
  const documentTypeOptions: SelectOption[] = [
    { value: "all", label: "All Types", icon: <File className="w-4 h-4" /> },
    { value: "pdf", label: "PDF", icon: <FileText className="w-4 h-4" /> },
    { value: "docx", label: "Word", icon: <FileText className="w-4 h-4" /> },
    { value: "txt", label: "Text", icon: <FileText className="w-4 h-4" /> },
    {
      value: "xlsx",
      label: "Excel",
      icon: <FileSpreadsheet className="w-4 h-4" />,
    },
    {
      value: "pptx",
      label: "PowerPoint",
      icon: <Presentation className="w-4 h-4" />,
    },
    { value: "other", label: "Other", icon: <FileImage className="w-4 h-4" /> },
  ];

  const documentStatusOptions: SelectOption[] = [
    { value: "all", label: "All Status" },
    { value: "ready", label: "Ready" },
    { value: "processing", label: "Processing" },
    { value: "failed", label: "Failed" },
  ];

  const pageSizeOptions: SelectOption[] = [
    { value: "10", label: "10" },
    { value: "20", label: "20" },
    { value: "50", label: "50" },
    { value: "100", label: "100" },
  ];

  const sortOptions: SelectOption[] = [
    { 
      value: "date", 
      label: "Date Created", 
      icon: <ArrowUpDown className="w-4 h-4" /> 
    },
    { 
      value: "size", 
      label: "File Size", 
      icon: <ArrowUpDown className="w-4 h-4" /> 
    },
    { 
      value: "views", 
      label: "View Count", 
      icon: <ArrowUpDown className="w-4 h-4" /> 
    },
    { 
      value: "downloads", 
      label: "Download Count", 
      icon: <ArrowUpDown className="w-4 h-4" /> 
    },
    { 
      value: "title", 
      label: "Title", 
      icon: <ArrowUpDown className="w-4 h-4" /> 
    },
  ];

  const sortDirectionOptions: SelectOption[] = [
    { 
      value: "desc", 
      label: "Descending", 
      icon: <ArrowDown className="w-4 h-4" /> 
    },
    { 
      value: "asc", 
      label: "Ascending", 
      icon: <ArrowUp className="w-4 h-4" /> 
    },
  ];

  const debouncedSearch = useCallback(
    debounce((query: string) => {
      startTransition(() => {
        setSearchQuery(query);
        setCurrentPage(1);
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
      setCurrentPage(1);
    });
  }, []);

  // Build query parameters
  const queryParams: DocumentListRequest = useMemo(
    () => ({
      page: currentPage,
      limit: pageSize,
      search: searchQuery || undefined,
      fileType: filterType !== "all" ? filterType : undefined,
      status: filterStatus !== "all" ? filterStatus : undefined,
      sortBy,
      sortDir,
    }),
    [
      currentPage,
      pageSize,
      searchQuery,
      filterType,
      filterStatus,
      sortBy,
      sortDir,
    ]
  );

  // Fetch documents
  const {
    data: documentsData,
    isLoading,
    error,
    refetch,
  } = useQuery(documentQueries.list(queryParams));

  // Delete mutation
  const deleteMutation = useMutation({
    ...documentMutations.delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: DOCUMENT_QUERY_KEYS.DOCUMENTS.ALL,
      });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    ...documentMutations.bulkDelete(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: DOCUMENT_QUERY_KEYS.DOCUMENTS.ALL,
      });
      setSelectedDocuments(new Set());
      setIsSelectionMode(false);
    },
  });

  // Download mutation
  const downloadMutation = useMutation(documentMutations.download());

  // Bulk download mutation
  const bulkDownloadMutation = useMutation(documentMutations.bulkDownload());

  const handleDownloadDocument = useCallback(
    async (document: Document) => {
      try {
        await downloadMutation.mutateAsync({
          id: document.id,
          originalFileName: document.originalFileName,
        });
      } catch (error) {
        console.error("Download failed:", error);
        alert(`Failed to download document: ${getErrorMessage(error)}`);
      }
    },
    [downloadMutation]
  );

  const handleDeleteDocument = useCallback(
    async (document: Document) => {
      try {
        await deleteMutation.mutateAsync(document.id);
      } catch (error) {
        console.error("Delete failed:", error);
        throw new Error(getErrorMessage(error));
      }
    },
    [deleteMutation]
  );

  const handlePreviewDocument = useCallback(
    async (document: Document) => {
      try {
        const response = await documentService.getDocumentPreview(document.id);
        const previewUrl = response.data.url;
        
        // Open preview in new tab
        window.open(previewUrl, '_blank', 'noopener,noreferrer');
      } catch (error) {
        console.error("Preview failed:", error);
        alert(`Failed to preview document: ${getErrorMessage(error)}`);
      }
    },
    []
  );

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

  // Memoized document data to prevent unnecessary re-renders
  const documents = useMemo(
    () => documentsData?.documents || [],
    [documentsData?.documents]
  );
  const totalPages = useMemo(
    () => documentsData?.totalPages || 0,
    [documentsData?.totalPages]
  );
  const total = useMemo(
    () => documentsData?.total || 0,
    [documentsData?.total]
  );

  const handleSelectAll = useCallback(() => {
    if (!documents.length) return;
    
    const allSelected = documents.every(doc => selectedDocuments.has(doc.id));
    
    if (allSelected) {
      // Deselect all
      setSelectedDocuments(new Set());
    } else {
      // Select all
      setSelectedDocuments(new Set(documents.map(doc => doc.id)));
    }
  }, [documents, selectedDocuments]);

  const handleBulkDownload = useCallback(async () => {
    if (selectedDocuments.size === 0) return;
    
    try {
      const documentIds = Array.from(selectedDocuments);
      await bulkDownloadMutation.mutateAsync({ documentIds });
    } catch (error) {
      console.error("Bulk download failed:", error);
      alert(`Failed to download documents: ${getErrorMessage(error)}`);
    }
  }, [selectedDocuments, bulkDownloadMutation]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedDocuments.size === 0) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedDocuments.size} selected documents? This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      const documentIds = Array.from(selectedDocuments);
      await bulkDeleteMutation.mutateAsync({ documentIds });
    } catch (error) {
      console.error("Bulk delete failed:", error);
      alert(`Failed to delete documents: ${getErrorMessage(error)}`);
    }
  }, [selectedDocuments, bulkDeleteMutation]);

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedDocuments(new Set());
    }
  }, [isSelectionMode]);

  // Check if all documents are selected
  const allSelected = documents.length > 0 && documents.every(doc => selectedDocuments.has(doc.id));
  const someSelected = selectedDocuments.size > 0 && !allSelected;

  return (
    <div className="flex-1 max-h-[calc(100vh-102px)] overflow-y-scroll bg-background">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header with Search/Filters and Actions */}
        <div className="mb-4 flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Search and Filters Container */}
          <div className="flex-1">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              {/* Search Input */}
              <SearchInput
                value={searchInput}
                onChange={handleSearchInputChange}
                onClear={handleSearchClear}
                placeholder="Search documents..."
              />

              {/* Filters Row */}
              <div className="flex items-center gap-3">
                <Select
                  options={documentTypeOptions}
                  value={filterType}
                  onChange={(value) =>
                    startTransition(() => {
                      setFilterType(value as DocumentType | "all");
                      setCurrentPage(1);
                    })
                  }
                  className="min-w-[160px]"
                  aria-label="Filter by document type"
                />

                <Select
                  options={documentStatusOptions}
                  value={filterStatus}
                  onChange={(value) =>
                    startTransition(() => {
                      setFilterStatus(value as DocumentStatus | "all");
                      setCurrentPage(1);
                    })
                  }
                  className="min-w-[140px]"
                  aria-label="Filter by document status"
                />

                {/* Sort By */}
                <Select
                  options={sortOptions}
                  value={sortBy}
                  onChange={(value) =>
                    startTransition(() => {
                      setSortBy(value as DocumentSortField);
                      setCurrentPage(1);
                    })
                  }
                  className="min-w-[140px]"
                  aria-label="Sort by field"
                />

                {/* Sort Direction */}
                <Select
                  options={sortDirectionOptions}
                  value={sortDir}
                  onChange={(value) =>
                    startTransition(() => {
                      setSortDir(value as DocumentSortDirection);
                      setCurrentPage(1);
                    })
                  }
                  className="min-w-[120px]"
                  aria-label="Sort direction"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <LinkButton href="/documents/upload">Upload</LinkButton>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {isSelectionMode && selectedDocuments.size > 0 && (
          <div className="mb-4 p-3 bg-background-secondary border border-border rounded-lg flex items-center justify-between">
            <span className="text-sm text-foreground-secondary">
              {selectedDocuments.size} document{selectedDocuments.size > 1 ? 's' : ''} selected
            </span>
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
            </div>
          </div>
        )}

        {/* Results Header with Select All */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            {isSelectionMode && documents.length > 0 && (
              <div className="flex items-center">
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
                        ? 'bg-blue-600 border-blue-600' 
                        : someSelected 
                        ? 'bg-blue-100 border-blue-600' 
                        : 'border-gray-300 hover:border-blue-400'
                    }`}>
                      {allSelected && <Check className="w-3 h-3 text-white" />}
                      {someSelected && !allSelected && <div className="w-2 h-2 bg-blue-600 rounded-sm" />}
                    </div>
                  </div>
                  <span className="ml-2 text-sm text-foreground-secondary">
                    Select all
                  </span>
                </label>
              </div>
            )}
            
            <div className="flex items-center gap-3">
              <div className="text-sm text-foreground-secondary">
                {isLoading ? (
                  <TextSkeleton />
                ) : (
                  <span>
                    {documents.length} of {total} documents
                  </span>
                )}
              </div>
              
              <Button
                onClick={toggleSelectionMode}
                variant={isSelectionMode ? "secondary" : "ghost"}
                size="sm"
              >
                {isSelectionMode ? "Cancel Selection" : "Select Documents"}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Select
              options={pageSizeOptions}
              value={pageSize.toString()}
              onChange={(value) => {
                startTransition(() => {
                  setPageSize(Number(value));
                  setCurrentPage(1);
                });
              }}
              className="min-w-[80px]"
              aria-label="Items per page"
            />
          </div>
        </div>

        {/* Content Area with Conditional Rendering */}
        {error ? (
          <div className="text-center py-12">
            <div className="text-red-600 dark:text-red-400 mb-4">
              Failed to load documents: {getErrorMessage(error)}
            </div>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : isLoading ? (
          // Loading state for documents grid - Skeleton Cards
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 20 }).map((_, index) => (
              <DocumentCardSkeleton key={index} />
            ))}
          </div>
        ) : documents.length === 0 ? (
          // Empty state
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-lg font-medium mb-2 text-foreground">
              No documents found
            </h3>
            <p className="mb-4 text-foreground-secondary">
              {searchInput
                ? "Try adjusting your search criteria"
                : "Get started by uploading your first document"}
            </p>
            <LinkButton href="/documents/upload">Upload Document</LinkButton>
          </div>
        ) : (
          // Documents Grid with Optimized Cards
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {documents.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                onDownload={handleDownloadDocument}
                onDelete={handleDeleteDocument}
                onPreview={handlePreviewDocument}
                isDownloading={downloadMutation.isPending}
                isDeleting={deleteMutation.isPending}
                isSelectionMode={isSelectionMode}
                isSelected={selectedDocuments.has(document.id)}
                onSelect={handleDocumentSelect}
              />
            ))}
          </div>
        )}

        {/* Pagination - Only show when not loading and has documents */}
        {!isLoading && !error && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center">
            <nav className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-3 py-2 text-sm font-medium rounded-md hover:opacity-80 disabled:opacity-50 transition-opacity bg-background-secondary border border-border text-foreground-secondary"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </button>

              <div className="flex space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page =
                    Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        page === currentPage
                          ? "bg-blue-600 text-white"
                          : "hover:opacity-80 bg-background-secondary border border-border text-foreground-secondary"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-3 py-2 text-sm font-medium rounded-md hover:opacity-80 disabled:opacity-50 transition-opacity bg-background-secondary border border-border text-foreground-secondary"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentsPage;
