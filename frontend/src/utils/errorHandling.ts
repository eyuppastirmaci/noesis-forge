import { isApiClientError, getErrorMessage, extractFieldErrors } from "@/types";
import { toast } from "./toast";

// Re-export common error utilities
export { isApiClientError, getErrorMessage, extractFieldErrors };

// Additional utility functions for error handling

/**
 * Check if error is a specific API error code
 */
export function isApiErrorCode(error: any, code: string): boolean {
  if (isApiClientError(error)) {
    return error.code === code;
  }
  return false;
}

/**
 * Check if error is a validation error (has field errors)
 */
export function isValidationError(error: any): boolean {
  if (isApiClientError(error)) {
    return error.isValidationError();
  }
  return false;
}

/**
 * Get field error for a specific field
 */
export function getFieldError(error: any, field: string): string | undefined {
  if (isApiClientError(error)) {
    return error.getFieldError(field);
  }

  const fieldErrors = extractFieldErrors(error);
  return fieldErrors[field];
}

/**
 * Check if a specific field has an error
 */
export function hasFieldError(error: any, field: string): boolean {
  return !!getFieldError(error, field);
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Get file type icon based on extension or mime type
 */
export function getFileTypeIcon(fileType: string): string {
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
}

/**
 * Extract filename without extension
 */
export function getFilenameWithoutExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf(".");
  if (lastDotIndex === -1) return filename;
  return filename.substring(0, lastDotIndex);
}

/**
 * Validate file size
 */
export function validateFileSize(
  file: File,
  maxSize: number = 100 * 1024 * 1024
): { isValid: boolean; error?: string } {
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size must be less than ${formatFileSize(maxSize)}`,
    };
  }
  return { isValid: true };
}

/**
 * Validate file type
 */
export function validateFileType(
  file: File,
  allowedTypes: string[]
): { isValid: boolean; error?: string } {
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error:
        "File type not supported. Supported types: PDF, DOCX, DOC, TXT, XLSX, XLS, PPTX, PPT, MD",
    };
  }
  return { isValid: true };
}

/**
 * Show toast notification (you can customize this based on your toast library)
 */
export function showErrorToast(error: any): void {
  const message = getErrorMessage(error);
  toast.error(message);
}

/**
 * Show success toast
 */
export function showSuccessToast(message: string): void {
  toast.success(message);
}

/**
 * Handle async operation with error catching
 */
export async function handleAsyncOperation<T>(
  operation: () => Promise<T>,
  onError?: (error: any) => void
): Promise<{ data?: T; error?: any }> {
  try {
    const data = await operation();
    return { data };
  } catch (error) {
    if (onError) {
      onError(error);
    } else {
      showErrorToast(error);
    }
    return { error };
  }
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
