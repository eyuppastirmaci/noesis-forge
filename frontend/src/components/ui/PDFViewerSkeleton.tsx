"use client";

import React from "react";

const PDFViewerSkeleton: React.FC = () => {
  return (
    <div className="h-full flex flex-col animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between p-3 bg-background border-b border-border">
        <div className="flex items-center space-x-2">
          <div className="h-4 w-20 bg-gray-300 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="h-4 w-24 bg-gray-300 dark:bg-gray-700 rounded"></div>
      </div>

      {/* PDF Content Skeleton */}
      <div className="flex-1 bg-gray-100 dark:bg-gray-800 p-4 relative overflow-hidden">
        <div className="flex justify-center h-full">
          <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-lg shadow-lg relative overflow-hidden">
            {/* Shimmer overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 dark:via-gray-700/30 to-transparent animate-shimmer bg-[length:200%_100%]"></div>
            
            {/* PDF Page Skeleton */}
            <div className="p-8 space-y-4">
              {/* Title area */}
              <div className="text-center space-y-2">
                <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>
              </div>
              
              {/* Content lines */}
              <div className="space-y-3 mt-8">
                <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-5/6"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-4/5"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
              </div>
              
              {/* Paragraph break */}
              <div className="py-2"></div>
              
              {/* More content lines */}
              <div className="space-y-3">
                <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-4/5"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-5/6"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
              </div>
              
              {/* Image placeholder */}
              <div className="mt-6">
                <div className="h-32 bg-gray-300 dark:bg-gray-700 rounded w-2/3 mx-auto"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mx-auto mt-2"></div>
              </div>
              
              {/* More content */}
              <div className="space-y-3 mt-6">
                <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-5/6"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-4/5"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFViewerSkeleton; 