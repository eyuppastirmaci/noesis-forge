import { User } from './user';

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

export interface LoginResponse {
  message: string;
  user: User;
  tokens: TokenPair;
}

export interface RegisterResponse {
  message: string;
  user: User;
}

export interface RefreshTokenResponse {
  message: string;
  tokens: TokenPair;
}

export interface LogoutResponse {
  message: string;
}

export interface ProfileResponse {
  user: User;
}

export interface ProfileUpdateResponse {
  message: string;
  user: User;
}

export interface PasswordChangeResponse {
  message: string;
}

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

export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  REGISTRATION_FAILED = 'REGISTRATION_FAILED',
  PASSWORD_CHANGE_FAILED = 'PASSWORD_CHANGE_FAILED',
  PROFILE_UPDATE_FAILED = 'PROFILE_UPDATE_FAILED'
}