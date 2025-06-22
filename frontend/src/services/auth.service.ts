import { apiClient } from "@/lib/api";
import {
  LoginRequest,
  RegisterRequest,
  UpdateUserRequest,
  ChangePasswordRequest,
  API_ENDPOINTS,
  SuccessResponse,
  AuthTokens,
  User,
} from "@/types";

export interface LoginResponseData {
  user: User;
  tokens: AuthTokens;
}

export interface RegisterResponseData {
  user: User;
}

export interface RefreshTokenResponseData {
  tokens: AuthTokens;
}

export interface ProfileResponseData {
  user: User;
}

export interface ProfileUpdateResponseData {
  user: User;
}

export type LoginResponse = SuccessResponse<LoginResponseData>;
export type RegisterResponse = SuccessResponse<RegisterResponseData>;
export type RefreshTokenResponse = SuccessResponse<RefreshTokenResponseData>;
export type LogoutResponse = SuccessResponse<null>;
export type ProfileResponse = SuccessResponse<ProfileResponseData>;
export type ProfileUpdateResponse = SuccessResponse<ProfileUpdateResponseData>;
export type PasswordChangeResponse = SuccessResponse<null>;

export class AuthService {
  private setCookies(tokens: AuthTokens) {
    // Only set cookies in browser environment
    if (typeof document === 'undefined') {
      return;
    }
    
    // Set access token cookie
    document.cookie = `access_token=${tokens.accessToken}; path=/; max-age=${tokens.expiresIn}; secure=${location.protocol === 'https:'}; samesite=lax`;
    
    // Set refresh token cookie (7 days)
    const refreshMaxAge = 7 * 24 * 60 * 60; // 7 days in seconds
    document.cookie = `refresh_token=${tokens.refreshToken}; path=/; max-age=${refreshMaxAge}; secure=${location.protocol === 'https:'}; samesite=lax`;
  }

  private clearCookies() {
    // Only clear cookies in browser environment
    if (typeof document === 'undefined') return;
    
    document.cookie = 'access_token=; path=/; max-age=0';
    document.cookie = 'refresh_token=; path=/; max-age=0';
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponseData>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );

    return response;
  }

  async register(userData: RegisterRequest): Promise<RegisterResponse> {
    const response = await apiClient.post<RegisterResponseData>(
      API_ENDPOINTS.AUTH.REGISTER,
      userData
    );

    return response;
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const response = await apiClient.post<RefreshTokenResponseData>(
      API_ENDPOINTS.AUTH.REFRESH,
      { refreshToken }
    );

    // Set new tokens in cookies
    if (response.data.tokens) {
      this.setCookies(response.data.tokens);
    }

    return response;
  }

  async logout(refreshToken?: string): Promise<LogoutResponse> {
    try {
      // Get refresh token from cookies if not provided
      const tokenToSend = refreshToken || this.getCookieValue('refresh_token');
      const body = tokenToSend ? { refreshToken: tokenToSend } : {};
      const response = await apiClient.post<null>(API_ENDPOINTS.AUTH.LOGOUT, body);
      return response;
    } finally {
      // Clear cookies and local storage
      this.clearCookies();
    }
  }

  private getCookieValue(name: string): string | null {
    if (typeof document === 'undefined') return null;
    
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  }

  async getProfile(): Promise<ProfileResponse> {
    const response = await apiClient.get<ProfileResponseData>(
      API_ENDPOINTS.AUTH.PROFILE
    );

    return response;
  }

  async updateProfile(
    updates: UpdateUserRequest
  ): Promise<ProfileUpdateResponse> {
    const response = await apiClient.put<ProfileUpdateResponseData>(
      API_ENDPOINTS.AUTH.PROFILE,
      updates
    );

    return response;
  }

  async changePassword(
    passwords: ChangePasswordRequest
  ): Promise<PasswordChangeResponse> {
    const response = await apiClient.put<null>(
      API_ENDPOINTS.AUTH.CHANGE_PASSWORD,
      passwords
    );

    return response;
  }
}

export const authService = new AuthService();

export const authQueries = {
  profile: () => ({
    queryKey: ["auth", "profile"],
    queryFn: async () => {
      const response = await authService.getProfile();
      return response.data;
    },
  }),
};

export const authMutations = {
  login: () => ({
    mutationFn: async (credentials: LoginRequest) => {
      const response = await authService.login(credentials);
      return response.data;
    },
  }),

  register: () => ({
    mutationFn: async (userData: RegisterRequest) => {
      const response = await authService.register(userData);
      return response.data;
    },
  }),

  logout: () => ({
    mutationFn: async () => {
      // No need to pass refreshToken - it's in the cookie
      const response = await authService.logout();
      return response;
    },
  }),

  updateProfile: () => ({
    mutationFn: async (updates: UpdateUserRequest) => {
      const response = await authService.updateProfile(updates);
      return response.data;
    },
  }),

  changePassword: () => ({
    mutationFn: async (passwords: ChangePasswordRequest) => {
      const response = await authService.changePassword(passwords);
      return response;
    },
  }),
};
