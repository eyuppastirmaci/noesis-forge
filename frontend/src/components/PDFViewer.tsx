"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  X,
  Plus,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import { documentService } from "@/services/document.service";
import { commentService } from "@/services/comment.service";
import { toast } from "@/utils";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import PDFViewerSkeleton from "@/components/ui/PDFViewerSkeleton";
import AnnotationForm from "@/components/AnnotationForm";
import IconButton from "@/components/ui/IconButton";
import CustomTooltip from "@/components/ui/CustomTooltip";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
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
  onAnnotationAdded?: () => void;
}

interface AnnotationMarker {
  id: string;
  position: CommentPosition;
  comment: CommentResponse;
  page: number;
  x: number;
  y: number;
}

interface PDFPage {
  pageNumber: number;
  viewport: pdfjsLib.PageViewport;
  offsetTop: number;
  canvas?: HTMLCanvasElement;
  textLayer?: HTMLDivElement;
}

// Single Page Renderer Component
const PDFPageItem: React.FC<{
  pdfPage: pdfjsLib.PDFPageProxy;
  viewport: pdfjsLib.PageViewport;
  onRender: (canvas: HTMLCanvasElement, textLayer?: HTMLDivElement) => void;
}> = React.memo(({ pdfPage, viewport, onRender }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const renderTask = useRef<pdfjsLib.RenderTask | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const textLayerDiv = textLayerRef.current;
    if (!canvas || !textLayerDiv) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    // Ensure previous render is cancelled before starting a new one.
    if (renderTask.current) {
      renderTask.current.cancel();
    }
    
    // Clear previous content to avoid artifacts
    context.clearRect(0, 0, canvas.width, canvas.height);
    textLayerDiv.innerHTML = '';

    // Setup canvas for high-DPI
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = viewport.width * devicePixelRatio;
    canvas.height = viewport.height * devicePixelRatio;
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    context.scale(devicePixelRatio, devicePixelRatio);

    renderTask.current = pdfPage.render({ canvasContext: context, viewport });

    renderTask.current.promise
      .then(async () => {
        if (!textLayerRef.current) return;
        try {
          const textContent = await pdfPage.getTextContent();
          textContent.items.forEach((item: any) => {
            if (!item.str || !item.str.trim()) return;
            const span = document.createElement("span");
            span.textContent = item.str;
            span.style.position = "absolute";
            span.style.whiteSpace = "pre";
            span.style.color = "transparent";
            span.style.userSelect = "text";
            span.style.pointerEvents = "auto";
            span.style.cursor = "text";

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
            const [a, , , d, e, f] = tx;
            const fontHeight = Math.abs(d);
            span.style.fontSize = `${fontHeight}px`;
            span.style.left = `${e}px`;
            span.style.top = `${f - fontHeight}px`;
            span.style.transformOrigin = "0 0";
            span.style.transform = `scaleX(${a / fontHeight})`;

            textLayerRef.current!.appendChild(span);
          });
          onRender(canvas, textLayerRef.current);
        } catch (err) {
          console.warn(`Failed to render text layer for page ${pdfPage.pageNumber}`, err);
          onRender(canvas, undefined);
        }
      })
      .catch((error) => {
        // A rendering cancelled exception is expected, so we can ignore it.
        if (error.name !== 'RenderingCancelledException') {
          console.error("PDF page rendering error:", error);
        }
      });
      
    return () => {
      if (renderTask.current) {
        renderTask.current.cancel();
      }
    };
  }, [pdfPage, viewport, onRender]);

  return (
    <>
      <canvas ref={canvasRef} />
      <div ref={textLayerRef} className="textLayer" />
      <div className="absolute inset-0 flex items-center justify-center -z-10">
        <LoadingSpinner />
      </div>
    </>
  );
});

PDFPageItem.displayName = "PDFPageItem";

