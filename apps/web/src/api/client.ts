import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

import {
  clearAuth,
  getRefreshToken,
  updateAuthTokens,
} from './auth-storage';

const API_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

interface ApiRequestOptions {
  token?: string;
  config?: AxiosRequestConfig;
}

interface RetryableRequestConfig
  extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await apiClient.post<{
    accessToken: string;
    refreshToken: string;
  }>('/auth/refresh', {
    refreshToken,
  });

  updateAuthTokens(
    response.data.accessToken,
    response.data.refreshToken,
  );

  return response.data.accessToken;
}

apiClient.interceptors.request.use(
  (config) => {
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
);

apiClient.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest =
      error.config as RetryableRequestConfig | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const isUnauthorized =
      error.response?.status === 401;

    const isRefreshRequest =
      originalRequest.url === '/auth/refresh';

    if (
      !isUnauthorized ||
      originalRequest._retry ||
      isRefreshRequest
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newAccessToken =
        await refreshPromise;

      originalRequest.headers.set(
        'Authorization',
        `Bearer ${newAccessToken}`,
      );

      return apiClient(originalRequest);
    } catch (refreshError) {
      clearAuth();

      window.location.href = '/login';

      return Promise.reject(refreshError);
    }
  },
);

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { token, config } = options;

  try {
    const response = await apiClient.request<T>({
      url: path,
      ...config,
      headers: {
        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
        ...config?.headers,
      },
    });

    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      const data = error.response?.data;

      if (
        data &&
        typeof data === 'object' &&
        'message' in data
      ) {
        const message = data.message;

        if (Array.isArray(message)) {
          throw new Error(
            message.join(', '),
          );
        }

        throw new Error(String(message));
      }

      if (typeof data === 'string') {
        throw new Error(data);
      }

      if (error.response) {
        throw new Error(
          `Request failed with status ${error.response.status}`,
        );
      }

      throw new Error(
        'Unable to connect to the API server',
      );
    }

    throw new Error('Something went wrong');
  }
}