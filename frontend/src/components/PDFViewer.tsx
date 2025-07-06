"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, X, Save, Plus } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import { documentService } from "@/services/document.service";
import { commentService } from "@/services/comment.service";
import { toast } from "@/utils";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import PDFViewerSkeleton from "@/components/ui/PDFViewerSkeleton";
import {
  CommentPosition,
  CommentResponse,
  CreateCommentRequest,
  COMMENT_QUERY_KEYS,
} from "@/types";
import { formatDate } from "@/utils/dateUtils";

interface PDFViewerProps {
  documentId: string;
  className?: string;
  annotationMode?: boolean;
  onAnnotationCreate?: (position: CommentPosition) => void;
  targetAnnotation?: CommentResponse | null;
  onTargetAnnotationViewed?: () => void;
}

interface AnnotationMarker {
  id: string;
  position: CommentPosition;
  comment: CommentResponse;
  page: number;
  x: number; // Relative to page (0-1)
  y: number; // Relative to page (0-1)
}

interface PDFPage {
  pageNumber: number;
  canvas: HTMLCanvasElement;
  viewport: pdfjsLib.PageViewport;
  offsetTop: number;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  documentId,
  className = "",
  annotationMode = false,
  onAnnotationCreate,
  targetAnnotation,
  onTargetAnnotationViewed,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<PDFPage[]>([]);
  const [annotations, setAnnotations] = useState<AnnotationMarker[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] =
    useState<AnnotationMarker | null>(null);
  const [clickPosition, setClickPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [pendingAnnotationForm, setPendingAnnotationForm] = useState<{
    position: CommentPosition;
    content: string;
  } | null>(null);
  const [annotationFormPosition, setAnnotationFormPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [popupPosition, setPopupPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Fetch existing annotations
  const { data: commentsData } = useQuery({
    queryKey: COMMENT_QUERY_KEYS.DOCUMENT_COMMENTS(documentId),
    queryFn: () =>
      commentService.getDocumentComments(documentId, { page: 1, limit: 100 }),
    staleTime: 30000,
  });

  // Create annotation mutation
  const createAnnotationMutation = useMutation({
    mutationFn: (request: CreateCommentRequest) =>
      commentService.createComment(documentId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: COMMENT_QUERY_KEYS.DOCUMENT_COMMENTS(documentId),
      });
      toast.success("Annotation added successfully!");
      setPendingAnnotationForm(null);
      setIsSubmitting(false);

      if (onTargetAnnotationViewed) {
        onTargetAnnotationViewed();
      }
    },
    onError: (error) => {
      toast.error(`Failed to add annotation: ${error.message}`);
      setIsSubmitting(false);
    },
  });

  // Load PDF with PDF.js
  useEffect(() => {
    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(null);

        const blobUrl = await documentService.getPDFBlobUrl(documentId);
        const pdf = await pdfjsLib.getDocument(blobUrl).promise;

        // Render all pages
        const pdfPages: PDFPage[] = [];
        let currentOffsetTop = 0;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.5 });

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) {
            throw new Error(`Failed to get canvas context for page ${pageNum}`);
          }

          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;

          pdfPages.push({
            pageNumber: pageNum,
            canvas,
            viewport,
            offsetTop: currentOffsetTop,
          });