const PDFViewer: React.FC<PDFViewerProps> = ({
  documentId,
  className = "",
  annotationMode = false,
  onAnnotationCreate,
  targetAnnotation,
  onTargetAnnotationViewed,
  onAnnotationAdded,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pageLayouts, setPageLayouts] = useState<
    {
      pageNumber: number;
      offsetTop: number;
      viewport: pdfjsLib.PageViewport;
    }[]
  >([]);
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());
  const [annotations, setAnnotations] = useState<AnnotationMarker[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] =
    useState<AnnotationMarker | null>(null);
  const [clickPosition, setClickPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [annotationFormTarget, setAnnotationFormTarget] = useState<{
    position: CommentPosition;
    formPosition: { x: number; y: number };
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmAnnotation, setDeleteConfirmAnnotation] = useState<AnnotationMarker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const [popupPosition, setPopupPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [scale, setScale] = useState(1.5);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Calculate position for the annotation detail popup
  const selectedAnnotationPosition = useMemo(() => {
    if (!selectedAnnotation || !containerRef.current || pageLayouts.length === 0)
      return null;

    const layout = pageLayouts.find(
      (p) => p.pageNumber === selectedAnnotation.page
    );
    if (!layout) return null;

    const container = containerRef.current;

    // Horizontal position, accounting for page centering
    const containerPadding = 16; // p-4
    const pageX =
      containerPadding +
      (container.clientWidth - containerPadding * 2 - layout.viewport.width) / 2;
    const annotationX = pageX + layout.viewport.width * selectedAnnotation.x;

    // Vertical position, relative to the scrollable container
    const annotationY =
      layout.offsetTop + layout.viewport.height * selectedAnnotation.y;

    return {
      left: annotationX,
      top: annotationY,
    };
  }, [selectedAnnotation, pageLayouts]);

  // Fetch annotations (comments)
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
      setAnnotationFormTarget(null);
      setClickPosition(null);
      setIsSubmitting(false);
      if (onTargetAnnotationViewed) {
        onTargetAnnotationViewed();
      }
      if (onAnnotationAdded) {
        onAnnotationAdded();
      }
    },
    onError: (error) => {
      toast.error(`Failed to add annotation: ${error.message}`);
      setIsSubmitting(false);
    },
  });

  // Delete annotation mutation
  const deleteAnnotationMutation = useMutation({
    mutationFn: (commentId: string) => commentService.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: COMMENT_QUERY_KEYS.DOCUMENT_COMMENTS(documentId),
      });
      toast.success("Annotation deleted successfully!");
      setDeleteConfirmAnnotation(null); // Only close the confirmation modal
      setSelectedAnnotation(null); // Only close the annotation popup
      // PDF Viewer modal stays open - no setShowPDFViewer(false) call
    },
    onError: (error) => {
      toast.error(`Failed to delete annotation: ${error.message}`);
    },
  });

  const queryClient = useQueryClient();

  // Load document and calculate layout
  useEffect(() => {
    const loadDocument = async () => {
      try {
        setLoading(true);
        const blobUrl = await documentService.getPDFBlobUrl(documentId);
        const pdf = await pdfjsLib.getDocument(blobUrl).promise;
        if (pdf) {
          pdfRef.current = pdf;
          setTotalPages(pdf.numPages);
        } else {
          throw new Error("Failed to load PDF document.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load PDF");
        setLoading(false);
      }
    };
    loadDocument();
  }, [documentId]);

  // Calculate page layouts when pdf or scale changes
  useEffect(() => {
    if (!pdfRef.current) return;
    const calculateLayout = async () => {
      const pdf = pdfRef.current;
      if (!pdf) return;
      const layouts: {
        pageNumber: number;
        offsetTop: number;
        viewport: pdfjsLib.PageViewport;
      }[] = [];
      let currentOffsetTop = 16; // Start with the p-4 top padding
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        layouts.push({
          pageNumber: pageNum,
          offsetTop: currentOffsetTop,
          viewport,
        });
        currentOffsetTop += viewport.height + 20; // 20px margin
      }
      setPageLayouts(layouts);
      setLoading(false);
    };
    calculateLayout();
  }, [scale, totalPages]);

  // Intersection Observer for lazy loading pages
  useEffect(() => {
    if (pageLayouts.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageNum = Number(entry.target.getAttribute("data-page-number"));
            setRenderedPages((prev) => new Set(prev).add(pageNum));
            observer.unobserve(entry.target);
          }
        });
      },
      {
        root: containerRef.current,
        rootMargin: "500px",
      }
    );

    pageRefs.current.forEach((ref) => observer.observe(ref));

    return () => observer.disconnect();
  }, [pageLayouts]);

  // Process annotations from comments
  useEffect(() => {
    if (commentsData?.data?.comments && pageLayouts.length > 0) {
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
  }, [commentsData, pageLayouts]);

  const handleContainerClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!annotationMode || annotationFormTarget || !containerRef.current)
        return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const scrollTop = container.scrollTop;
      const clickXViewport = event.clientX;
      const clickYViewport = event.clientY;
      const clickYRelative = clickYViewport - containerRect.top + scrollTop;

      let targetPageLayout = null;
      for (const layout of pageLayouts) {
        if (
          clickYRelative >= layout.offsetTop &&
          clickYRelative <= layout.offsetTop + layout.viewport.height
        ) {
          targetPageLayout = layout;
          break;
        }
      }
      if (!targetPageLayout) return;

      const containerPadding = 16;
      const pageLeft =
        containerPadding +
        (container.clientWidth -
          containerPadding * 2 -
          targetPageLayout.viewport.width) /
          2;
      const relativeX =
        (event.clientX - containerRect.left - pageLeft) /
        targetPageLayout.viewport.width;
      const relativeY =
        (clickYRelative - targetPageLayout.offsetTop) /
        targetPageLayout.viewport.height;

      const position: CommentPosition = {
        page: targetPageLayout.pageNumber,
        x: Math.max(0, Math.min(1, relativeX)),
        y: Math.max(0, Math.min(1, relativeY)),
      };

      setClickPosition({ x: clickXViewport, y: clickYViewport });
      setAnnotationFormTarget({
        position,
        formPosition: { x: clickXViewport, y: clickYViewport },
      });

      if (onAnnotationCreate) {
        onAnnotationCreate(position);
      }
    },
    [annotationMode, annotationFormTarget, pageLayouts, onAnnotationCreate]
  );

  const handleAnnotationClick = useCallback(
    (annotation: AnnotationMarker) => {
      setSelectedAnnotation(annotation);
    },
    []
  );

  // Track current page based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current || pageLayouts.length === 0) return;
      const container = containerRef.current;
      const scrollCenter = container.scrollTop + container.clientHeight / 2;
      for (const layout of pageLayouts) {
        if (
          scrollCenter >= layout.offsetTop &&
          scrollCenter <= layout.offsetTop + layout.viewport.height
        ) {
          setCurrentPage(layout.pageNumber);
          break;
        }
      }
    };
    const container = containerRef.current;
    container?.addEventListener("scroll", handleScroll, { passive: true });
    return () => container?.removeEventListener("scroll", handleScroll);
  }, [pageLayouts]);

  const handleZoomIn = useCallback(() => {
    setScale((s) => Math.min(s * 1.2, 3.0));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((s) => Math.max(s / 1.2, 0.5));
  }, []);

  const handleZoomReset = useCallback(() => setScale(1.5), []);

  const handlePageNavigation = useCallback(
    (pageNum: number) => {
      const layout = pageLayouts.find((p) => p.pageNumber === pageNum);
      if (layout && containerRef.current) {
        containerRef.current.scrollTo({
          top: layout.offsetTop,
          behavior: "smooth",
        });
      }
    },
    [pageLayouts]
  );

  const handleSaveAnnotation = async (content: string) => {
    if (!annotationFormTarget) return;
    setIsSubmitting(true);
    createAnnotationMutation.mutate({
      content,
      commentType: "annotation",
      position: annotationFormTarget.position,
    });
  };

  const handleCancelAnnotation = () => {
    setAnnotationFormTarget(null);
    setClickPosition(null);
  };

  const handleDeleteAnnotation = (annotation: AnnotationMarker) => {
    setDeleteConfirmAnnotation(annotation);
  };

  const handleConfirmDeleteAnnotation = () => {
    if (deleteConfirmAnnotation) {
      deleteAnnotationMutation.mutate(deleteConfirmAnnotation.id);
    }
  };

  const handleCancelDeleteAnnotation = () => {
    setDeleteConfirmAnnotation(null);
  };

  // When a targetAnnotation is provided from parent, scroll to it and show popup
  useEffect(() => {
    if (!targetAnnotation) return;
    if (!containerRef.current) return;
    if (annotations.length === 0 || pageLayouts.length === 0) return;

    const marker = annotations.find((a) => a.id === targetAnnotation.id);
    if (!marker) return;

    // Set selected annotation to open popup
    setSelectedAnnotation(marker);

    // Scroll smoothly to the page containing the annotation
    const layout = pageLayouts.find((p) => p.pageNumber === marker.page);
    if (layout) {
      const container = containerRef.current;
      const targetY = layout.offsetTop + layout.viewport.height * marker.y;
      // Place the marker ≈30% below the top to ensure popup visibility
      const desiredScrollTop = Math.max(
        0,
        targetY - container.clientHeight * 0.3
      );
      container.scrollTo({
        top: desiredScrollTop,
        behavior: "smooth",
      });
    }

    // Notify parent that annotation has been viewed so it can clear state
    if (onTargetAnnotationViewed) {
      onTargetAnnotationViewed();
    }
  }, [targetAnnotation, annotations, pageLayouts, onTargetAnnotationViewed]);

  const pdfPageProxies = useMemo(() => {
    if (!pdfRef.current) return new Map();
    const map = new Map<number, pdfjsLib.PDFPageProxy>();
    for (let i = 1; i <= pdfRef.current.numPages; i++) {
      pdfRef.current.getPage(i).then(page => {
        map.set(i, page)
      })
    }
    return map;
  }, [totalPages]);

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
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <p className="text-red-500 mb-2">{error}</p>
        <p className="text-sm text-foreground-secondary">
          PDF viewer failed to load.
        </p>
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
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              Annotation Mode
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <div id="pdf-prev-page">
            <IconButton
              Icon={ChevronLeft}
              onClick={() => handlePageNavigation(currentPage - 1)}
              disabled={currentPage <= 1}
              size="sm"
            />
          </div>
          <CustomTooltip anchorSelect="#pdf-prev-page" place="bottom">
            Previous Page
          </CustomTooltip>
          <span className="text-sm text-foreground px-2">
            {currentPage} / {totalPages}
          </span>
          <div id="pdf-next-page">
            <IconButton
              Icon={ChevronRight}
              onClick={() => handlePageNavigation(currentPage + 1)}
              disabled={currentPage >= totalPages}
              size="sm"
            />
          </div>
          <CustomTooltip anchorSelect="#pdf-next-page" place="bottom">
            Next Page
          </CustomTooltip>
        </div>
        <div className="flex items-center space-x-2">
          <div id="pdf-zoom-out">
            <IconButton
              Icon={ZoomOut}
              onClick={handleZoomOut}
              size="sm"
              disabled={scale <= 0.5}
            />
          </div>
          <CustomTooltip anchorSelect="#pdf-zoom-out" place="bottom">
            Zoom Out
          </CustomTooltip>
          <span className="text-sm text-foreground px-2 min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <div id="pdf-zoom-in">
            <IconButton
              Icon={ZoomIn}
              onClick={handleZoomIn}
              size="sm"
              disabled={scale >= 3.0}
            />
          </div>
          <CustomTooltip anchorSelect="#pdf-zoom-in" place="bottom">
            Zoom In
          </CustomTooltip>
          <div id="pdf-zoom-reset">
            <IconButton
              Icon={RotateCcw}
              onClick={handleZoomReset}
              size="sm"
            />
          </div>
          <CustomTooltip anchorSelect="#pdf-zoom-reset" place="bottom">
            Reset Zoom
          </CustomTooltip>
        </div>
      </div>

      {/* PDF Content */}
      <div
        ref={containerRef}
        className={`flex-1 bg-gray-100 dark:bg-gray-800 overflow-auto relative ${
          annotationMode ? "annotation-mode" : ""
        }`}
        onClick={handleContainerClick}
        style={{ cursor: annotationMode ? "crosshair" : "default" }}
      >
        <div className="p-4 space-y-5 relative">
          {pageLayouts.map(({ pageNumber, viewport }) => {
            const pageProxy = pdfPageProxies.get(pageNumber);
            return (
              <div
                key={pageNumber}
                ref={(el) => {
                  if (el) pageRefs.current.set(pageNumber, el);
                  else pageRefs.current.delete(pageNumber);
                }}
                data-page-number={pageNumber}
                className="relative bg-white shadow-lg mx-auto"
                style={{
                  width: viewport.width,
                  height: viewport.height,
                }}
              >
                {renderedPages.has(pageNumber) && pageProxy && (
                  <PDFPageItem
                    pdfPage={pageProxy}
                    viewport={viewport}
                    onRender={() => {}}
                  />
                )}
                {/* Annotations for this page */}
                {annotations
                  .filter((a) => a.page === pageNumber)
                  .map((annotation) => (
                    <div
                      key={annotation.id}
                      className="absolute pointer-events-auto"
                      style={{
                        left: `${annotation.x * 100}%`,
                        top: `${annotation.y * 100}%`,
                        transform: "translate(-50%, -50%)",
                        zIndex: 30,
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAnnotationClick(annotation);
                        }}
                        className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors shadow-lg"
                        title={`Annotation by ${
                          annotation.comment.user.name
                        }: ${annotation.comment.content.substring(0, 50)}...`}
                      >
                        <MessageSquare size={16} />
                      </button>
                    </div>
                  ))}
              </div>
            );
          })}
        </div>

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
            <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg">
              <Plus size={16} />
            </div>
          </div>
        )}

        {annotationFormTarget && (
          <AnnotationForm
            position={annotationFormTarget.position}
            formPosition={annotationFormTarget.formPosition}
            onSave={handleSaveAnnotation}
            onCancel={handleCancelAnnotation}
            isSubmitting={isSubmitting}
          />
        )}

        {selectedAnnotation && selectedAnnotationPosition && (
          <div
            className="absolute pointer-events-auto bg-background border-2 border-border rounded-xl shadow-2xl p-4 w-80"
            style={{
              left: `${selectedAnnotationPosition.left}px`,
              top: `${selectedAnnotationPosition.top}px`,
              transform: "translate(-50%, -125%)",
              zIndex: 1000,
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-foreground m-0">
                Annotation
              </h3>
              <div className="flex items-center gap-1">
                <div id="pdf-delete-annotation">
                  <button
                    onClick={() => handleDeleteAnnotation(selectedAnnotation)}
                    className="p-1 rounded text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Delete annotation"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <CustomTooltip anchorSelect="#pdf-delete-annotation" place="bottom">
                  Delete Annotation
                </CustomTooltip>
                <button
                  onClick={() => setSelectedAnnotation(null)}
                  className="p-1 rounded text-foreground-secondary hover:text-foreground"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {selectedAnnotation.comment.user.name}
                </span>
                <span className="text-xs text-foreground-secondary">
                  {formatDate(selectedAnnotation.comment.createdAt)}
                </span>
              </div>
              <p className="text-sm text-foreground m-0 leading-normal">
                {selectedAnnotation.comment.content}
              </p>
              <div className="text-xs text-foreground-secondary">
                Page {selectedAnnotation.page}
              </div>
            </div>
          </div>
        )}

        {/* Delete Annotation Confirmation Modal */}
        <ConfirmationModal
          isOpen={deleteConfirmAnnotation !== null}
          onConfirm={handleConfirmDeleteAnnotation}
          onClose={handleCancelDeleteAnnotation}
          title="Delete Annotation"
          message={`Are you sure you want to delete this annotation? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          isLoading={deleteAnnotationMutation.isPending}
        />
      </div>
    </div>
  );
};

export default PDFViewer;
