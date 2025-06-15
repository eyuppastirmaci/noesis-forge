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
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponseData>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );

    if (response.data.tokens) {
      apiClient.setAuthTokens({
        accessToken: response.data.tokens.accessToken,
        refreshToken: response.data.tokens.refreshToken,
        tokenType: response.data.tokens.tokenType || "Bearer",
        expiresIn: response.data.tokens.expiresIn || 3600,
      });
    }

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

    if (response.data.tokens) {
      apiClient.setAuthTokens({
        accessToken: response.data.tokens.accessToken,
        refreshToken: response.data.tokens.refreshToken,
        tokenType: response.data.tokens.tokenType || "Bearer",
        expiresIn: response.data.tokens.expiresIn || 3600,
      });
    }

    return response;
  }

  async logout(refreshToken: string): Promise<LogoutResponse> {
    try {
      const response = await apiClient.post<null>(API_ENDPOINTS.AUTH.LOGOUT, {
        refreshToken,
      });

      return response;
    } finally {
      apiClient.clearAuth();
    }
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
    mutationFn: async (refreshToken: string) => {
      const response = await authService.logout(refreshToken);
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