          currentOffsetTop += viewport.height + 20; // 20px margin between pages
        }

        setPages(pdfPages);
        setLoading(false);

        // Clean up blob URL
        URL.revokeObjectURL(blobUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load PDF");
        setLoading(false);
      }
    };

    loadPDF();
  }, [documentId]);

  // Process annotations from comments
  useEffect(() => {
    if (commentsData?.data?.comments && pages.length > 0) {
      const annotationComments = commentsData.data.comments.filter(
        (comment) => comment.commentType === "annotation" && comment.position
      );

      const markers: AnnotationMarker[] = annotationComments.map((comment) => ({
        id: comment.id,
        position: comment.position!,
        comment,
        page: comment.position?.page || 1,
        x: comment.position?.x || 0,
        y: comment.position?.y || 0,
      }));

      setAnnotations(markers);
    }
  }, [commentsData, pages]);

  // Auto-scroll to target annotation
  useEffect(() => {
    if (
      targetAnnotation &&
      targetAnnotation.position &&
      !loading &&
      pages.length > 0
    ) {
      const targetPage = targetAnnotation.position.page || 1;
      const targetPageData = pages.find((p) => p.pageNumber === targetPage);

      if (
        targetPageData &&
        containerRef.current &&
        targetAnnotation.position.y !== undefined
      ) {
        const scrollTop =
          targetPageData.offsetTop +
          targetAnnotation.position.y * targetPageData.viewport.height;
        containerRef.current.scrollTo({
          top: scrollTop - 200, // Offset to center the annotation
          behavior: "smooth",
        });

        // Find and select the annotation
        const marker = annotations.find((a) => a.id === targetAnnotation.id);
        if (marker) {
          setTimeout(() => {
            setSelectedAnnotation(marker);
          }, 500);
        }

        if (onTargetAnnotationViewed) {
          onTargetAnnotationViewed();
        }
      }
    }
  }, [targetAnnotation, annotations, loading, pages, onTargetAnnotationViewed]);

  // Handle container click for annotation creation
  const handleContainerClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!annotationMode) return;
      if (pendingAnnotationForm) return;
      if (!containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const scrollTop = container.scrollTop;

      const clickXRelative = event.clientX - containerRect.left;
      const clickYRelative = event.clientY - containerRect.top + scrollTop;
      const clickXViewport = event.clientX;
      const clickYViewport = event.clientY;

      // Find which page was clicked
      let targetPage: PDFPage | null = null;
      for (const page of pages) {
        if (
          clickYRelative >= page.offsetTop &&
          clickYRelative <= page.offsetTop + page.viewport.height
        ) {
          targetPage = page;
          break;
        }
      }

      if (!targetPage) return;

      // Calculate relative position within the page
      const pageWidth = targetPage.viewport.width;
      const pageHeight = targetPage.viewport.height;

      // Account for horizontal centering and container padding
      const containerPadding = 16; // p-4
      const pageLeft =
        containerPadding +
        (container.clientWidth - containerPadding * 2 - pageWidth) / 2;
      const relativeX = (clickXRelative - pageLeft) / pageWidth;
      const relativeY = (clickYRelative - targetPage.offsetTop) / pageHeight;

      // Ensure coordinates are within bounds
      const clampedX = Math.max(0, Math.min(1, relativeX));
      const clampedY = Math.max(0, Math.min(1, relativeY));

      // Show visual feedback
      setClickPosition({ x: clickXViewport, y: clickYViewport });

      // Create position object
      const position: CommentPosition = {
        page: targetPage.pageNumber,
        x: clampedX,
        y: clampedY,
      };

      // Store form position for rendering
      setAnnotationFormPosition({ x: clickXViewport, y: clickYViewport });

      // Show form after short delay but keep + icon
      setTimeout(() => {
        setPendingAnnotationForm({ position, content: "" });

        if (onAnnotationCreate) {
          onAnnotationCreate(position);
        }
      }, 300);
    },
    [annotationMode, pendingAnnotationForm, pages, onAnnotationCreate]
  );

  const handleAnnotationClick = useCallback(
    (annotation: AnnotationMarker) => {
      setSelectedAnnotation(annotation);
      // Compute popup position near the annotation icon
      if (!containerRef.current) return;
      const container = containerRef.current;
      const pageData = pages.find((p) => p.pageNumber === annotation.page);
      if (!pageData) return;

      // Calculate position relative to the container
      const containerPadding = 16; // 4 * 4px (p-4)
      const pageLeft =
        containerPadding +
        (container.clientWidth -
          containerPadding * 2 -
          pageData.viewport.width) /
          2;
      const absoluteX = pageLeft + annotation.x * pageData.viewport.width;
      const absoluteY =
        containerPadding +
        pageData.offsetTop +
        annotation.y * pageData.viewport.height;

      setPopupPosition({ x: absoluteX, y: absoluteY });
    },
    [pages]
  );

  // Recompute popup position whenever the selected annotation or scroll state changes
  React.useEffect(() => {
    if (!selectedAnnotation || !containerRef.current) {
      setPopupPosition(null);
      return;
    }

    const container = containerRef.current;
    const pageData = pages.find(
      (p) => p.pageNumber === selectedAnnotation.page
    );
    if (!pageData) return;

    const containerPadding = 16; // 4 * 4px (p-4)
    const pageLeft =
      containerPadding +
      (container.clientWidth - containerPadding * 2 - pageData.viewport.width) /
        2;
    const absoluteX = pageLeft + selectedAnnotation.x * pageData.viewport.width;
    const absoluteY =
      containerPadding +
      pageData.offsetTop +
      selectedAnnotation.y * pageData.viewport.height;

    setPopupPosition({ x: absoluteX, y: absoluteY });
  }, [selectedAnnotation, pages]);

  const handleSaveAnnotation = async () => {
    if (!pendingAnnotationForm || !pendingAnnotationForm.content.trim()) {
      toast.error("Please enter annotation content");
      return;
    }

    setIsSubmitting(true);

    const request: CreateCommentRequest = {
      content: pendingAnnotationForm.content.trim(),
      commentType: "annotation",
      position: pendingAnnotationForm.position,
    };

    createAnnotationMutation.mutate(request);
  };

  // Clear click marker when annotation mutation succeeds
  React.useEffect(() => {
    if (createAnnotationMutation.isSuccess) {
      setClickPosition(null);
    }
  }, [createAnnotationMutation.isSuccess]);

  const handleCancelAnnotation = () => {
    setPendingAnnotationForm(null);
    setAnnotationFormPosition(null);
    setClickPosition(null);
  };

  const handleAnnotationContentChange = (content: string) => {
    if (pendingAnnotationForm) {
      setPendingAnnotationForm({
        ...pendingAnnotationForm,
        content,
      });
    }
  };

  // Configure worker on client
  useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    }
  }, []);

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
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-background border-b border-border">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-foreground">
            PDF Viewer
          </span>
          {annotationMode && (
            <span className="text-xs bg-info-light text-info-dark px-2 py-1 rounded-full">
              Annotation Mode
            </span>
          )}
        </div>
      </div>

      {/* PDF Content */}
      <div
        ref={containerRef}
        className="flex-1 bg-gray-100 dark:bg-gray-800 overflow-auto relative"
        onClick={handleContainerClick}
        style={{ cursor: annotationMode ? "crosshair" : "default" }}
      >
        <div className="p-4 space-y-5">
          {pages.map((page) => (
            <div
              key={page.pageNumber}
              className="relative bg-white shadow-lg mx-auto"
              style={{ width: page.viewport.width }}
            >
              <canvas
                ref={(canvas) => {
                  if (canvas && canvas !== page.canvas) {
                    const context = canvas.getContext("2d");
                    if (context) {
                      canvas.width = page.canvas.width;
                      canvas.height = page.canvas.height;
                      context.drawImage(page.canvas, 0, 0);
                    }
                  }
                }}
                width={page.viewport.width}
                height={page.viewport.height}
                className="w-full h-auto"
              />

              {/* Page-specific annotations */}
              {annotations
                .filter((annotation) => annotation.page === page.pageNumber)
                .map((annotation) => (
                  <div
                    key={annotation.id}
                    className="absolute pointer-events-auto"
                    style={{
                      left: `${annotation.x * 100}%`,
                      top: `${annotation.y * 100}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAnnotationClick(annotation);
                      }}
                      className="w-8 h-8 bg-info text-white rounded-full flex items-center justify-center hover:bg-info-dark transition-colors shadow-lg"
                      title={`Annotation by ${
                        annotation.comment.user.name
                      }: ${annotation.comment.content.substring(0, 50)}...`}
                    >
                      <MessageSquare size={16} />
                    </button>
                  </div>
                ))}
            </div>
          ))}
        </div>

        {/* Click Position Feedback */}
        {clickPosition && (
          <div
            className="fixed pointer-events-none"
            style={{
              left: `${clickPosition.x}px`,
              top: `${clickPosition.y}px`,
              transform: "translate(-50%, -50%)",
              zIndex: 9999,
            }}
          >
            <div className="w-6 h-6 bg-info text-white rounded-full flex items-center justify-center shadow-lg">
              <Plus size={16} />
            </div>
          </div>
        )}

        {/* Annotation Form */}
        {pendingAnnotationForm && annotationFormPosition && (
          <div
            className="fixed pointer-events-auto w-80"
            style={{
              left: `${annotationFormPosition.x}px`,
              top: `${annotationFormPosition.y}px`,
              transform: "translate(-50%, -125%)",
              zIndex: 10000,
            }}
          >
            <div className="bg-background border-2 border-border rounded-xl shadow-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-foreground m-0">
                  Add Annotation
                </h3>
                <button
                  onClick={handleCancelAnnotation}
                  className="text-foreground-secondary hover:text-foreground bg-transparent border-none cursor-pointer p-1 rounded"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <div className="text-xs text-foreground-secondary">
                  Page {pendingAnnotationForm.position.page}, Position:{" "}
                  {Math.round((pendingAnnotationForm.position.x || 0) * 100)}%,
                  {Math.round((pendingAnnotationForm.position.y || 0) * 100)}%
                </div>

                <textarea
                  value={pendingAnnotationForm.content}
                  onChange={(e) => {
                    if (e.target.value.length <= 1000) {
                      handleAnnotationContentChange(e.target.value);
                    }
                  }}
                  placeholder="Write your annotation..."
                  className="w-full p-2 border border-border rounded-md bg-background text-foreground text-sm resize-none outline-none"
                  rows={3}
                  disabled={isSubmitting}
                  autoFocus
                  maxLength={1000}
                />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-foreground-secondary">
                    {pendingAnnotationForm.content.length}/1000 characters
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCancelAnnotation}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 text-sm border border-border rounded-md bg-background text-foreground disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAnnotation}
                      disabled={
                        !pendingAnnotationForm.content.trim() || isSubmitting
                      }
                      className="px-3 py-1.5 text-sm rounded-md text-white flex items-center gap-1 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor:
                          !pendingAnnotationForm.content.trim() || isSubmitting
                            ? "var(--color-gray-400)"
                            : "var(--color-blue)",
                      }}
                    >
                      {isSubmitting ? (
                        <>
                          <LoadingSpinner size="sm" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={14} />
                          Save
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Annotation Detail Popup */}
        {selectedAnnotation && popupPosition && (
          <div
            className="absolute pointer-events-auto"
            style={{
              left: `${popupPosition.x}px`,
              top: `${popupPosition.y}px`,
              transform: "translate(-50%, -125%)",
              zIndex: 1000,
              width: "320px",
            }}
          >
            <div className="bg-background border-2 border-border rounded-xl shadow-2xl p-4">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                }}
              >
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "var(--color-foreground)",
                    margin: 0,
                  }}
                >
                  Annotation
                </h3>
                <button
                  onClick={() => setSelectedAnnotation(null)}
                  style={{
                    color: "var(--color-foreground-secondary)",
                    backgroundColor: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    borderRadius: "4px",
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "var(--color-foreground)",
                    }}
                  >
                    {selectedAnnotation.comment.user.name}
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--color-foreground-secondary)",
                    }}
                  >
                    {formatDate(selectedAnnotation.comment.createdAt)}
                  </span>
                </div>

                <p
                  style={{
                    fontSize: "14px",
                    color: "var(--color-foreground)",
                    margin: 0,
                    lineHeight: "1.4",
                  }}
                >
                  {selectedAnnotation.comment.content}
                </p>

                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--color-foreground-secondary)",
                  }}
                >
                  Page {selectedAnnotation.page} • Position:{" "}
                  {Math.round(selectedAnnotation.x * 100)}%,{" "}
                  {Math.round(selectedAnnotation.y * 100)}%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFViewer;
