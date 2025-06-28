"use client";

import React, { useState, useEffect } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import PDFViewerSkeleton from "@/components/ui/PDFViewerSkeleton";
import { API_CONFIG } from "@/config/api";
import { DOCUMENT_ENDPOINTS } from "@/types";
import { getCookieValue } from '@/utils/cookieUtils';

interface PDFViewerProps {
  documentId: string;
  documentTitle: string;
  className?: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ 
  documentId, 
  documentTitle, 
  className = "" 
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  const pdfUrl = `${API_CONFIG.BASE_URL}${DOCUMENT_ENDPOINTS.DOWNLOAD(documentId)}`;
  
  // Fetch PDF with authentication and create blob URL
  useEffect(() => {
    const fetchPDF = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = getCookieValue('access_token');
        console.log("Fetching PDF with auth token:", !!token);
        
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(pdfUrl, {
          method: 'GET',
          headers,
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        setPdfBlobUrl(blobUrl);
        setLoading(false);
        console.log("PDF blob created successfully");

      } catch (err) {
        console.error("Failed to fetch PDF:", err);
        setError(err instanceof Error ? err.message : "Failed to load PDF");
        setLoading(false);
      }
    };

    fetchPDF();

    // Cleanup blob URL on unmount
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [documentId, pdfUrl]);

  useEffect(() => {
    console.log("PDFViewer mounted for document:", documentId);
    console.log("PDF URL:", pdfUrl);
  }, [documentId, pdfUrl]);

  if (loading) {
    return <PDFViewerSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="text-center mb-4">
          <p className="text-red-600 dark:text-red-400 mb-2">{error}</p>
          <p className="text-sm text-foreground-secondary mb-4">
            PDF viewer failed to load. Trying alternative view...
          </p>
        </div>
        
        {/* Fallback: Simple iframe viewer */}
        <div className="w-full h-full border border-border rounded">
          <iframe
            src={`${pdfUrl}#view=FitH`}
            className="w-full h-full"
            title={documentTitle}
            frameBorder="0"
          />
        </div>
      </div>
    );
  }

  // Use iframe approach for better authentication support
  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Simple header */}
      <div className="flex items-center justify-between p-3 bg-background border-b border-border">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-foreground">
            PDF Viewer
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {pdfBlobUrl && (
            <a 
              href={pdfBlobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Open in New Tab
            </a>
          )}
        </div>
      </div>

      {/* PDF iframe with blob URL */}
      <div className="flex-1 bg-gray-100 dark:bg-gray-800 overflow-hidden">
        {pdfBlobUrl ? (
          <iframe
            src={pdfBlobUrl}
            className="w-full h-full border-0"
            title={documentTitle}
            onLoad={() => {
              console.log("PDF iframe loaded successfully");
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <LoadingSpinner />
              <p className="mt-2 text-sm text-foreground-secondary">
                Preparing PDF...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFViewer; 