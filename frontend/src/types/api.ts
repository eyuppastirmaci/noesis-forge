// HTTP Status Codes
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

// Error codes - Compatible with the backend error codes.
export enum ApiErrorCode {
  // Validation errors
  VALIDATION_ERROR = "VALIDATION_ERROR",

  // Auth errors
  AUTHORIZATION_REQUIRED = "AUTHORIZATION_REQUIRED",
  INVALID_TOKEN_FORMAT = "INVALID_TOKEN_FORMAT",
  EMPTY_TOKEN = "EMPTY_TOKEN",
  INVALID_TOKEN = "INVALID_TOKEN",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",

  // Auth operation errors
  REGISTRATION_FAILED = "REGISTRATION_FAILED",
  USER_ALREADY_EXISTS = "USER_ALREADY_EXISTS",
  LOGIN_FAILED = "LOGIN_FAILED",
  ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
  REFRESH_FAILED = "REFRESH_FAILED",
  LOGOUT_FAILED = "LOGOUT_FAILED",

  // User operation errors
  USER_NOT_FOUND = "USER_NOT_FOUND",
  UPDATE_FAILED = "UPDATE_FAILED",
  USERNAME_ALREADY_EXISTS = "USERNAME_ALREADY_EXISTS",
  PASSWORD_CHANGE_FAILED = "PASSWORD_CHANGE_FAILED",
  INVALID_OLD_PASSWORD = "INVALID_OLD_PASSWORD",

  // Role operation errors
  ROLE_NOT_FOUND = "ROLE_NOT_FOUND",
  ROLE_NAME_EXISTS = "ROLE_NAME_EXISTS",
  SYSTEM_ROLE_IMMUTABLE = "SYSTEM_ROLE_IMMUTABLE",
  CREATION_FAILED = "CREATION_FAILED",
  UPDATE_FAILED_ROLE = "UPDATE_FAILED",
  DELETION_FAILED = "DELETION_FAILED",
  ASSIGNMENT_FAILED = "ASSIGNMENT_FAILED",
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
  INVALID_ID = "INVALID_ID",
  INVALID_CATEGORY = "INVALID_CATEGORY",

  // Service errors
  SERVICE_NOT_READY = "SERVICE_NOT_READY",

  // Rate limiting
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",

  // Generic errors
  INTERNAL_ERROR = "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
}

export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: HttpStatus;
  timestamp: string;
  data?: T;
  message?: string;
  error?: ApiError;
}

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: string;
  field?: string;
  validationErrors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface SuccessResponse<T = any> extends ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorResponse extends ApiResponse<never> {
  success: false;
  error: ApiError;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface ApiRequestConfig {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  url: string;
  data?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
  withAuth?: boolean;
}

export interface HealthCheckResponse {
  status: "healthy" | "unhealthy" | "ready" | "alive";
  checks?: {
    database?: {
      status: "up" | "down";
      response_time: number;
      connections?: {
        open: number;
        in_use: number;
        idle: number;
        max_open: number;
      };
      error?: string;
    };
  };
}

export type ApiClientResponse<T> = Promise<SuccessResponse<T>>;

// API client error type
export class ApiClientError extends Error {
  public readonly statusCode: HttpStatus;
  public readonly code: ApiErrorCode;
  public readonly details?: string;
  public readonly validationErrors?: ValidationError[];

  constructor(error: ApiError, statusCode: HttpStatus) {
    super(error.message);
    this.name = "ApiClientError";
    this.statusCode = statusCode;
    this.code = error.code;
    this.details = error.details;
    this.validationErrors = error.validationErrors;
  }
}

export function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is SuccessResponse<T> {
  return response.success === true;
}

export function isErrorResponse(
  response: ApiResponse
): response is ErrorResponse {
  return response.success === false;
}

// Updated to match new backend response format
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

// Standard response types that match backend format
export interface MessageResponse {
  message: string;
}

export interface EmptyResponse {
  // Empty response with just success/message
}

export interface TransformedApiResponse<T> {
  data: T;
  status: HttpStatus;
  headers: Record<string, string>;
}