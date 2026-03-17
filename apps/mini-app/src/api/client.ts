const getBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined' && (window as unknown as { __API_BASE__?: string }).__API_BASE__) {
    return (window as unknown as { __API_BASE__: string }).__API_BASE__;
  }
  return '';
};

const base = getBaseUrl();

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${base}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string }).message || res.statusText);
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export interface UserMe {
  id: string;
  role: string;
  ownerProfile?: { id: string };
  workerProfile?: { id: string };
}

export interface PVZ {
  id: string;
  title: string;
  address: string;
  city: string;
  status: string;
}

export interface Shift {
  id: string;
  pvzId: string;
  ownerId: string;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  baseRate: number;
  currency: string;
  status: string;
  assignment?: { workerId: string };
}

export interface ShiftApplication {
  id: string;
  shiftId: string;
  workerId: string;
  proposedRate?: number;
  message?: string;
  status: string;
  createdAt: string;
  shift?: {
    id: string;
    title: string;
    startAt: string;
    endAt: string;
    baseRate: number;
    currency: string;
    status: string;
  };
  workerProfile?: {
    id: string;
    rating?: number;
    completedShiftsCount: number;
    reliabilityScore: number;
    user?: { fullName?: string };
  };
}

export interface NotificationEvent {
  id: string;
  eventType: string;
  payload: { shiftId?: string };
  createdAt: string;
}
