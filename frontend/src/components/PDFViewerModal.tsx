"use client";

import React from "react";
import dynamic from "next/dynamic";
import Modal from "@/components/ui/Modal";
import PDFViewerSkeleton from "@/components/ui/PDFViewerSkeleton";
import { Document, DocumentType } from "@/types";

// Dynamically import PDFViewer to avoid SSR issues
const PDFViewer = dynamic(() => import("@/components/PDFViewer"), {
  ssr: false,
  loading: () => <PDFViewerSkeleton />
});

interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document;
}

const PDFViewerModal: React.FC<PDFViewerModalProps> = ({
  isOpen,
  onClose,
  document,
}) => {
  // Only render modal for PDF documents
  if (document.fileType !== DocumentType.PDF) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      closeOnOverlayClick={true}
      closeOnEscape={true}
    >
      <Modal.Header className="!mb-2">
        {document.title}
      </Modal.Header>
      
      <Modal.Content className="!p-0 !mb-0 h-full">
        <PDFViewer
          documentId={document.id}
          documentTitle={document.title}
          className="h-full"
        />
      </Modal.Content>
    </Modal>
  );
};

export default PDFViewerModal; 