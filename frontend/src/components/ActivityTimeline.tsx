'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { activityService } from '@/services/activity.service';
import type { 
  ActivityResponse, 
  ActivityType, 
  ActivityListRequest
} from '@/types/activity';
import { formatRelativeTime } from '@/utils/dateUtils';
import { cn } from '@/lib/cn';
import LoadingSpinner from './ui/LoadingSpinner';
import Button from './ui/Button';
import Input from './ui/Input';
import Badge from './ui/Badge';
import Card from './ui/Card';
import { Select } from './ui/Select';
import { 
  Upload, 
  Eye, 
  Download, 
  Edit, 
  Trash2, 
  Share2, 
  MessageCircle, 
  Heart, 
  FolderOpen, 
  Tag, 
  Shield, 
  CheckCircle,
  XCircle,
  BarChart3
} from 'lucide-react';

interface ActivityTimelineProps {
  documentId: string;
  className?: string;
  maxHeight?: string;
  showStats?: boolean;
  showFilters?: boolean;
  limit?: number;
}

interface ActivityItemProps {
  activity: ActivityResponse;
  isFirst: boolean;
  isLast: boolean;
}

// Activity type colors and icons
const getActivityStyle = (type: ActivityType) => {
  const styles: Record<ActivityType, { color: string; icon: React.ComponentType<{ size?: number; className?: string }>; bgColor: string; textColor: string }> = {
    upload: { color: 'bg-blue-500', icon: Upload, bgColor: 'bg-blue-50', textColor: 'text-blue-700' },
    view: { color: 'bg-green-500', icon: Eye, bgColor: 'bg-green-50', textColor: 'text-green-700' },
    download: { color: 'bg-indigo-500', icon: Download, bgColor: 'bg-indigo-50', textColor: 'text-indigo-700' },
    update: { color: 'bg-orange-500', icon: Edit, bgColor: 'bg-orange-50', textColor: 'text-orange-700' },
    delete: { color: 'bg-red-500', icon: Trash2, bgColor: 'bg-red-50', textColor: 'text-red-700' },
    share: { color: 'bg-purple-500', icon: Share2, bgColor: 'bg-purple-50', textColor: 'text-purple-700' },
    unshare: { color: 'bg-gray-500', icon: Share2, bgColor: 'bg-gray-50', textColor: 'text-gray-700' },
    comment: { color: 'bg-yellow-500', icon: MessageCircle, bgColor: 'bg-yellow-50', textColor: 'text-yellow-700' },
    edit_comment: { color: 'bg-yellow-600', icon: Edit, bgColor: 'bg-yellow-50', textColor: 'text-yellow-700' },
    delete_comment: { color: 'bg-red-400', icon: Trash2, bgColor: 'bg-red-50', textColor: 'text-red-600' },
    resolve_comment: { color: 'bg-green-400', icon: CheckCircle, bgColor: 'bg-green-50', textColor: 'text-green-600' },
    unresolve_comment: { color: 'bg-gray-400', icon: XCircle, bgColor: 'bg-gray-50', textColor: 'text-gray-600' },
    favorite: { color: 'bg-pink-500', icon: Heart, bgColor: 'bg-pink-50', textColor: 'text-pink-700' },
    unfavorite: { color: 'bg-gray-400', icon: Heart, bgColor: 'bg-gray-50', textColor: 'text-gray-600' },
    preview: { color: 'bg-blue-400', icon: Eye, bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
    rename: { color: 'bg-cyan-500', icon: Edit, bgColor: 'bg-cyan-50', textColor: 'text-cyan-700' },
    move: { color: 'bg-teal-500', icon: FolderOpen, bgColor: 'bg-teal-50', textColor: 'text-teal-700' },
    tag_update: { color: 'bg-indigo-400', icon: Tag, bgColor: 'bg-indigo-50', textColor: 'text-indigo-600' },
    permission_change: { color: 'bg-orange-400', icon: Shield, bgColor: 'bg-orange-50', textColor: 'text-orange-600' },
  };
  
  return styles[type] || styles.view;
};

// Activity description formatter
const formatActivityDescription = (activity: ActivityResponse): string => {
  const user = activity.user.name || activity.user.username;
  
  switch (activity.activityType) {
    case 'upload':
      return `${user} uploaded the document`;
    case 'view':
      return `${user} viewed the document`;
    case 'download':
      return `${user} downloaded the document`;
    case 'update':
      return `${user} updated the document`;
    case 'delete':
      return `${user} deleted the document`;
    case 'share':
      return `${user} shared the document`;
    case 'unshare':
      return `${user} unshared the document`;
    case 'comment':
      return `${user} added a comment`;
    case 'edit_comment':
      return `${user} edited a comment`;
    case 'delete_comment':
      return `${user} deleted a comment`;
    case 'resolve_comment':
      return `${user} resolved a comment`;
    case 'unresolve_comment':
      return `${user} unresolved a comment`;
    case 'favorite':
      return `${user} favorited the document`;
    case 'unfavorite':
      return `${user} unfavorited the document`;
    case 'preview':
      return `${user} previewed the document`;
    case 'rename':
      return `${user} renamed the document`;
    case 'move':
      return `${user} moved the document`;
    case 'tag_update':
      return `${user} updated tags`;
    case 'permission_change':
      return `${user} changed permissions`;
    default:
      return activity.description || `${user} performed an action`;
  }
};

// Single activity item component
const ActivityItem: React.FC<ActivityItemProps> = ({ activity, isFirst, isLast }) => {
  const style = getActivityStyle(activity.activityType);
  const description = formatActivityDescription(activity);
  
  return (
    <div className="relative flex items-start space-x-3 pb-4">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-4 top-8 h-full w-0.5 bg-gray-200 dark:bg-gray-700" />
      )}
      
      {/* Activity icon */}
      <div className={cn(
        "relative flex h-8 w-8 items-center justify-center rounded-full text-white text-sm",
        style.color
      )}>
        <style.icon size={14} />
        {activity.isImportant && (
          <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-800" />
        )}
      </div>
      
      {/* Activity content */}
      <div className="flex-1 min-w-0">
        <div className={cn(
          "rounded-lg p-3 border transition-colors",
          style.bgColor,
          "border-gray-200 dark:border-gray-700 dark:bg-opacity-10"
        )}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className={cn("text-sm font-medium", style.textColor)}>
                {description}
              </p>
              
              {/* Activity metadata */}
              {activity.metadata && (
                <div className="mt-2 space-y-1">
                  {activity.metadata.commentContent && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                      "{activity.metadata.commentContent}"
                    </p>
                  )}
                  {activity.metadata.fileSize && (
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Size: {activity.metadata.fileSize}
                    </p>
                  )}
                  {activity.ipAddress && (
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      IP: {activity.ipAddress}
                    </p>
                  )}
                </div>
              )}
            </div>
            
            <div className="ml-2 flex items-center space-x-2">
              <div 
                title={new Date(activity.createdAt).toLocaleString()}
                className="inline-flex"
              >
                <Badge color="gray" size="sm">
                  {formatRelativeTime(activity.createdAt)}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main ActivityTimeline component
