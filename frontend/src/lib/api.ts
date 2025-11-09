import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import {
  ApiResponse,
  SuccessResponse,
  ApiClientError,
  HttpStatus,
  isSuccessResponse,
} from "@/types";
import { API_CONFIG } from "@/config/api";
import { getCookieValue, setCookie, deleteCookie } from "@/utils";

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;
  private isRefreshing: boolean = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
  }> = [];

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

  private processQueue(error: any, token: string | null = null): void {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });

    this.failedQueue = [];
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        const token = getCookieValue('access_token');
        if (token) {
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
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        const apiResponse = this.transformResponse(response);

        if (isSuccessResponse(apiResponse)) {
          return { ...response, data: apiResponse };
        } else {
          const error = apiResponse.error || {
            code: "INTERNAL_ERROR",
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
              code: "INTERNAL_ERROR",
              message: "Network error or server unavailable",
              details: error.message,
            },
            HttpStatus.SERVICE_UNAVAILABLE
          );
        }

        const { response } = error;
        const originalRequest = error.config;

        // Handle 401 errors with token refresh
        if (response.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // If already refreshing, queue this request
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return this.client.request(originalRequest);
              })
              .catch((err) => {
                return Promise.reject(err);
              });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newAccessToken = await this.refreshToken();
            
            // Update the Authorization header with the new token
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            
            // Process queued requests
            this.processQueue(null, newAccessToken);
            
            // Retry the original request with the new token
            return this.client.request(originalRequest);
          } catch (refreshError) {
            // Process queued requests with error
            this.processQueue(refreshError, null);
            
            // Handle refresh failure by clearing auth and redirecting
            this.handleAuthFailure();
            throw refreshError;
          } finally {
            this.isRefreshing = false;
          }
        }

        // Transform and handle backend error response
        const apiResponse = this.transformResponse(response);
        if (apiResponse && !isSuccessResponse(apiResponse)) {
          const errorObj = apiResponse.error || {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred",
          };
          throw new ApiClientError(errorObj, response.status, response);
        }

        // Handle unexpected errors as fallback
        throw new ApiClientError(
          {
            code: "INTERNAL_ERROR",
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
          code: data.code || "INTERNAL_ERROR",
          message: data.message || "An error occurred",
          details: data.error,
          validationErrors: data.error?.validationErrors,
        },
        data: data.data,
      };
    }
  }

  private async refreshToken(): Promise<string> {
    try {
      const refreshToken = getCookieValue('refresh_token');
      if (!refreshToken) {
        console.error("No refresh token available");
        throw new Error("No refresh token available");
      }

      console.log("clearAttempting to refresh token...");
      const response = await axios.post(`${this.baseURL}/auth/refresh`, {
        refreshToken
      }, {
        withCredentials: true
      });

      // Update cookies with new tokens from response
      if (response.data?.data?.tokens) {
        const { accessToken, refreshToken: newRefreshToken, expiresIn } = response.data.data.tokens;
        
        // Set new access token cookie
        setCookie('access_token', accessToken, { 
          maxAge: expiresIn 
        });
        
        // Set new refresh token cookie (7 days)
        const refreshMaxAge = 7 * 24 * 60 * 60;
        setCookie('refresh_token', newRefreshToken, { 
          maxAge: refreshMaxAge 
        });
        
        console.log("[API] Token refreshed successfully");
        // Return the new access token
        return accessToken;
      }
      
      console.error("[API] No tokens in refresh response");
      throw new Error("No tokens in refresh response");
    } catch (error: any) {
      console.error("[API] Token refresh failed:", error.message);
      throw new Error("Your session has expired. Please login again.");
    }
  }

  private handleAuthFailure(): void {
    // Clear auth cookies
    deleteCookie('access_token');
    deleteCookie('refresh_token');
    
    // Redirect to login page in browser environment
    if (typeof window !== "undefined") {
      window.location.href = "/auth/login";
    }
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

  // Processing Queue endpoints
  async getProcessingQueue(limit: number = 10, offset: number = 0): Promise<SuccessResponse<any>> {
    return this.get(`/documents/processing-queue?limit=${limit}&offset=${offset}`);
  }

  async getDocumentProcessingStatus(documentId: string): Promise<SuccessResponse<any>> {
    return this.get(`/documents/${documentId}/processing-status`);
  }
}

// Singleton instance
export const apiClient = new ApiClient();

// Export for testing
export { ApiClient };
