"use client";

import { FC } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Skeleton from "@/components/ui/Skeleton";
import {
  documentQueries,
  documentMutations,
} from "@/services/document.services";
import { favoriteQueries } from "@/services/favorite.service";
import { formatDate, formatFileSize } from "@/utils";
import Button from "@/components/ui/Button";
import LinkButton from "@/components/ui/LinkButton";
import { Document } from "@/types";
import { showErrorToast } from "@/utils/errorHandlingUtils";
import {
  FileText,
  Star,
  Calendar,
  HardDrive,
  Upload,
  Search,
  Folder,
  Clock,
  ArrowRight,
} from "lucide-react";

const SummaryCard: FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  loading: boolean;
}> = ({ title, value, icon, loading }) => (
  <div className="rounded-lg bg-background-secondary border border-border p-5 transition-all duration-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-foreground-secondary uppercase tracking-wide">
          {title}
        </p>
        {loading ? (
          <Skeleton className="mt-2 h-8 w-20 bg-border" />
        ) : (
          <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
        )}
      </div>
      <div className="text-foreground-secondary">{icon}</div>
    </div>
  </div>
);

const DashboardPage: FC = () => {
  // Queries
  const { data: docStats, isLoading: isLoadingDocStats } = useQuery(
    documentQueries.list({ limit: 1 })
  );
  const { data: favStats, isLoading: isLoadingFavStats } = useQuery(
    favoriteQueries.list({ limit: 1 })
  );
  const { data: userStats, isLoading: isLoadingUserStats } = useQuery(
    documentQueries.stats()
  );
  const { data: recentDocsData, isLoading: isLoadingRecentDocs } = useQuery(
    documentQueries.list({ sortBy: "date", sortDir: "desc", limit: 6 })
  );

  const { mutate: downloadDocument } = useMutation({
    mutationFn: documentMutations.download().mutationFn,
    onSuccess: () => {},
    onError: (error: any) => {
      showErrorToast(error);
    },
  });

  const handleDownload = (doc: Document) => {
    downloadDocument({ id: doc.id, originalFileName: doc.originalFileName });
  };

  const totalDocuments = docStats?.total ?? 0;
  const totalFavorites = favStats?.total ?? 0;
  const documentsThisMonth = userStats?.documentsThisMonth ?? 0;
  const totalStorageUsage = userStats?.totalStorageUsage ?? 0;
  const recentDocuments = recentDocsData?.documents ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* Summary Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Total Documents"
            value={totalDocuments}
            icon={<FileText className="h-5 w-5" />}
            loading={isLoadingDocStats}
          />
          <SummaryCard
            title="Favorites"
            value={totalFavorites}
            icon={<Star className="h-5 w-5" />}
            loading={isLoadingFavStats}
          />
          <SummaryCard
            title="This Month"
            value={documentsThisMonth}
            icon={<Calendar className="h-5 w-5" />}
            loading={isLoadingUserStats}
          />
          <SummaryCard
            title="Storage Used"
            value={formatFileSize(totalStorageUsage)}
            icon={<HardDrive className="h-5 w-5" />}
            loading={isLoadingUserStats}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Recent Documents */}
          <div className="lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-medium text-foreground">
                  Recent Documents
                </h2>
                <Clock className="h-4 w-4 text-gray-600" />
              </div>
              <p className="text-xs text-foreground-secondary">
                Your latest uploaded documents
              </p>
            </div>

            <div className="rounded-lg bg-background-secondary border border-border">
              {isLoadingRecentDocs ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton
                      key={i}
                      className="h-14 w-full rounded bg-border"
                    />
                  ))}
                </div>
              ) : recentDocuments.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="mx-auto h-10 w-10 text-gray-700" />
                  <p className="mt-2 text-sm text-foreground-secondary">
                    No documents uploaded yet
                  </p>
                </div>
              ) : (
                <>
                  {recentDocuments.map((doc, index) => (
                    <div
                      key={doc.id}
                      className={`group flex items-center justify-between px-4 py-3 transition-colors hover:bg-border/20 ${
                        index !== recentDocuments.length - 1
                          ? "border-b border-border"
                          : ""
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-foreground truncate">
                          {doc.title}
                        </h3>
                        <div className="mt-1 flex items-center space-x-3 text-xs text-foreground-secondary">
                          <span>{formatDate(doc.createdAt)}</span>
                          <span>•</span>
                          <span>{formatFileSize(doc.fileSize)}</span>
                        </div>
                      </div>
                      <div className="ml-4 flex items-center space-x-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <LinkButton
                          href={`/documents/${doc.id}`}
                          variant="ghost"
                          size="sm"
                          className="px-2 py-1"
                        >
                          View
                        </LinkButton>
                        <Button
                          onClick={() => handleDownload(doc)}
                          variant="ghost"
                          size="sm"
                          className="px-2 py-1"
                        >
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-border p-3">
                    <LinkButton
                      href="/documents"
                      variant="ghost"
                      className="flex w-full items-center justify-center space-x-1"
                    >
                      <span>View All Documents</span>
                      <ArrowRight className="h-3 w-3" />
                    </LinkButton>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <div className="mb-3">
              <h2 className="text-lg font-medium text-foreground">
                Quick Actions
              </h2>
              <p className="text-xs text-foreground-secondary">
                Common tasks and shortcuts
              </p>
            </div>

            <div className="space-y-2">
              <LinkButton
                href="/documents/upload"
                variant="primary"
                className="flex w-full items-center space-x-3 px-4 py-3"
              >
                <Upload className="h-4 w-4" />
                <span className="text-sm font-medium">Upload New Document</span>
              </LinkButton>

              <LinkButton
                href="/documents"
                variant="secondary"
                className="flex w-full items-center space-x-3 px-4 py-3"
              >
                <Search className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Search Documents</span>
              </LinkButton>

              <LinkButton
                href="/documents/favorites"
                variant="secondary"
                className="flex w-full items-center space-x-3 px-4 py-3"
              >
                <Star className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">My Favorites</span>
              </LinkButton>

              <LinkButton
                href="/documents"
                variant="secondary"
                className="flex w-full items-center space-x-3 px-4 py-3"
              >
                <Folder className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">All Documents</span>
              </LinkButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
