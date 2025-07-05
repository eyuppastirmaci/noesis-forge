import { isApiClientError, getErrorMessage, extractFieldErrors } from "@/types";
import { toast } from "./toastUtils";

// Re-export common error utilities
export { isApiClientError, getErrorMessage, extractFieldErrors };

/**
 * Check if error is a specific API error code
 * @param error - The error object to check
 * @param httpStatus - The specific error status code to match
 * @returns Boolean indicating if the error matches the specified code
 */
export function isApiErrorCode(error: any, httpStatus: number): boolean {
  if (isApiClientError(error)) {
    return error.statusCode === httpStatus;
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


