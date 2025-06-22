"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Plus,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
  ArrowDown,
  FileText,
  File,
  FileSpreadsheet,
  Presentation,
  FileImage,
} from "lucide-react";
import LinkButton from "@/components/ui/LinkButton";
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
  documentService,
  documentQueries,
  documentMutations,
} from "@/services/document.services";
import CustomTooltip from "@/components/ui/CustomTooltip";
import IconButton from "@/components/ui/IconButton";
import DocumentTypeIndicator from "@/components/DocumentTypeIndicator";
import { Select, SelectOption } from "@/components/ui/Select";
import { DocumentCardSkeleton, TextSkeleton } from "@/components/ui/Skeleton";
import { debounce } from "@/utils";

const DocumentsPage: React.FC = () => {
  const queryClient = useQueryClient();

  // State for filters and pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState(""); // Separate state for input
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<DocumentSortField>("date");
  const [sortDir, setSortDir] = useState<DocumentSortDirection>("desc");
  const [filterType, setFilterType] = useState<DocumentType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<DocumentStatus | "all">(
    "all"
  );

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

  // Download mutation
  const downloadMutation = useMutation(documentMutations.download());

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      setSearchQuery(query);
      setCurrentPage(1); // Reset to first page when searching
    }, 500), // 500ms delay
    []
  );

  // Handle search input change
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    debouncedSearch(value);
  };

  // Event handlers
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Immediately apply search without waiting for debounce
    setSearchQuery(searchInput);
    setCurrentPage(1);
  };

  const handleDeleteDocument = async (document: Document) => {
    if (
      window.confirm(`Are you sure you want to delete "${document.title}"?`)
    ) {
      try {
        await deleteMutation.mutateAsync(document.id);
      } catch (error) {
        console.error("Delete failed:", error);
        alert(`Failed to delete document: ${getErrorMessage(error)}`);
      }
    }
  };

  const handleDownloadDocument = async (document: Document) => {
    try {
      await downloadMutation.mutateAsync({
        id: document.id,
        originalFileName: document.originalFileName,
      });
    } catch (error) {
      console.error("Download failed:", error);
      alert(`Failed to download document: ${getErrorMessage(error)}`);
    }
  };

  const formatFileSize = (bytes: number) => {
    return documentService.formatFileSize(bytes);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: DocumentStatus) => {
    const statusColors = {
      ready:
        "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
      processing:
        "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
      failed: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
      deleted: "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300",
    };

    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[status]}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const documents = documentsData?.documents || [];
  const totalPages = documentsData?.totalPages || 0;
  const total = documentsData?.total || 0;

  return (
    <div className="max-h-[calc(100vh-92px)] overflow-y-scroll bg-background">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header with Search/Filters and Upload - Always visible */}
        <div className="mb-4 flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Search and Filters Container */}
          <div className="flex-1">
            <form onSubmit={handleSearch}>
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                {/* Search Input */}
                <div className="lg:flex-1 lg:max-w-sm relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchInput}
                    onChange={handleSearchInputChange}
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors bg-background border border-border text-foreground"
                  />
                </div>

                {/* Filters Row */}
                <div className="flex items-center gap-3">
                  <Select
                    options={documentTypeOptions}
                    value={filterType}
                    onChange={(value) =>
                      setFilterType(value as DocumentType | "all")
                    }
                    className="min-w-[160px]"
                    aria-label="Filter by document type"
                  />

                  <Select
                    options={documentStatusOptions}
                    value={filterStatus}
                    onChange={(value) =>
                      setFilterStatus(value as DocumentStatus | "all")
                    }
                    className="min-w-[140px]"
                    aria-label="Filter by document status"
                  />

                  <button
                    type="submit"
                    className="px-4 py-2.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Search
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Upload Button - Separate */}
          <LinkButton href="/documents/upload">
            Upload
          </LinkButton>
        </div>

        {/* Results Header with Loading State */}
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-foreground-secondary">
            {isLoading ? (
              <TextSkeleton />
            ) : (
              <span>
                {documents.length} of {total} documents
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Select
              options={pageSizeOptions}
              value={pageSize.toString()}
              onChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(1);
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
            {Array.from({ length: 8 }).map((_, index) => (
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
            <LinkButton href="/documents/upload">
              Upload Document
            </LinkButton>
          </div>
        ) : (
          // Documents Grid
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {documents.map((document) => (
              <div
                key={document.id}
                className="rounded-lg shadow-sm hover:shadow-md transition-shadow min-h-[180px] flex flex-col bg-background-secondary border border-border"
              >
                <div className="p-4 flex flex-col h-full">
                  {/* Header with icon and actions */}
                  <div className="flex items-start justify-between mb-3">
                    <DocumentTypeIndicator
                      fileType={document.fileType}
                      size="md"
                      className="flex-shrink-0"
                    />
                    <div className="flex space-x-1 flex-shrink-0">
                      <div data-tooltip-id={`download-${document.id}`}>
                        <IconButton
                          Icon={Download}
                          onClick={() => handleDownloadDocument(document)}
                          variant="default"
                          size="sm"
                          bordered={false}
                          disabled={downloadMutation.isPending}
                        />
                      </div>
                      <CustomTooltip
                        anchorSelect={`[data-tooltip-id='download-${document.id}']`}
                      >
                        Download document
                      </CustomTooltip>

                      <div data-tooltip-id={`delete-${document.id}`}>
                        <IconButton
                          Icon={Trash2}
                          onClick={() => handleDeleteDocument(document)}
                          variant="danger"
                          size="sm"
                          bordered={false}
                          disabled={deleteMutation.isPending}
                        />
                      </div>
                      <CustomTooltip
                        anchorSelect={`[data-tooltip-id='delete-${document.id}']`}
                      >
                        Delete document
                      </CustomTooltip>
                    </div>
                  </div>

                  {/* Document title */}
                  <h3 className="text-sm font-medium mb-2 line-clamp-2 flex-grow text-foreground">
                    {document.title}
                  </h3>

                  {/* Document metadata */}
                  <div className="space-y-1.5 text-xs mt-auto text-foreground-secondary">
                    <div className="flex justify-between items-center">
                      <span>{formatFileSize(document.fileSize)}</span>
                      <span>{formatDate(document.createdAt)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex-shrink-0">
                        {getStatusBadge(document.status)}
                      </div>
                      <div className="flex space-x-3 flex-shrink-0">
                        <span
                          className="flex items-center space-x-1"
                          data-tooltip-id={`views-${document.id}`}
                        >
                          <Eye className="w-3 h-3 flex-shrink-0" />
                          <span className="flex-shrink-0">
                            {document.viewCount}
                          </span>
                        </span>
                        <CustomTooltip
                          anchorSelect={`[data-tooltip-id='views-${document.id}']`}
                        >
                          Total views: {document.viewCount}
                        </CustomTooltip>

                        <span
                          className="flex items-center space-x-1"
                          data-tooltip-id={`downloads-${document.id}`}
                        >
                          <ArrowDown className="w-3 h-3 flex-shrink-0" />
                          <span className="flex-shrink-0">
                            {document.downloadCount}
                          </span>
                        </span>
                        <CustomTooltip
                          anchorSelect={`[data-tooltip-id='downloads-${document.id}']`}
                        >
                          Total downloads: {document.downloadCount}
                        </CustomTooltip>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
