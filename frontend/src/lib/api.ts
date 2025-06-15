import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import {
  ApiResponse,
  SuccessResponse,
  ApiClientError,
  ApiErrorCode,
  HttpStatus,
  AuthTokens,
  isSuccessResponse,
  STORAGE_KEYS,
} from "@/types";
import { API_CONFIG } from "@/config/api";

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = API_CONFIG.BASE_URL) {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: API_CONFIG.TIMEOUT,
      headers: API_CONFIG.HEADERS,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor - automatically adds authentication token
    this.client.interceptors.request.use(
      (config) => {
        // Add authentication token if available
        const token = this.getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
      },
      (error) => {
        console.error("[API] Request error:", error);
        return Promise.reject(error);
      }
    );

    // Response interceptor - handles response transformation and error processing
    // Response interceptor - handles response transformation and error processing
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        const apiResponse = this.transformResponse(response);

        if (isSuccessResponse(apiResponse)) {
          return { ...response, data: apiResponse };
        } else {
          const error = apiResponse.error || {
            code: ApiErrorCode.INTERNAL_ERROR,
            message: "An unexpected error occurred",
          };
          throw new ApiClientError(error, response.status, response);
        }
      },
      async (error) => {
        // Network error
        if (!error.response) {
          throw new ApiClientError(
            {
              code: ApiErrorCode.INTERNAL_ERROR,
              message: "Network error or server unavailable",
              details: error.message,
            },
            HttpStatus.SERVICE_UNAVAILABLE
          );
        }

        const { response } = error;

        if (response.status === 401 && !error.config._retry) {
          error.config._retry = true;

          try {
            await this.refreshToken();
            // Retry the original request with new token
            const token = this.getAccessToken();
            if (token) {
              error.config.headers.Authorization = `Bearer ${token}`;
              return this.client.request(error.config);
            }
          } catch (refreshError) {
            // Handle refresh failure by clearing auth and redirecting
            this.handleAuthFailure();
            throw refreshError;
          }
        }

        // Transform and handle backend error response
        const apiResponse = this.transformResponse(response);
        if (apiResponse && !isSuccessResponse(apiResponse)) {
          const error = apiResponse.error || {
            code: ApiErrorCode.INTERNAL_ERROR,
            message: "An unexpected error occurred",
          };
          throw new ApiClientError(error, response.status, response);
        }

        // Handle unexpected errors as fallback
        throw new ApiClientError(
          {
            code: ApiErrorCode.INTERNAL_ERROR,
            message: "An unexpected error occurred",
            details: error.message,
          },
          response.status || HttpStatus.INTERNAL_SERVER_ERROR,
          response
        );
      }
    );
  }

  private transformResponse(response: AxiosResponse): ApiResponse {
    const { data, status } = response;

    if (data && typeof data.success === "boolean") {
      return data;
    }

    if (status >= 200 && status < 300) {
      return {
        success: true,
        statusCode: status,
        timestamp: new Date().toISOString(),
        data: data,
        message: data.message,
      };
    } else {
      return {
        success: false,
        statusCode: status,
        timestamp: new Date().toISOString(),
        error: {
          code: data.code || ApiErrorCode.INTERNAL_ERROR,
          message: data.message || "An error occurred",
          details: data.error,
          validationErrors: data.error?.validationErrors,
        },
        data: data.data, // Include data field which may contain fieldErrors
      };
    }
  }

  // Token management
  private getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  private getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  private setTokens(tokens: AuthTokens): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
  }

  private clearTokens(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  }

  private async refreshToken(): Promise<void> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const response = await axios.post(`${this.baseURL}/auth/refresh`, {
        refreshToken,
      });

      const tokens = response.data.tokens || response.data.data.tokens;
      this.setTokens(tokens);
    } catch (error) {
      this.clearTokens();
      throw error;
    }
  }

  private handleAuthFailure(): void {
    this.clearTokens();

    // Redirect to login page in browser environment
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }

  // Public methods
  public setAuthTokens(tokens: AuthTokens): void {
    this.setTokens(tokens);
  }

  public clearAuth(): void {
    this.clearTokens();
  }

  // HTTP methods
  async get<T>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<SuccessResponse<T>> {
    const response = await this.client.get<SuccessResponse<T>>(url, config);
    return response.data;
  }

  async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<SuccessResponse<T>> {
    const response = await this.client.post<SuccessResponse<T>>(
      url,
      data,
      config
    );
    return response.data;
  }

  async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<SuccessResponse<T>> {
    const response = await this.client.put<SuccessResponse<T>>(
      url,
      data,
      config
    );
    return response.data;
  }

  async patch<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<SuccessResponse<T>> {
    const response = await this.client.patch<SuccessResponse<T>>(
      url,
      data,
      config
    );
    return response.data;
  }

  async delete<T>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<SuccessResponse<T>> {
    const response = await this.client.delete<SuccessResponse<T>>(url, config);
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<SuccessResponse<any>> {
    return this.get("/health");
  }
}

// Singleton instance
export const apiClient = new ApiClient();

// Export for testing
export { ApiClient };
