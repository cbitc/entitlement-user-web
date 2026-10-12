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

/**
 * 后端返回非标准错误体时（例如代理回的空体 500、静态服务器的 HTML 404），
 * 只能靠状态码推断原因；这里给出可操作的提示，而不是笼统的「网络异常」。
 */
const describeFailure = (status: number): string => {
  if (status === 0) {
    return '无法连接服务器，请检查网络，并确认后端服务已启动';
  }
  if (status >= 500) {
    return `服务暂时不可用（HTTP ${status}），请稍后重试或确认后端服务已启动`;
  }
  return `请求失败（HTTP ${status}）`;
};

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
    const message = body?.error?.message ?? describeFailure(status);

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
