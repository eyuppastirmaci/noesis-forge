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

  const getFileIcon = (fileType: DocumentType) => {
    return documentService.getFileTypeIcon(fileType);
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
      ready: "bg-green-100 text-green-800",
      processing: "bg-yellow-100 text-yellow-800",
      failed: "bg-red-100 text-red-800",
      deleted: "bg-gray-100 text-gray-800",
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status]}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading documents...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          Failed to load documents: {getErrorMessage(error)}
        </div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600 mt-1">
            Manage and search through your uploaded documents
          </p>
        </div>
        <Link
          href="/documents/upload"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Upload Document
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-4 space-y-4 lg:space-y-0">
            {/* Search Input */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
              <select
                value={filterType}
                onChange={(e) =>
                  setFilterType(e.target.value as DocumentType | "all")
                }
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="pdf">PDF</option>
                <option value="docx">Word</option>
                <option value="txt">Text</option>
                <option value="xlsx">Excel</option>
                <option value="pptx">PowerPoint</option>
                <option value="other">Other</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as DocumentStatus | "all")
                }
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="ready">Ready</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>

              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Search
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Results Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-sm text-gray-600">
          Showing {documents.length} of {total} documents
        </div>

        <div className="flex items-center space-x-4">
          {/* View Mode Toggle */}
          <div className="flex items-center border border-gray-300 rounded-md">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 ${
                viewMode === "grid" ? "bg-blue-600 text-white" : "text-gray-600"
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 ${
                viewMode === "list" ? "bg-blue-600 text-white" : "text-gray-600"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Page Size Selector */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
      </div>

      {/* Documents Grid/List */}
      {documents.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No documents found
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery
              ? "Try adjusting your search criteria"
              : "Get started by uploading your first document"}
          </p>
          <Link
            href="/documents/upload"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Upload Document
          </Link>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {documents.map((document) => (
            <div
              key={document.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">
                    {getFileIcon(document.fileType)}
                  </span>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleDownloadDocument(document)}
                      disabled={downloadMutation.isPending}
                      className="p-1 text-gray-400 hover:text-blue-600"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteDocument(document)}
                      disabled={deleteMutation.isPending}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
                  {document.title}
                </h3>

                <div className="space-y-2 text-xs text-gray-500">
                  <div>{formatFileSize(document.fileSize)}</div>
                  <div>{formatDate(document.createdAt)}</div>
                  <div className="flex items-center justify-between">
                    {getStatusBadge(document.status)}
                    <div className="flex space-x-2">
                      <span title="Views">👁 {document.viewCount}</span>
                      <span title="Downloads">⬇ {document.downloadCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map((document) => (
                <tr key={document.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">
                        {getFileIcon(document.fileType)}
                      </span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {document.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          {document.originalFileName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {document.fileType.toUpperCase()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatFileSize(document.fileSize)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(document.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(document.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDownloadDocument(document)}
                        disabled={downloadMutation.isPending}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(document)}
                        disabled={deleteMutation.isPending}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
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
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>

          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
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
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page =
                    Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                          : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
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
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
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
  );
};

export default DocumentsPage;
