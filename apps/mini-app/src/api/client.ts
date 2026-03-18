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
  const hasBody = options.body !== undefined && options.body !== null && String(options.body).length > 0;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
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
  switchRole: (input: SwitchRoleInput) =>
    request<SwitchRoleResponse>('/users/switch-role', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  upsertOwnerProfile: (input: UpsertOwnerProfileInput) =>
    request<unknown>('/users/owner-profile', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  upsertWorkerProfile: (input: UpsertWorkerProfileInput) =>
    request<unknown>('/users/worker-profile', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  deleteAccount: (input: DeleteAccountInput) => {
    const qs = new URLSearchParams();
    qs.set('userId', input.userId);
    if (input.telegramId) qs.set('telegramId', String(input.telegramId));
    return request<DeleteAccountResponse>(`/users/me?${qs.toString()}`, { method: 'DELETE' });
  },
};

export type TargetRole = 'owner' | 'worker';

export interface UserMe {
  id: string;
  role: string;
  status?: string;
  telegramId?: string | null;
  fullName?: string;
  phone?: string | null;
  ownerProfile?: OwnerProfile | null;
  workerProfile?: WorkerProfile | null;
}

export interface OwnerProfile {
  id: string;
  companyName?: string | null;
  contactName: string;
  contactPhone: string;
}

export interface WorkerProfile {
  id: string;
  city: string;
  expectedRate?: number | null;
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

export interface SwitchRoleInput {
  userId: string;
  targetRole: TargetRole;
}

export interface SwitchRoleResponse extends UserMe {
  nextStep?: string;
}

export interface UpsertOwnerProfileInput {
  userId: string;
  contactName: string;
  contactPhone: string;
  companyName?: string | null;
}

export interface UpsertWorkerProfileInput {
  userId: string;
  city: string;
  expectedRate?: number | null;
  experienceSummary?: string | null;
}

export interface DeleteAccountInput {
  userId: string;
  telegramId?: string | null;
}

export interface DeleteAccountResponse {
  ok: boolean;
  userId: string;
  status: string;
}
