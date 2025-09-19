"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  ListOrdered, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  FileText,
  Image,
  Sparkles
} from "lucide-react";
import { useProcessingQueue } from "@/hooks/useProcessingQueue";
import { ProcessingTaskType, ProcessingTaskStatus } from "@/types";
import CustomTooltip from "./CustomTooltip";

interface ProcessingQueueDropdownProps {
  className?: string;
}

export default function ProcessingQueueDropdown({ className = "" }: ProcessingQueueDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 320,
  });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { queueItems, totalCount, isLoading, isLoadingMore, hasMore, error, refresh, loadMore } = useProcessingQueue();

  const updateDropdownPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 320;
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.right + window.scrollX - dropdownWidth,
        width: dropdownWidth,
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = (e: Event) => {
      // Only update position on window/document scroll, not dropdown internal scroll
      if (isOpen && !dropdownRef.current?.contains(e.target as Node)) {
        updateDropdownPosition();
      }
    };

    const handleResize = () => {
      if (isOpen) {
        updateDropdownPosition();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, false);
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, false);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
    }
  }, [isOpen]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const getTaskIcon = (taskType: ProcessingTaskType) => {
    switch (taskType) {
      case ProcessingTaskType.TEXT_EMBEDDING:
        return <FileText className="w-3 h-3" />;
      case ProcessingTaskType.IMAGE_EMBEDDING:
        return <Image className="w-3 h-3" />;
      case ProcessingTaskType.SUMMARIZATION:
        return <Sparkles className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const getTaskLabel = (taskType: ProcessingTaskType) => {
    switch (taskType) {
      case ProcessingTaskType.TEXT_EMBEDDING:
        return "Text Embedding";
      case ProcessingTaskType.IMAGE_EMBEDDING:
        return "Image Embedding";
      case ProcessingTaskType.SUMMARIZATION:
        return "Summarization";
      default:
        return taskType;
    }
  };

  const getStatusIcon = (status: ProcessingTaskStatus) => {
    switch (status) {
      case ProcessingTaskStatus.PENDING:
        return <Clock className="w-3 h-3 text-yellow-500" />;
      case ProcessingTaskStatus.PROCESSING:
        return <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />;
      case ProcessingTaskStatus.COMPLETED:
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case ProcessingTaskStatus.FAILED:
        return <XCircle className="w-3 h-3 text-red-500" />;
      default:
        return <Clock className="w-3 h-3 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: ProcessingTaskStatus) => {
    switch (status) {
      case ProcessingTaskStatus.PENDING:
        return "Waiting...";
      case ProcessingTaskStatus.PROCESSING:
        return "Processing...";
      case ProcessingTaskStatus.COMPLETED:
        return "Completed";
      case ProcessingTaskStatus.FAILED:
        return "Failed";
      default:
        return status;
    }
  };

  // Count only documents that have pending or processing tasks
  const activeItemsCount = queueItems.filter(item => 
    item.tasks.some(task => 
      task.status === ProcessingTaskStatus.PENDING || 
      task.status === ProcessingTaskStatus.PROCESSING
    )
  ).length;

  const hasActiveItems = activeItemsCount > 0;

  const DropdownContent = () => (
    <div
      ref={dropdownRef}
      style={{
        position: "absolute",
        top: dropdownPosition.top + 4,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
        zIndex: 9999,
        maxHeight: '400px', // Limit total dropdown height
      }}
      className="bg-background border border-border rounded-md shadow-lg flex flex-col animate-in fade-in-0 zoom-in-95"
    >
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">Processing Queue</h3>
          <button
            onClick={refresh}
            className="text-xs text-foreground-secondary hover:text-foreground"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Refresh"}
          </button>
        </div>
        {queueItems.length > 0 && (
          <p className="text-xs text-foreground-secondary mt-1">
            {activeItemsCount > 0 ? (
              <>
                {activeItemsCount} document{activeItemsCount === 1 ? '' : 's'} processing
              </>
            ) : (
              "All tasks completed"
            )}
          </p>
        )}
      </div>

      <div 
        className="flex-1 min-h-0 overflow-y-scroll" 
        onScroll={(e) => e.stopPropagation()} // Prevent scroll event bubbling
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--border) transparent',
          overflowY: 'scroll',
          maxHeight: '280px', // Fixed height to force scroll
          minHeight: '200px'   // Minimum height
        }}
      >
        {error && (
          <div className="px-4 py-3 text-center">
            <p className="text-xs text-red-500">{error}</p>
            <button
              onClick={refresh}
              className="text-xs text-blue-500 hover:text-blue-700 mt-1"
            >
              Try again
            </button>
          </div>
        )}

        {!error && queueItems.length === 0 && (
          <div className="px-4 py-6 text-center">
            <ListOrdered className="w-8 h-8 text-foreground-secondary mx-auto mb-2" />
            <p className="text-sm text-foreground-secondary">No processing tasks</p>
            <p className="text-xs text-foreground-secondary/70">
              Documents will appear here when processing
            </p>
          </div>
        )}

        {queueItems.map((item) => (
          <div key={item.document_id} className="border-b border-border last:border-0">
            <div className="px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-6 h-6 rounded bg-background-secondary flex items-center justify-center">
                    <FileText className="w-3 h-3 text-foreground-secondary" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-foreground truncate">
                    {item.document_title}
                  </h4>
                  <p className="text-xs text-foreground-secondary capitalize">
                    {item.document_type} • {new Date(item.created_at).toLocaleTimeString()}
                  </p>
                  
                  <div className="mt-2 space-y-1">
                    {item.tasks.map((task, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {getTaskIcon(task.task_type)}
                          <span className="text-xs text-foreground-secondary">
                            {getTaskLabel(task.task_type)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1 ml-auto">
                          {getStatusIcon(task.status)}
                          <span className="text-xs text-foreground-secondary">
                            {getStatusLabel(task.status)}
                          </span>
                        </div>
                        
                        {task.status === ProcessingTaskStatus.PROCESSING && task.progress > 0 && (
                          <div className="text-xs text-blue-500">
                            {task.progress}%
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {item.tasks.some(task => task.error) && (
                    <div className="mt-1">
                      {item.tasks
                        .filter(task => task.error)
                        .map((task, index) => (
                          <p key={index} className="text-xs text-red-500 truncate">
                            {getTaskLabel(task.task_type)}: {task.error}
                          </p>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More Button - Outside scrollable area */}
      {hasMore && (
        <div className="border-t border-border">
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            className="w-full px-4 py-3 text-sm text-center text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading more...
              </>
            ) : (
              <>
                Load More ({totalCount - queueItems.length} remaining)
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={toggleDropdown}
          className={`icon-button relative ${className}`}
          aria-label="Processing queue"
        >
          <ListOrdered className="icon-button-icon" />
          {hasActiveItems && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-sm text-white font-bold">{activeItemsCount}</span>
            </div>
          )}
        </button>
        <CustomTooltip anchorSelect={`.${className.replace(' ', '.')}`} place="left">
          Processing Queue {totalCount > 0 && `(${totalCount})`}
        </CustomTooltip>
      </div>

      {/* Portal Dropdown */}
      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(<DropdownContent />, document.body)}
    </>
  );
}
