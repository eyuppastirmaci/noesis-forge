"use client";

import React, { useState, useEffect } from "react";
import PDFViewerSkeleton from "@/components/ui/PDFViewerSkeleton";
import { documentService } from "@/services/document.services";

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
  
  // Fetch PDF with authentication and create blob URL
  useEffect(() => {
    const fetchPDF = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const blobUrl = await documentService.getPDFBlobUrl(documentId);
        setPdfBlobUrl(blobUrl);
        setLoading(false);

      } catch (err) {
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
  }, [documentId]);

  if (loading) {
    return <PDFViewerSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="text-center mb-4">
          <p className="text-red-600 dark:text-red-400 mb-2">{error}</p>
          <p className="text-sm text-foreground-secondary mb-4">
            PDF viewer failed to load.
          </p>
        </div>
      </div>
    );
  }

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
          />
        ) : (
          <PDFViewerSkeleton />
        )}
      </div>
    </div>
  );
};

export default PDFViewer; 