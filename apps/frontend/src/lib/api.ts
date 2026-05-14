// All backend API calls go through this file
// Members 5/6: import functions from here, never fetch() directly

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

function getToken(): string | null {
  // Token stored in memory via React context — not localStorage
  // TODO: Members 5/6 — replace with context value
  return null;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

// Auth
export const api = {
  auth: {
    me: () => request('/auth/me'),
    refresh: (token: string) => request('/auth/refresh', { method: 'POST', body: JSON.stringify({ token }) }),
    logout: () => request('/auth/logout', { method: 'POST' }),
  },
  incidents: {
    list: (params?: Record<string, string>) =>
      request(`/incidents?${new URLSearchParams(params)}`),
    get: (id: string) => request(`/incidents/${id}`),
    resolve: (id: string, body: unknown) =>
      request(`/incidents/${id}/resolve`, { method: 'POST', body: JSON.stringify(body) }),
    postmortem: (id: string) => request(`/incidents/${id}/postmortem`),
  },
  graph: {
    topology: () => request('/graph/topology'),
    blastRadius: (serviceId: string) => request(`/graph/blast-radius/${serviceId}`),
    service: (serviceId: string) => request(`/graph/services/${serviceId}`),
  },
  actions: {
    rollback: (body: unknown) =>
      request('/actions/rollback', { method: 'POST', body: JSON.stringify(body) }),
    status: (actionId: string) => request(`/actions/${actionId}`),
  },
};
