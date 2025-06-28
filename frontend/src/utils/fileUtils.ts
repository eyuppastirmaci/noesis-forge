/**
 * Format file size in human readable format
 * @param bytes - File size in bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted file size string (e.g., "1.5 MB", "256 KB")
 */
export const formatFileSize = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

/**
 * Format file size with more detailed units
 * @param bytes - File size in bytes
 * @returns Formatted file size string with detailed units
 */
export const formatDetailedFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";

  const units = [
    { name: "Byte", plural: "Bytes", size: 1 },
    { name: "Kilobyte", plural: "Kilobytes", size: 1024 },
    { name: "Megabyte", plural: "Megabytes", size: 1024 * 1024 },
    { name: "Gigabyte", plural: "Gigabytes", size: 1024 * 1024 * 1024 },
    { name: "Terabyte", plural: "Terabytes", size: 1024 * 1024 * 1024 * 1024 },
  ];

  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  const unit = units[unitIndex];
  const formattedSize = size === Math.floor(size) ? size.toString() : size.toFixed(2);
  const unitName = size === 1 ? unit.name : unit.plural;

  return `${formattedSize} ${unitName}`;
};

/**
 * Get file extension from filename
 * @param filename - Name of the file
 * @returns File extension (without dot) or empty string if no extension
 */
export const getFileExtension = (filename: string): string => {
  const lastDotIndex = filename.lastIndexOf(".");
  if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
    return "";
  }
  return filename.substring(lastDotIndex + 1).toLowerCase();
};

/**
 * Get filename without extension
 * @param filename - Name of the file
 * @returns Filename without extension
 */
export const getFilenameWithoutExtension = (filename: string): string => {
  const lastDotIndex = filename.lastIndexOf(".");
  if (lastDotIndex === -1) return filename;
  return filename.substring(0, lastDotIndex);
};

/**
 * Check if a file type is an image
 * @param fileType - MIME type of the file
 * @returns Boolean indicating if the file is an image
 */
export const isImageFile = (fileType: string): boolean => {
  return fileType.startsWith("image/");
};

/**
 * Check if a file type is a document
 * @param fileType - MIME type of the file
 * @returns Boolean indicating if the file is a document
 */
export const isDocumentFile = (fileType: string): boolean => {
  const documentTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/markdown",
  ];

  return documentTypes.includes(fileType);
};

/**
 * Check if a file type is a video
 * @param fileType - MIME type of the file
 * @returns Boolean indicating if the file is a video
 */
export const isVideoFile = (fileType: string): boolean => {
  return fileType.startsWith("video/");
};

/**
 * Check if a file type is an audio file
 * @param fileType - MIME type of the file
 * @returns Boolean indicating if the file is an audio file
 */
export const isAudioFile = (fileType: string): boolean => {
  return fileType.startsWith("audio/");
};

/**
 * Get a human-readable file type description
 * @param mimeType - MIME type of the file
 * @returns Human-readable file type description
 */
export const getFileTypeDescription = (mimeType: string): string => {
  const typeMap: Record<string, string> = {
    "application/pdf": "PDF Document",
    "application/msword": "Word Document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
    "application/vnd.ms-excel": "Excel Spreadsheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel Spreadsheet",
    "application/vnd.ms-powerpoint": "PowerPoint Presentation",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PowerPoint Presentation",
    "text/plain": "Text File",
    "text/markdown": "Markdown File",
    "image/jpeg": "JPEG Image",
    "image/png": "PNG Image",
    "image/gif": "GIF Image",
    "image/svg+xml": "SVG Image",
    "video/mp4": "MP4 Video",
    "video/avi": "AVI Video",
    "audio/mp3": "MP3 Audio",
    "audio/wav": "WAV Audio",
  };

  return typeMap[mimeType] || "Unknown File Type";
};

/**
 * Get file type icon based on extension or mime type
 * @param fileType - File type/extension to get icon for
 * @returns Emoji icon representing the file type
 */
export const getFileTypeIcon = (fileType: string): string => {
  switch (fileType.toLowerCase()) {
    case "pdf":
      return "📄";
    case "docx":
    case "doc":
      return "📝";
    case "txt":
    case "md":
      return "📋";
    case "xlsx":
    case "xls":
      return "📊";
    case "pptx":
    case "ppt":
      return "📽️";
    default:
      return "📎";
  }
};

/**
 * Validate file size against a maximum limit
 * @param fileSize - Size of the file in bytes
 * @param maxSize - Maximum allowed size in bytes
 * @returns Object with validation result and error message if invalid
 */
export const validateFileSize = (
  fileSize: number,
  maxSize: number
): { isValid: boolean; error?: string } => {
  if (fileSize > maxSize) {
    return {
      isValid: false,
      error: `File size ${formatFileSize(fileSize)} exceeds the maximum allowed size of ${formatFileSize(maxSize)}`,
    };
  }

  return { isValid: true };
};

/**
 * Validate file type against allowed types
 * @param fileType - MIME type of the file
 * @param allowedTypes - Array of allowed MIME types
 * @returns Object with validation result and error message if invalid
 */