export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  documentId,
  className,
  maxHeight = '500px',
  showStats = true,
  showFilters = true,
  limit = 20
}) => {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ActivityListRequest>({
    page: 1,
    limit,
  });

  // Activity types for filtering
  const activityTypes = [
    { value: '', label: 'All Activities', icon: <BarChart3 size={16} /> },
    { value: 'upload', label: 'Upload', icon: <Upload size={16} /> },
    { value: 'view', label: 'View', icon: <Eye size={16} /> },
    { value: 'download', label: 'Download', icon: <Download size={16} /> },
    { value: 'update', label: 'Update', icon: <Edit size={16} /> },
    { value: 'comment', label: 'Comment', icon: <MessageCircle size={16} /> },
    { value: 'share', label: 'Share', icon: <Share2 size={16} /> },
    { value: 'favorite', label: 'Favorite', icon: <Heart size={16} /> },
  ];

  // Fetch activities
  const {
    data: activitiesData,
    isLoading: activitiesLoading,
    error: activitiesError,
    refetch: refetchActivities
  } = useQuery({
    queryKey: ['document-activities', documentId, page, filters, limit],
    queryFn: async () => {
      const response = await activityService.getDocumentActivities(documentId, { page, limit, ...filters });
      return response.data;
    },
    enabled: !!documentId,
  });

  // Fetch activity stats
  const {
    data: statsData,
    isLoading: statsLoading
  } = useQuery({
    queryKey: ['activity-stats', documentId],
    queryFn: async () => {
      const response = await activityService.getActivityStats(documentId);
      return response.data;
    },
    enabled: !!documentId && showStats,
  });

  // Handle filter changes
  const handleFilterChange = (key: keyof ActivityListRequest, value: any) => {
    setFilters((prev: ActivityListRequest) => ({
      ...prev,
      [key]: value || undefined
    }));
    setPage(1); // Reset to first page when filters change
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      page: 1,
      limit,
    });
    setPage(1);
  };

  // Check if any filters are applied
  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(value => value !== undefined && value !== '' && value !== 1 && value !== limit);
  }, [filters, limit]);

  if (activitiesError) {
    return (
      <Card className={className}>
        <div className="p-6 text-center">
          <p className="text-red-600 dark:text-red-400">
            Failed to load activities. Please try again.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetchActivities()}
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Activity Timeline
            </h3>
            {statsData && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {statsData.totalActivities} total activities
              </p>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-gray-500 hover:text-gray-700"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        {showStats && statsData && !statsLoading && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {statsData.todayActivities}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Today</div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {statsData.thisWeekActivities}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">This Week</div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {statsData.totalActivities}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
              </div>
            </Card>
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Select
              options={activityTypes}
              value={filters.activityType || ''}
              onChange={(value) => handleFilterChange('activityType', value)}
              placeholder="Select activity type"
              aria-label="Filter by activity type"
            />
            
            <Input
              type="date"
              value={filters.fromDate || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange('fromDate', e.target.value)}
              placeholder="From date"
            />
            
            <Input
              type="date"
              value={filters.toDate || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange('toDate', e.target.value)}
              placeholder="To date"
            />
          </div>
        )}

        {/* Activities List */}
        <div 
          className="overflow-y-auto"
          style={{ maxHeight }}
        >
          {activitiesLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : activitiesData?.activities.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 dark:text-gray-600 mb-2">
                <BarChart3 size={48} className="mx-auto" />
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                {hasActiveFilters ? 'No activities match your filters' : 'No activities yet'}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="mt-2"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-0">
              {activitiesData?.activities.map((activity, index) => (
                <ActivityItem
                  key={activity.id}
                  activity={activity}
                  isFirst={index === 0}
                  isLast={index === (activitiesData.activities.length - 1)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {activitiesData && activitiesData.total > limit && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, activitiesData.total)} of {activitiesData.total} activities
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || activitiesLoading}
              >
                Previous
              </Button>
              
              <span className="text-sm text-gray-600 dark:text-gray-400 px-2">
                Page {page}
              </span>
              
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={!activitiesData.hasNext || activitiesLoading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ActivityTimeline; 