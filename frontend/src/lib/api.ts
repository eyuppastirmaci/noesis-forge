import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import {
  ApiResponse,
  SuccessResponse,
  ApiClientError,
  ApiErrorCode,
  HttpStatus,
  isSuccessResponse,
} from "@/types";
import { API_CONFIG } from "@/config/api";
import { getCookieValue } from "@/utils";

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = API_CONFIG.BASE_URL) {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: API_CONFIG.TIMEOUT,
      headers: API_CONFIG.HEADERS,
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor - add Authorization header from cookies
    this.client.interceptors.request.use(
      async (config) => {
        // Get access token from cookies
            const accessToken = getCookieValue('access_token');
    
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
        return config;
      },
      (error) => {
        console.error("[API] Request error:", error);
        return Promise.reject(error);
      }
    );

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
            // Retry the original request - cookies will be automatically included
            return this.client.request(error.config);
          } catch (refreshError) {
            // Handle refresh failure by clearing auth and redirecting
            this.handleAuthFailure();
            throw refreshError;
          }
        }

        // Transform and handle backend error response
        const apiResponse = this.transformResponse(response);
        if (apiResponse && !isSuccessResponse(apiResponse)) {
          const errorObj = apiResponse.error || {
            code: ApiErrorCode.INTERNAL_ERROR,
            message: "An unexpected error occurred",
          };
          throw new ApiClientError(errorObj, response.status, response);
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
        data: data.data,
      };
    }
  }

  private async refreshToken(): Promise<void> {
    try {
      const refreshToken = getCookieValue('refresh_token');
      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await axios.post(`${this.baseURL}/auth/refresh`, {
        refreshToken
      }, {
        withCredentials: true
      });

      // Tokens are handled by auth service when login/refresh is called
    } catch (error) {
      throw new Error("Your session has expired. Please login again.");
    }
  }

  private handleAuthFailure(): void {
    // Redirect to login page in browser environment
    if (typeof window !== "undefined") {
      window.location.href = "/auth/login";
    }
  }
  // HTTP methods (unchanged)
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