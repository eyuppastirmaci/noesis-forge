// User types
export type {
  User,
  PublicUser,
  CreateUserRequest,
  UpdateUserRequest,
  ChangePasswordRequest,
  UserProfileResponse,
} from "./user";

export { UserStatus } from "./user";

// Role & Permission types
export type {
  Role,
  Permission,
  CreateRoleRequest,
  UpdateRoleRequest,
  AssignRoleRequest,
  RolesResponse,
  RoleResponse,
  PermissionsResponse,
  PermissionsByCategoryResponse,
  RoleOperationResponse,
  RoleAssignmentResponse,
  PermissionsByCategory,
  RolePermissionMap,
} from "./role";

export { PermissionCategory } from "./role";

// Authentication types
export type {
  TokenPair,
  TokenClaims,
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  LogoutRequest,
  LoginResponse,
  RegisterResponse,
  RefreshTokenResponse,
  LogoutResponse,
  ProfileResponse,
  ProfileUpdateResponse,
  PasswordChangeResponse,
  AuthState,
  AuthAction,
  NextAuthUser,
  DecodedJWT,
} from "./auth";

export { AuthErrorCode } from "./auth";

// API types
export type {
  ApiResponse,
  ApiError,
  ValidationError,
  SuccessResponse,
  ErrorResponse,
  PaginationParams,
  PaginationMeta,
  PaginatedResponse,
  ApiRequestConfig,
  HealthCheckResponse,
  ApiClientResponse,
  BackendResponse,
  MessageResponse,
  EmptyResponse,
  TransformedApiResponse,
  AuthTokens,
} from "./api";

export {
  HttpStatus,
  ApiErrorCode,
  ApiClientError,
  isSuccessResponse,
  isErrorResponse,
} from "./api";

// Common utility types
export type ID = string;
export type Timestamp = string; // ISO date string
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// API endpoint paths - for type safety
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    REFRESH: "/auth/refresh",
    LOGOUT: "/auth/logout",
    PROFILE: "/auth/profile",
    CHANGE_PASSWORD: "/auth/change-password",
  },

  // Role endpoints
  ROLES: {
    BASE: "/roles",
    BY_ID: (id: string) => `/roles/${id}`,
    PERMISSIONS: "/roles/permissions",
    PERMISSIONS_BY_CATEGORY: (category: string) =>
      `/roles/permissions/categories/${category}`,
    ASSIGN: "/roles/assign",
  },

  // Health endpoints
  HEALTH: {
    BASE: "/health",
    READY: "/health/ready",
    LIVE: "/health/live",
  },
} as const;

// HTTP Methods type
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

// Storage keys - for localStorage/sessionStorage
export const STORAGE_KEYS = {
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
  USER: "user",
  THEME: "theme",
  LANGUAGE: "language",
} as const;

// Query keys - For TanStack Query
export const QUERY_KEYS = {
  // Auth queries
  AUTH: {
    PROFILE: ["auth", "profile"] as const,
    VERIFY_TOKEN: ["auth", "verify"] as const,
  },

  // Role queries
  ROLES: {
    ALL: ["roles"] as const,
    BY_ID: (id: string) => ["roles", id] as const,
    PERMISSIONS: ["roles", "permissions"] as const,
    PERMISSIONS_BY_CATEGORY: (category: string) =>
      ["roles", "permissions", category] as const,
  },

  // Health queries
  HEALTH: {
    STATUS: ["health"] as const,
  },
} as const;

// Mutation keys - For TanStack Query
export const MUTATION_KEYS = {
  // Auth mutations
  AUTH: {
    LOGIN: "auth.login",
    REGISTER: "auth.register",
    LOGOUT: "auth.logout",
    REFRESH: "auth.refresh",
    UPDATE_PROFILE: "auth.updateProfile",
    CHANGE_PASSWORD: "auth.changePassword",
  },

  // Role mutations
  ROLES: {
    CREATE: "roles.create",
    UPDATE: "roles.update",
    DELETE: "roles.delete",
    ASSIGN: "roles.assign",
  },
} as const;
