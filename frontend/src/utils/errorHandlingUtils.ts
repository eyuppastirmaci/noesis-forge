import { isApiClientError, getErrorMessage, extractFieldErrors } from "@/types";
import { toast } from "./toastUtils";

// Re-export common error utilities
export { isApiClientError, getErrorMessage, extractFieldErrors };

/**
 * Check if error is a specific API error code
 * @param error - The error object to check
 * @param code - The specific error code to match
 * @returns Boolean indicating if the error matches the specified code
 */
export function isApiErrorCode(error: any, code: string): boolean {
  if (isApiClientError(error)) {
    return error.code === code;
  }
  return false;
}

/**
 * Check if error is a validation error (has field errors)
 * @param error - The error object to check
 * @returns Boolean indicating if the error is a validation error
 */
export function isValidationError(error: any): boolean {
  if (isApiClientError(error)) {
    return error.isValidationError();
  }
  return false;
}

/**
 * Get field error for a specific field
 * @param error - The error object containing field errors
 * @param field - The field name to get the error for
 * @returns Error message for the field or undefined if no error
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
 * @param error - The error object to check
 * @param field - The field name to check for errors
 * @returns Boolean indicating if the field has an error
 */
export function hasFieldError(error: any, field: string): boolean {
  return !!getFieldError(error, field);
}

/**
 * Format file size in human readable format
 * @param bytes - File size in bytes
 * @returns Formatted file size string (e.g., "1.5 MB", "256 KB")
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
 * @param fileType - File type/extension to get icon for
 * @returns Emoji icon representing the file type
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
 * @param filename - The complete filename
 * @returns Filename without the extension
 */
export function getFilenameWithoutExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf(".");
  if (lastDotIndex === -1) return filename;
  return filename.substring(0, lastDotIndex);
}

/**
 * Validate file size against maximum allowed size
 * @param file - File object to validate
 * @param maxSize - Maximum allowed file size in bytes (default: 100MB)
 * @returns Validation result with error message if invalid
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
 * Validate file type against allowed types
 * @param file - File object to validate
 * @param allowedTypes - Array of allowed MIME types
 * @returns Validation result with error message if invalid
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
 * Show error toast notification
 * @param error - Error object to display
 */
export function showErrorToast(error: any): void {
  const message = getErrorMessage(error);
  toast.error(message);
}

/**
 * Show success toast notification
 * @param message - Success message to display
 */
export function showSuccessToast(message: string): void {
  toast.success(message);
}

/**
 * Handle async operation with error catching and optional error handler
 * @param operation - Async function to execute
 * @param onError - Optional custom error handler function
 * @returns Promise containing either data or error
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


