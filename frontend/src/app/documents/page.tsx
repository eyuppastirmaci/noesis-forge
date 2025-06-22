"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Plus,
  Download,
  Trash2,
  Grid3X3,
  List,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  Eye,
  ArrowDown,
  FileText,
  File,
  FileSpreadsheet,
  Presentation,
  FileImage,
} from "lucide-react";
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

const DocumentsPage: React.FC = () => {
  const queryClient = useQueryClient();

  // State for filters and pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<DocumentSortField>("date");
  const [sortDir, setSortDir] = useState<DocumentSortDirection>("desc");
  const [filterType, setFilterType] = useState<DocumentType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<DocumentStatus | "all">(
    "all"
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

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
    { value: "10", label: "10 per page" },
    { value: "20", label: "20 per page" },
    { value: "50", label: "50 per page" },
    { value: "100", label: "100 per page" },
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

  // Event handlers
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when searching
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

  const handleSort = (field: DocumentSortField) => {
    if (sortBy === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
    setCurrentPage(1);
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
        className={`inline-flex items-center px-2.5 py-1 rounded-md font-medium ${statusColors[status]}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-foreground-secondary">
          Loading documents...
        </span>
      </div>
    );
  }

  if (error) {
    return (
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
    );
  }

  const documents = documentsData?.documents || [];
  const totalPages = documentsData?.totalPages || 0;
  const total = documentsData?.total || 0;

  return (
    <div className="max-h-[calc(100vh-92px)] overflow-y-scroll bg-background">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Documents</h1>
            <p className="mt-1 text-foreground-secondary">
              Manage and search through your uploaded documents
            </p>
          </div>
          <Link
            href="/documents/upload"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Upload Document
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="rounded-lg shadow-sm p-6 mb-6 bg-background-secondary border border-border">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-4 space-y-4 lg:space-y-0">
              {/* Search Input */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors bg-background border border-border text-foreground"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
                <Select
                  options={documentTypeOptions}
                  value={filterType}
                  onChange={(value) =>
                    setFilterType(value as DocumentType | "all")
                  }
                  className="min-w-[150px]"
                  aria-label="Filter by document type"
                />

                <Select
                  options={documentStatusOptions}
                  value={filterStatus}
                  onChange={(value) =>
                    setFilterStatus(value as DocumentStatus | "all")
                  }
                  className="min-w-[130px]"
                  aria-label="Filter by document status"
                />

                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Search
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Results Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-sm text-foreground-secondary">
            Showing {documents.length} of {total} documents
          </div>

          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-md border border-border">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 transition-colors ${
                  viewMode === "grid"
                    ? "bg-blue-600 text-white"
                    : "text-foreground-secondary"
                }`}
                data-tooltip-id="grid-view-tooltip"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 transition-colors ${
                  viewMode === "list"
                    ? "bg-blue-600 text-white"
                    : "text-foreground-secondary"
                }`}
                data-tooltip-id="list-view-tooltip"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <CustomTooltip anchorSelect="[data-tooltip-id='grid-view-tooltip']">
              Switch to grid view
            </CustomTooltip>
            <CustomTooltip anchorSelect="[data-tooltip-id='list-view-tooltip']">
              Switch to list view
            </CustomTooltip>

            {/* Page Size Selector */}
            <Select
              options={pageSizeOptions}
              value={pageSize.toString()}
              onChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(1);
              }}
              className="min-w-[140px]"
              aria-label="Select page size"
            />
          </div>
        </div>

        {/* Documents Grid/List */}
        {documents.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-lg font-medium mb-2 text-foreground">
              No documents found
            </h3>
            <p className="mb-4 text-foreground-secondary">
              {searchQuery
                ? "Try adjusting your search criteria"
                : "Get started by uploading your first document"}
            </p>
            <Link
              href="/documents/upload"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Upload Document
            </Link>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {documents.map((document) => (
              <div
                key={document.id}
                className="rounded-lg shadow-sm hover:shadow-md transition-shadow min-h-[200px] flex flex-col bg-background-secondary border border-border"
              >
                <div className="p-6 flex flex-col h-full">
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
                  <div className="space-y-2 text-xs mt-auto text-foreground-secondary">
                    <div>{formatFileSize(document.fileSize)}</div>
                    <div>{formatDate(document.createdAt)}</div>
                    <div className="flex items-center justify-between pr-1.5 pt-1">
                      <div className="flex-shrink-0">
                        {getStatusBadge(document.status)}
                      </div>
                      <div className="flex space-x-2 flex-shrink-0">
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
        ) : (
          <div className="rounded-lg shadow-sm overflow-hidden bg-background-secondary border border-border">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-background">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:opacity-80 transition-opacity text-foreground-secondary"
                    onClick={() => handleSort("title")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Name</span>
                      {sortBy === "title" &&
                        (sortDir === "asc" ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        ))}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-foreground-secondary">
                    Type
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:opacity-80 transition-opacity text-foreground-secondary"
                    onClick={() => handleSort("size")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Size</span>
                      {sortBy === "size" &&
                        (sortDir === "asc" ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        ))}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-foreground-secondary">
                    Status
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:opacity-80 transition-opacity text-foreground-secondary"
                    onClick={() => handleSort("date")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Created</span>
                      {sortBy === "date" &&
                        (sortDir === "asc" ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        ))}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-foreground-secondary">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-background-secondary divide-y divide-border">
                {documents.map((document) => (
                  <tr
                    key={document.id}
                    className="hover:opacity-80 transition-opacity"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <DocumentTypeIndicator
                          fileType={document.fileType}
                          size="sm"
                          className="mr-3 flex-shrink-0"
                        />
                        <div className="flex-grow">
                          <div className="text-sm font-medium mb-1 text-foreground">
                            {document.title}
                          </div>
                          <div className="text-sm text-foreground-secondary">
                            {document.originalFileName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {document.fileType.toUpperCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {formatFileSize(document.fileSize)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(document.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {formatDate(document.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <div data-tooltip-id={`download-list-${document.id}`}>
                          <IconButton
                            Icon={Download}
                            onClick={() => handleDownloadDocument(document)}
                            variant="default"
                            size="md"
                            bordered={false}
                            disabled={downloadMutation.isPending}
                          />
                        </div>
                        <CustomTooltip
                          anchorSelect={`[data-tooltip-id='download-list-${document.id}']`}
                        >
                          Download document
                        </CustomTooltip>

                        <div data-tooltip-id={`delete-list-${document.id}`}>
                          <IconButton
                            Icon={Trash2}
                            onClick={() => handleDeleteDocument(document)}
                            variant="danger"
                            size="md"
                            bordered={false}
                            disabled={deleteMutation.isPending}
                          />
                        </div>
                        <CustomTooltip
                          anchorSelect={`[data-tooltip-id='delete-list-${document.id}']`}
                        >
                          Delete document
                        </CustomTooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md hover:opacity-80 disabled:opacity-50 transition-opacity bg-background-secondary border border-border text-foreground"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md hover:opacity-80 disabled:opacity-50 transition-opacity bg-background-secondary border border-border text-foreground"
              >
                Next
              </button>
            </div>

            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-foreground-secondary">
                  Showing{" "}
                  <span className="font-medium">
                    {(currentPage - 1) * pageSize + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(currentPage * pageSize, total)}
                  </span>{" "}
                  of <span className="font-medium">{total}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity bg-background-secondary border border-border text-foreground-secondary"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page =
                      Math.max(1, Math.min(totalPages - 4, currentPage - 2)) +
                      i;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-medium transition-colors ${
                          page === currentPage
                            ? "z-10 bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-600 dark:text-blue-400"
                            : "hover:opacity-80 bg-background-secondary border border-border text-foreground-secondary"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}

                  <button
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity bg-background-secondary border border-border text-foreground-secondary"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentsPage;
