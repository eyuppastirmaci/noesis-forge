import { User } from './user';
import { ApiResponse, SuccessResponse } from './api';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: string; // "Bearer"
  expiresIn: number; // seconds
}

export interface TokenClaims {
  userID: string;
  email: string;
  username: string;
  roleID: string;
  roleName: string;
  exp: number;
  iat: number;
}

// ===== REQUEST TYPES =====
export interface LoginRequest {
  email?: string;
  username?: string;
  password: string;
  remember?: boolean;
}

export interface RegisterRequest {
  email: string;
  username: string;
  name: string;
  password: string;
  passwordConfirm: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface UpdateProfileRequest {
  name?: string;
  username?: string;
  bio?: string;
  avatar?: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

// ===== RESPONSE DATA TYPES =====
// These match the backend's "data" field content

export interface LoginResponseData {
  user: User;
  tokens: TokenPair;
}

export interface RegisterResponseData {
  user: User;
}

export interface RefreshTokenResponseData {
  tokens: TokenPair;
}

export interface ProfileResponseData {
  user: User;
}

export interface ProfileUpdateResponseData {
  user: User;
}

// ===== RESPONSE TYPES =====
// These match the actual backend response structure

export type LoginResponse = SuccessResponse<LoginResponseData>;
export type RegisterResponse = SuccessResponse<RegisterResponseData>;
export type RefreshTokenResponse = SuccessResponse<RefreshTokenResponseData>;
export type LogoutResponse = SuccessResponse<null>;
export type ProfileResponse = SuccessResponse<ProfileResponseData>;
export type ProfileUpdateResponse = SuccessResponse<ProfileUpdateResponseData>;
export type PasswordChangeResponse = SuccessResponse<null>;

// ===== AUTH STATE =====
export interface AuthState {
  user: User | null;
  tokens: TokenPair | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; tokens: TokenPair } }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'REFRESH_TOKEN_SUCCESS'; payload: TokenPair }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'CLEAR_ERROR' };

// ===== NEXTAUTH INTEGRATION =====
export interface NextAuthUser extends User {
  accessToken?: string;
  refreshToken?: string;
}

export interface DecodedJWT {
  sub: string;
  email: string;
  username: string;
  roleID: string;
  role: string;
  exp: number;
  iat: number;
}

// ===== ERROR CODES =====
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  REGISTRATION_FAILED = 'REGISTRATION_FAILED',
  PASSWORD_CHANGE_FAILED = 'PASSWORD_CHANGE_FAILED',
  PROFILE_UPDATE_FAILED = 'PROFILE_UPDATE_FAILED'
}