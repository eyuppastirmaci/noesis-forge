import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";
import { apiClient } from "@/lib/api";
import { ProcessingQueueResponse } from "@/types";
import { getCookieValue } from "@/utils";

export interface UseProcessingQueueResult {
  queueItems: ProcessingQueueResponse["queue_items"];
  totalCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  isEmpty: boolean;
}

export function useProcessingQueue(): UseProcessingQueueResult {
  const { data: session, status } = useSession();
  const [queueItems, setQueueItems] = useState<
    ProcessingQueueResponse["queue_items"]
  >([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  
  const limit = 10; // Fixed limit constant
  const socketRef = useRef<Socket | null>(null);
  
  // Check if user is authenticated
  const isAuthenticated = status === "authenticated" && session?.accessToken;
  const accessToken = getCookieValue('access_token');
  
  // Initialize WebSocket connection
  const initializeSocket = useCallback(() => {
    if (socketRef.current) return;
    
    // Connect to Socket.IO server with auth headers
    const socket = io("http://localhost:8000", {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: {
        token: accessToken
      }
    });

    socket.on("connect", () => {
      setError(null);
      
      // Authenticate with JWT token
      if (accessToken) {
        socket.emit("auth", accessToken);
      }
      
      // Join processing queue room
      socket.emit("join_processing_queue");
    });

    socket.on("auth_error", (error) => {
      setError("WebSocket authentication failed");
    });

    // Listen for real-time processing updates
    socket.on("processing_update", (update) => {
      
      // Update queue items in real-time  
      setQueueItems(prev => {
        const updatedItems = [...prev];
        const itemIndex = updatedItems.findIndex(
          item => item.document_id === update.document_id
        );
        
        if (itemIndex >= 0) {
          // Update existing item's tasks
          const item = { ...updatedItems[itemIndex] }; // Create new object reference
          const taskIndex = item.tasks.findIndex(
            task => task.task_type === update.task_type
          );
          
          if (taskIndex >= 0) {
            // Update existing task with new object reference
            item.tasks = [...item.tasks]; // Create new array reference
            item.tasks[taskIndex] = {
              ...item.tasks[taskIndex],
              status: update.status,
              progress: update.progress !== undefined ? update.progress : item.tasks[taskIndex].progress,
              started_at: update.started_at || item.tasks[taskIndex].started_at,
              completed_at: update.completed_at || item.tasks[taskIndex].completed_at,
              error: update.error || item.tasks[taskIndex].error,
            };
            
            updatedItems[itemIndex] = item; // Use the new item reference
          } else {
            console.log(`Task ${update.task_type} not found for document ${update.document_id}`);
          }
        } else {
          // Optionally refresh the entire queue if document not found
          fetchProcessingQueue(true);
        }
        
        return updatedItems;
      });
    });

    socket.on("disconnect", (reason) => {
      if (reason === "io server disconnect") {
        // Server forcefully disconnected - reconnect
        socket.connect();
      }
    });

    socket.on("connect_error", (error) => {
      console.error("Socket.IO connection error:", error);
      setError("WebSocket connection failed - falling back to polling");
    });

    socketRef.current = socket;
  }, [accessToken]);

  // Fetch initial data via REST API
  const fetchProcessingQueue = useCallback(async (resetData = false) => {
    if (!isAuthenticated || !accessToken) {
      setIsLoading(false);
      setIsLoadingMore(false);
      return;
    }
    
    const currentOffset = resetData ? 0 : offset;
    
    try {
      setError(null);
      if (resetData) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      
      const response = await apiClient.getProcessingQueue(limit, currentOffset);

      if (response.success) {
        const data = response.data as ProcessingQueueResponse;
        
        if (resetData) {
          // Fresh load - replace all data
          setQueueItems(data.queue_items || []);
          setOffset(limit);
        } else {
          // Load more - append to existing data
          setQueueItems(prev => [...prev, ...(data.queue_items || [])]);
          setOffset(prev => prev + limit);
        }
        
        setTotalCount(data.total_count || 0);
        setHasMore(data.pagination?.has_more || false);
      } else {
        setError("Failed to fetch processing queue");
      }
    } catch (err: any) {
      // Handle authentication errors gracefully
      if (err?.response?.status === 401) {
        setError("Please log in to view processing queue");
        setQueueItems([]); // Clear any existing data
        return; // Don't continue trying to fetch
      }
      
      setError(err?.message || "Failed to fetch processing queue");
      console.error("Processing queue fetch error:", err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [offset, limit, isAuthenticated, accessToken]);

  const refresh = useCallback(async () => {
    setOffset(0);
    await fetchProcessingQueue(true);
  }, [fetchProcessingQueue]);

  const loadMore = useCallback(async () => {
    if (!isLoadingMore && hasMore) {
      await fetchProcessingQueue(false);
    }
  }, [fetchProcessingQueue, isLoadingMore, hasMore]);

  useEffect(() => {
    // Only proceed if user is authenticated and we have tokens
    if (!isAuthenticated || !accessToken) {
      setIsLoading(false);
      setError(null);
      setQueueItems([]);
      setTotalCount(0);
      return;
    }

    // Initialize WebSocket and fetch initial data for authenticated user
    initializeSocket();
    fetchProcessingQueue(true);

    // Set up a backup refresh interval (much longer since we have WebSocket)
    const backupRefreshInterval = setInterval(() => {
      // Only refresh if there are pending/processing items or if we have few items
      const hasActiveItems = queueItems.some(item => 
        item.tasks.some(task => 
          task.status === "pending" || task.status === "processing"
        )
      );
      
      if (hasActiveItems || queueItems.length < 5) {
        fetchProcessingQueue(true);
      }
    }, 30000); // 30 seconds backup refresh

    // Cleanup on unmount or auth change
    return () => {
      clearInterval(backupRefreshInterval);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, accessToken, initializeSocket, fetchProcessingQueue]);

  return {
    queueItems,
    totalCount,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    refresh,
    loadMore,
    isEmpty: totalCount === 0,
  };
}

// For specific document processing status
export function useDocumentProcessingStatus(documentId: string | null) {
  const [status, setStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!documentId) {
      setStatus(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.getDocumentProcessingStatus(documentId);

      if (response.success) {
        setStatus(response.data);
      } else {
        setError("Failed to fetch processing status");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to fetch processing status");
      console.error("Processing status fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    status,
    isLoading,
    error,
    refresh: fetchStatus,
  };
}
