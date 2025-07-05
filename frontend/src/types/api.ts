export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ApiError {
  code?: string;
  message: string;
  details?: string;
  field?: string;
  validationErrors?: ValidationError[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: HttpStatus;
  timestamp: string; // ISO-8601
  data?: T;
  message?: string;
  error?: ApiError;
}

export interface SuccessResponse<T = unknown> extends ApiResponse<T> {
  success: true;
  data: T;
}

export function isSuccessResponse<T>(
  res: ApiResponse<T>
): res is SuccessResponse<T> {
  return res.success === true;
}

export class ApiClientError extends Error {
  readonly statusCode: HttpStatus;
  readonly code: string;
  readonly details?: string;
  readonly validationErrors?: ValidationError[];
  readonly fieldErrors?: Record<string, string>;
  readonly response?: unknown;

  constructor(error: ApiError, statusCode: HttpStatus, response?: unknown) {
    super(error.message);
    this.name = "ApiClientError";
    this.statusCode = statusCode;
    this.code = error.code ?? "";
    this.details = error.details;
    this.validationErrors = error.validationErrors;
    this.response = response;

    this.fieldErrors = this.extractFieldErrors(response);
  }

  private extractFieldErrors(resp?: any): Record<string, string> | undefined {
    const out: Record<string, string> = {};

    // Backend may embed field errors in various places – normalise them.
    if (resp?.data?.data && typeof resp.data.data === "object") {
      Object.assign(out, resp.data.data);
    }

    if (this.validationErrors) {
      for (const ve of this.validationErrors) out[ve.field] = ve.message;
    }

    if (this.details && resp?.data?.error?.field) {
      out[resp.data.error.field] = this.details;
    }

    return Object.keys(out).length ? out : undefined;
  }

  isValidationError(): boolean {
    return !!this.fieldErrors;
  }

  getFieldError(field: string): string | undefined {
    return this.fieldErrors?.[field];
  }

  getAllFieldErrors(): Record<string, string> {
    return this.fieldErrors ?? {};
  }
}

export function isApiClientError(err: unknown): err is ApiClientError {
  return err instanceof ApiClientError;
}

export function extractFieldErrors(err: unknown): Record<string, string> {
  if (isApiClientError(err)) return err.getAllFieldErrors();
  if (err && (err as any).response?.data?.data) return (err as any).response.data.data;
  return {};
}

export function getErrorMessage(err: unknown): string {
  if (isApiClientError(err)) return err.message;
  if ((err as any)?.response?.data?.message) return (err as any).response.data.message;
  if ((err as any)?.message) return (err as any).message;
  return "An unexpected error occurred";
}

/* Tokens & common lightweight responses */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string; // "Bearer"
  expiresIn: number; // seconds
}