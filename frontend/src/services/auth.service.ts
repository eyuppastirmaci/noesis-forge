import { apiClient } from "@/lib/api";
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  RefreshTokenResponse,
  LogoutResponse,
  ProfileResponse,
  UpdateUserRequest,
  ProfileUpdateResponse,
  ChangePasswordRequest,
  PasswordChangeResponse,
  API_ENDPOINTS,
} from "@/types";

export class AuthService {
  /**
   * User login
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );

    // Token'ları client'a kaydet
    if (response.data.tokens) {
      apiClient.setAuthTokens({
        accessToken: response.data.tokens.accessToken,
        refreshToken: response.data.tokens.refreshToken,
      });
    }

    return response.data;
  }

  /**
   * User registration
   */
  async register(userData: RegisterRequest): Promise<RegisterResponse> {
    const response = await apiClient.post<RegisterResponse>(
      API_ENDPOINTS.AUTH.REGISTER,
      userData
    );

    return response.data;
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const response = await apiClient.post<RefreshTokenResponse>(
      API_ENDPOINTS.AUTH.REFRESH,
      { refreshToken }
    );

    // Yeni token'ları kaydet
    if (response.data.tokens) {
      apiClient.setAuthTokens({
        accessToken: response.data.tokens.accessToken,
        refreshToken: response.data.tokens.refreshToken,
      });
    }

    return response.data;
  }

  /**
   * User logout
   */
  async logout(refreshToken: string): Promise<LogoutResponse> {
    try {
      const response = await apiClient.post<LogoutResponse>(
        API_ENDPOINTS.AUTH.LOGOUT,
        { refreshToken }
      );

      return response.data;
    } finally {
      apiClient.clearAuth();
    }
  }

  /**
   * Get user profile
   */
  async getProfile(): Promise<ProfileResponse> {
    const response = await apiClient.get<ProfileResponse>(
      API_ENDPOINTS.AUTH.PROFILE
    );

    return response.data;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    updates: UpdateUserRequest
  ): Promise<ProfileUpdateResponse> {
    const response = await apiClient.put<ProfileUpdateResponse>(
      API_ENDPOINTS.AUTH.PROFILE,
      updates
    );

    return response.data;
  }

  /**
   * Change password
   */
  async changePassword(
    passwords: ChangePasswordRequest
  ): Promise<PasswordChangeResponse> {
    const response = await apiClient.put<PasswordChangeResponse>(
      API_ENDPOINTS.AUTH.CHANGE_PASSWORD,
      passwords
    );

    return response.data;
  }
}

// Singleton instance
export const authService = new AuthService();

// React Query hooks için service wrapper'ları
export const authQueries = {
  profile: () => ({
    queryKey: ["auth", "profile"],
    queryFn: () => authService.getProfile(),
  }),
};

export const authMutations = {
  login: () => ({
    mutationFn: (credentials: LoginRequest) => authService.login(credentials),
  }),

  register: () => ({
    mutationFn: (userData: RegisterRequest) => authService.register(userData),
  }),

  logout: () => ({
    mutationFn: (refreshToken: string) => authService.logout(refreshToken),
  }),

  updateProfile: () => ({
    mutationFn: (updates: UpdateUserRequest) =>
      authService.updateProfile(updates),
  }),

  changePassword: () => ({
    mutationFn: (passwords: ChangePasswordRequest) =>
      authService.changePassword(passwords),
  }),
};