export const validateFileType = (
  fileType: string,
  allowedTypes: string[]
): { isValid: boolean; error?: string } => {
  if (!allowedTypes.includes(fileType)) {
    return {
      isValid: false,
      error: `File type "${getFileTypeDescription(fileType)}" is not allowed`,
    };
  }

  return { isValid: true };
};

/**
 * Validate file size against maximum allowed size (File object version)
 * @param file - File object to validate
 * @param maxSize - Maximum allowed file size in bytes (default: 100MB)
 * @returns Validation result with error message if invalid
 */
export const validateFileSizeFromFile = (
  file: File,
  maxSize: number = 100 * 1024 * 1024
): { isValid: boolean; error?: string } => {
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size must be less than ${formatFileSize(maxSize)}`,
    };
  }
  return { isValid: true };
};

/**
 * Validate file type against allowed types (File object version)
 * @param file - File object to validate
 * @param allowedTypes - Array of allowed MIME types
 * @returns Validation result with error message if invalid
 */
export const validateFileTypeFromFile = (
  file: File,
  allowedTypes: string[]
): { isValid: boolean; error?: string } => {
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error:
        "File type not supported. Supported types: PDF, DOCX, DOC, TXT, XLSX, XLS, PPTX, PPT, MD",
    };
  }
  return { isValid: true };
};

/**
 * Generate a safe filename by removing/replacing invalid characters
 * @param filename - Original filename
 * @returns Safe filename
 */
export const generateSafeFilename = (filename: string): string => {
  // Remove or replace invalid characters for most file systems
  return filename
    .replace(/[<>:"/\\|?*]/g, "_") // Replace invalid characters with underscore
    .replace(/\s+/g, "_") // Replace spaces with underscore
    .replace(/_{2,}/g, "_") // Replace multiple underscores with single
    .replace(/^_|_$/g, ""); // Remove leading/trailing underscores
};

/**
 * Convert bytes to different units
 * @param bytes - Size in bytes
 * @param targetUnit - Target unit (KB, MB, GB, TB)
 * @param decimals - Number of decimal places
 * @returns Converted size as number
 */
export const convertBytes = (
  bytes: number,
  targetUnit: "KB" | "MB" | "GB" | "TB",
  decimals: number = 2
): number => {
  const units = {
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024,
  };

  const result = bytes / units[targetUnit];
  return Math.round(result * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

/**
 * Compare file sizes
 * @param sizeA - First file size in bytes
 * @param sizeB - Second file size in bytes
 * @returns -1 if A < B, 0 if A = B, 1 if A > B
 */
export const compareFileSizes = (sizeA: number, sizeB: number): number => {
  if (sizeA < sizeB) return -1;
  if (sizeA > sizeB) return 1;
  return 0;
};

/**
 * File validation result interface
 */
export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Check for malicious characters in filename
 * @param filename - Name of the file
 * @returns Boolean indicating if filename contains malicious characters
 */
const containsMaliciousCharacters = (filename: string): boolean => {
  const maliciousChars = ["..", "\\", "/", ":", "*", "?", '"', "<", ">", "|"];
  return maliciousChars.some((char) => filename.includes(char));
};

/**
 * Validates a file for upload
 */
export const validateFile = (file: File, maxSize?: number): FileValidationResult => {
  const maxFileSize = maxSize || 100 * 1024 * 1024; // 100MB default

  if (file.size > maxFileSize) {
    return {
      isValid: false,
      error: `File size must be less than ${formatFileSize(maxFileSize)}`,
    };
  }

  if (file.size === 0) {
    return {
      isValid: false,
      error: "File cannot be empty",
    };
  }

  const supportedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'text/markdown',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
  ];

  if (!supportedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: "File type not supported. Supported types: PDF, DOCX, DOC, TXT, XLSX, XLS, PPTX, PPT, MD",
    };
  }

  return { isValid: true };
};

/**
 * Generates a thumbnail for PDF files using PDF.js
 */
export const generatePDFThumbnail = async (file: File): Promise<string | null> => {
  if (file.type !== 'application/pdf') {
    return null;
  }

  try {
    // Dynamically import PDF.js to avoid SSR issues
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set worker path (you'll need to add this to your public folder)
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load PDF document
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    // Get first page
    const page = await pdf.getPage(1);
    
    // Set scale for thumbnail (smaller for performance)
    const scale = 0.5;
    const viewport = page.getViewport({ scale });
    
    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    // Render page to canvas
    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;
    
    // Convert canvas to data URL
    return canvas.toDataURL('image/jpeg', 0.8);
  } catch (error) {
    console.error('Failed to generate PDF thumbnail:', error);
    return null;
  }
};

/**
 * Checks if a file is a PDF
 */
export const isPDF = (file: File): boolean => {
  return file.type === 'application/pdf';
};

/**
 * Creates a preview URL for images or returns null for other file types
 */
export const createFilePreviewURL = (file: File): string | null => {
  if (file.type.startsWith('image/')) {
    return URL.createObjectURL(file);
  }
  return null;
}; 