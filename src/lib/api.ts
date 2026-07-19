export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T | null;
  timestamp: string;
  requestId: string;
  error?: {
    code: string;
    details?: any;
  };
}

const BASE_API_URL = (typeof window !== 'undefined' && (window as any).VITE_BASE_API_URL) || 'http://localhost:3000/api/v1';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_API_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return {} as T;
  }

  const result: ApiResponse<T> = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || result.error?.code || 'Request failed');
  }

  return result.data as T;
}

export const api = {
  health: () => request<any>('/health'),

  auth: {
    login: (body: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    refresh: (body: any) => request<any>('/auth/refresh', { method: 'POST', body: JSON.stringify(body) }),
  },

  projects: {
    list: (params?: { limit?: number; page?: number }) => {
      const q = params ? `?${new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k,v])=>[k,String(v)]))).toString()}` : '';
      return request<any>(`/projects${q}`);
    },
    create: (body: any) => request<any>('/projects', { method: 'POST', body: JSON.stringify(body) }),
    get: (id: string) => request<any>(`/projects/${id}`),
    update: (id: string, body: any) => request<any>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: string) => request<any>(`/projects/${id}`, { method: 'DELETE' }),
    saveTechnologies: (id: string, body: any) => request<any>(`/projects/${id}/technologies`, { method: 'POST', body: JSON.stringify(body) }),
    getTechnologies: (id: string) => request<any>(`/projects/${id}/technologies`),
    saveAnswers: (id: string, body: any) => request<any>(`/projects/${id}/answers`, { method: 'POST', body: JSON.stringify(body) }),
    getAnswers: (id: string) => request<any>(`/projects/${id}/answers`),
    saveCanvas: (id: string, body: any) => request<any>(`/projects/${id}/canvas`, { method: 'POST', body: JSON.stringify(body) }),
    getCanvas: (id: string) => request<any>(`/projects/${id}/canvas`),
    getDocuments: (id: string) => request<any>(`/projects/${id}/documents`),
    getDocumentByType: (id: string, type: string) => request<any>(`/projects/${id}/documents/${type}`),
    getDocumentHistory: (id: string, type: string) => request<any>(`/projects/${id}/documents/${type}/history`),
    saveDocumentManual: (id: string, type: string, body: { content: string }) => request<any>(`/projects/${id}/documents/${type}`, { method: 'POST', body: JSON.stringify(body) }),
  },

  technologies: {
    list: () => request<any[]>('/technologies'),
    categories: () => request<any[]>('/technologies/categories'),
    get: (id: string) => request<any>(`/technologies/${id}`),
  },

  interview: {
    questions: (projectId?: string) => request<any[]>(`/interview/questions${projectId ? `?projectId=${projectId}` : ''}`),
  },

  generate: {
    canvas: (projectId: string, body?: any) => request<any>(`/generate/canvas/${projectId}`, { method: 'POST', body: JSON.stringify(body || {}) }),
    prd: (projectId: string, body?: any) => request<any>(`/generate/prd/${projectId}`, { method: 'POST', body: JSON.stringify(body || {}) }),
    architecture: (projectId: string, body?: any) => request<any>(`/generate/architecture/${projectId}`, { method: 'POST', body: JSON.stringify(body || {}) }),
    database: (projectId: string, body?: any) => request<any>(`/generate/database/${projectId}`, { method: 'POST', body: JSON.stringify(body || {}) }),
    api: (projectId: string, body?: any) => request<any>(`/generate/api/${projectId}`, { method: 'POST', body: JSON.stringify(body || {}) }),
    tasks: (projectId: string, body?: any) => request<any>(`/generate/tasks/${projectId}`, { method: 'POST', body: JSON.stringify(body || {}) }),
    prompt: (projectId: string, body?: any) => request<any>(`/generate/prompt/${projectId}`, { method: 'POST', body: JSON.stringify(body || {}) }),
  },

  admin: {
    dashboard: {
      stats: () => request<any>('/admin/dashboard/stats'),
      aiUsage: (days?: number) => request<any>(`/admin/dashboard/ai-usage?days=${days || 14}`),
      providerDistribution: () => request<any>('/admin/dashboard/provider-distribution'),
    },
    providers: {
      list: () => request<any[]>('/admin/providers'),
      create: (body: any) => request<any>('/admin/providers', { method: 'POST', body: JSON.stringify(body) }),
      update: (id: string, body: any) => request<any>(`/admin/providers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
      delete: (id: string) => request<any>(`/admin/providers/${id}`, { method: 'DELETE' }),
    },
    users: {
      list: () => request<any[]>('/admin/users'),
      create: (body: any) => request<any>('/admin/users', { method: 'POST', body: JSON.stringify(body) }),
      update: (id: string, body: any) => request<any>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
      delete: (id: string) => request<any>(`/admin/users/${id}`, { method: 'DELETE' }),
    },
    apiKeys: {
      list: (providerId?: string) => request<any[]>(`/admin/api-keys${providerId ? `?providerId=${providerId}` : ''}`),
      create: (body: any) => request<any>('/admin/api-keys', { method: 'POST', body: JSON.stringify(body) }),
      update: (id: string, body: any) => request<any>(`/admin/api-keys/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
      delete: (id: string) => request<any>(`/admin/api-keys/${id}`, { method: 'DELETE' }),
      resetQuota: (id: string) => request<any>(`/admin/api-keys/${id}/reset-quota`, { method: 'POST' }),
    },
    rotation: {
      get: () => request<any>('/admin/rotation'),
      update: (body: any) => request<any>('/admin/rotation', { method: 'PUT', body: JSON.stringify(body) }),
    },
    technologies: {
      list: (params?: any) => {
        const query = params ? new URLSearchParams(params).toString() : '';
        return request<any>(`/admin/technologies?${query}`);
      },
      create: (body: any) => request<any>('/admin/technologies', { method: 'POST', body: JSON.stringify(body) }),
      update: (id: string, body: any) => request<any>(`/admin/technologies/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
      delete: (id: string) => request<any>(`/admin/technologies/${id}`, { method: 'DELETE' }),
      toggle: (id: string, body: any) => request<any>(`/admin/technologies/${id}/toggle`, { method: 'PATCH', body: JSON.stringify(body) }),
    },
    questions: {
      list: () => request<any[]>('/admin/questions'),
      create: (body: any) => request<any>('/admin/questions', { method: 'POST', body: JSON.stringify(body) }),
      update: (id: string, body: any) => request<any>(`/admin/questions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
      delete: (id: string) => request<any>(`/admin/questions/${id}`, { method: 'DELETE' }),
    },
    promptTemplates: {
      list: () => request<any[]>('/admin/prompt-templates'),
      getByType: (type: string) => request<any[]>(`/admin/prompt-templates/${type}`),
      update: (id: string, body: any) => request<any>(`/admin/prompt-templates/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
      publish: (id: string) => request<any>(`/admin/prompt-templates/${id}/publish`, { method: 'POST' }),
    },
    monitoring: {
      realtime: () => request<any>('/admin/monitoring/realtime'),
      areaChart: () => request<any>('/admin/monitoring/area-chart'),
    },
    logs: {
      activity: (params?: any) => {
        const query = params ? new URLSearchParams(params).toString() : '';
        return request<any>(`/admin/logs/activity?${query}`);
      },
      requests: (params?: any) => {
        const query = params ? new URLSearchParams(params).toString() : '';
        return request<any>(`/admin/logs/requests?${query}`);
      },
    },
    settings: {
      get: () => request<any>('/admin/settings'),
      update: (body: any) => request<any>('/admin/settings', { method: 'PUT', body: JSON.stringify(body) }),
      getByKey: (key: string) => request<any>(`/admin/settings/${key}`),
      updateByKey: (key: string, body: any) => request<any>(`/admin/settings/${key}`, { method: 'PUT', body: JSON.stringify(body) }),
    },
  },
};
