import { apiRequest } from './client';

export interface User {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  createdAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export async function register(
  data: RegisterRequest,
): Promise<User> {
  return apiRequest<User>('/auth/register', {
    config: {
      method: 'POST',
      data,
    },
  });
}

export async function login(
  data: LoginRequest,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/login', {
    config: {
      method: 'POST',
      data,
    },
  });
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<RefreshResponse> {
  return apiRequest<RefreshResponse>('/auth/refresh', {
    config: {
      method: 'POST',
      data: {
        refreshToken,
      },
    },
  });
}

export async function getCurrentUser(
  accessToken: string,
): Promise<User> {
  return apiRequest<User>('/auth/me', {
    token: accessToken,
    config: {
      method: 'GET',
    },
  });
}

export async function logout(
  refreshToken: string,
): Promise<void> {
  await apiRequest('/auth/logout', {
    config: {
      method: 'POST',
      data: {
        refreshToken,
      },
    },
  });
}