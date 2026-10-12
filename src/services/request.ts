import axios, { AxiosError } from 'axios';
import { authStore } from '@/stores/auth';
import type { ApiErrorBody } from './types';

/** 统一的业务错误：type 来自后端 errorBody，message 已本地化为中文时可直接用。 */
export class ApiError extends Error {
  readonly type: string;
  readonly status: number;

  constructor(type: string, message: string, status: number) {
    super(message);
    this.type = type;
    this.status = status;
  }
}

export const request = axios.create({
  baseURL: '/',
  timeout: 15_000,
});

request.interceptors.request.use((config) => {
  const { token } = authStore.getState();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

request.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status ?? 0;
    const body = error.response?.data;
    const type = body?.error?.type ?? (status === 0 ? 'NetworkError' : 'UnknownError');
    const message = body?.error?.message ?? '网络异常，请稍后重试';

    if (status === 401 && authStore.getState().token) {
      // 会话过期：清除本地 token 并回到登录页（登录页本身由守卫处理）。
      authStore.logout();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(new ApiError(type, message, status));
  },
);
