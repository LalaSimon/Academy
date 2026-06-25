import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token!),
  );
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);

    const config = error.config as (typeof error.config & { _retry?: boolean }) | undefined;

    // Przepuszczamy błędy inne niż 401, już ponowione requesty oraz endpointy auth
    // (login/refresh same muszą propagować 401 bez próby odświeżenia tokenu)
    const isAuthEndpoint = config?.url?.startsWith('/auth/');
    if (error.response?.status !== 401 || config?._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    // Kolejka — gdy refresh już trwa, czekamy na jego wynik
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        if (config?.headers) config.headers.Authorization = `Bearer ${token}`;
        return api(config!);
      }).catch((err) => Promise.reject(err));
    }

    config!._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post<{ accessToken: string }>(
        '/api/v1/auth/refresh',
        {},
        { withCredentials: true },
      );
      useAuthStore.getState().setAccessToken(data.accessToken);
      processQueue(null, data.accessToken);
      if (config?.headers) config.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(config!);
    } catch (refreshError) {
      processQueue(refreshError, null);
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
