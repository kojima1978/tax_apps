import { apiClient, ApiError } from './client';

export function createCrudApi<T, C, U>(endpoint: string) {
  return {
    getAll: () => apiClient<T[]>(endpoint),
    getById: async (id: string): Promise<T | null> => {
      try {
        return await apiClient<T>(`${endpoint}/${id}`);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return null;
        }
        throw error;
      }
    },
    create: (data: C) =>
      apiClient<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: U) =>
      apiClient<T>(`${endpoint}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: string) =>
      apiClient<void>(`${endpoint}/${id}`, { method: 'DELETE' }),
  };
}
