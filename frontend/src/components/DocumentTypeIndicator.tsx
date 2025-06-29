"use client";

import React from "react";
import { DocumentType } from "@/types";
const { FileText, FileWord, FileSpreadsheet, FilePresentation, File } = require("lucide-react");

interface DocumentTypeIndicatorProps {
  fileType: DocumentType;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const DocumentTypeIndicator: React.FC<DocumentTypeIndicatorProps> = ({
  fileType,
  size = "md",
  className = "",
}) => {
  const getFileIcon = (fileType: DocumentType) => {
    const iconSizes = {
      sm: "w-7 h-7",
      md: "w-8 h-8",
      lg: "w-10 h-10",
    };

    const colorMap = {
      [DocumentType.PDF]: "text-red-600",
      [DocumentType.DOCX]: "text-blue-500", 
      [DocumentType.XLSX]: "text-green-500",
      [DocumentType.PPTX]: "text-orange-500",
      [DocumentType.TXT]: "text-gray-500",
      [DocumentType.OTHER]: "text-gray-500",
    };

    const IconComponent = (() => {
      switch (fileType) {
        case DocumentType.PDF:
          return FileText;
        case DocumentType.DOCX:
          return FileWord;
        case DocumentType.XLSX:
          return FileSpreadsheet;
        case DocumentType.PPTX:
          return FilePresentation;
        case DocumentType.TXT:
          return FileText;
        case DocumentType.OTHER:
        default:
          return File;
      }
    })();
    
    return <IconComponent className={`${iconSizes[size]} ${colorMap[fileType]}`} />;
  };

  // Badge configurations
  const getBadgeConfig = (fileType: DocumentType) => {
    const typeColors = {
      pdf: "bg-red-500 text-white",
      docx: "bg-blue-500 text-white",
      xlsx: "bg-green-500 text-white",
      pptx: "bg-orange-500 text-white",
      txt: "bg-gray-500 text-white",
      other: "bg-purple-500 text-white",
    };

    const typeNames = {
      pdf: "PDF",
      docx: "DOC",
      xlsx: "XLS",
      pptx: "PPT",
      txt: "TXT",
      other: "FILE",
    };

    return {
      color: typeColors[fileType],
      name: typeNames[fileType],
    };
  };

  // Container and badge sizes
  const containerSizes = {
    sm: "w-7 h-7",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  const badgeSizes = {
    sm: "px-1 py-0.5 text-[8px] font-semibold",
    md: "px-1 py-0.5 text-[9px] font-semibold",
    lg: "px-1.5 py-0.5 text-[10px] font-semibold",
  };

  const badgeConfig = getBadgeConfig(fileType);

  return (
    <div
      className={`relative inline-flex items-center justify-center ${containerSizes[size]} ${className}`}
    >
      {/* Background Icon */}
      <div className="absolute inset-0 flex items-center justify-center opacity-90">
        {getFileIcon(fileType)}
      </div>

      {/* Overlay Badge Strip */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex items-center justify-center">
        <span
          className={`inline-flex items-center justify-center rounded ${badgeSizes[size]} ${badgeConfig.color} shadow-sm border border-white/20`}
        >
          {badgeConfig.name}
        </span>
      </div>
    </div>
  );
};

export default DocumentTypeIndicator;
