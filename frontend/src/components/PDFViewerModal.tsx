"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import PDFViewerSkeleton from "@/components/ui/PDFViewerSkeleton";
import { Document, DocumentType, CommentPosition, CommentResponse } from "@/types";
import { MessageSquare, Edit3 } from "lucide-react";

// Dynamically import PDFViewer to avoid SSR issues
const PDFViewer = dynamic(() => import("@/components/PDFViewer"), {
  ssr: false,
  loading: () => <PDFViewerSkeleton />
});

interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document;
  currentUserId?: string;
  onAnnotationCreate?: (position: CommentPosition) => void;
  targetAnnotation?: CommentResponse | null;
  onTargetAnnotationViewed?: () => void;
  onAnnotationAdded?: () => void;
}

const PDFViewerModal: React.FC<PDFViewerModalProps> = ({
  isOpen,
  onClose,
  document,
  onAnnotationCreate,
  targetAnnotation,
  onTargetAnnotationViewed,
  onAnnotationAdded,
}) => {
  const [annotationMode, setAnnotationMode] = useState(false);

  // Disable annotation mode when target annotation is provided
  React.useEffect(() => {
    if (targetAnnotation) {
      setAnnotationMode(false);
    }
  }, [targetAnnotation]);

  // Only render modal for PDF documents
  if (document.fileType !== DocumentType.PDF) {
    return null;
  }

  const handleAnnotationCreate = (position: CommentPosition) => {
    if (onAnnotationCreate) {
      onAnnotationCreate(position);
      setAnnotationMode(false); // Exit annotation mode after creating
    }
  };

  const toggleAnnotationMode = () => {
    setAnnotationMode(!annotationMode);
  };

  const handleModalClose = () => {
    // Reset annotation mode when closing
    setAnnotationMode(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      size="full"
      closeOnOverlayClick={false}
      closeOnEscape={true}
    >
      <Modal.Header className="!mb-2">
        <div className="flex items-center justify-between w-full">
          <span>{document.title}</span>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={toggleAnnotationMode}
              variant={annotationMode ? "primary" : "secondary"}
              size="sm"
              className="flex items-center"
            >
              {annotationMode ? (
                <>
                  <Edit3 className="w-4 h-4 mr-2" />
                  Exit Annotation Mode
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Add Annotations
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal.Header>
      
      <Modal.Content className="!p-0 !mb-0 h-full">
        <PDFViewer
          documentId={document.id}
          className="h-full"
          annotationMode={annotationMode}
          onAnnotationCreate={handleAnnotationCreate}
          targetAnnotation={targetAnnotation}
          onTargetAnnotationViewed={onTargetAnnotationViewed}
          onAnnotationAdded={onAnnotationAdded}
        />
      </Modal.Content>
    </Modal>
  );
};

export default PDFViewerModal; 