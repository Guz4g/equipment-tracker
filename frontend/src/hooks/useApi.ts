import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Device,
  Group,
  Settings,
  ScanStatus,
  InventoryResult,
} from '../types';

const API = '/api';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    let msg = `Ошибка ${res.status}`;
    try {
      const body = await res.json();
      if (body && typeof body.error === 'string') msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function useApi() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const formOpenRef = useRef(false);

  const reload = useCallback(async () => {
    try {
      const [d, g] = await Promise.all([
        apiFetch<Device[]>('/equipment'),
        apiFetch<Group[]>('/groups'),
      ]);
      setDevices(d);
      setGroups(g);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // первичная загрузка + автообновление
  useEffect(() => {
    reload();
    const timer = setInterval(() => {
      if (!formOpenRef.current) reload();
    }, 30000);
    return () => clearInterval(timer);
  }, [reload]);

  const addDevice = useCallback(
    async (data: Omit<Device, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'lastActivity'>) => {
      await apiFetch<Device>('/equipment', {
        method: 'POST',
        body: JSON.stringify({ ...data, status: 'unknown', lastActivity: null }),
      });
      await reload();
    },
    [reload]
  );

  const updateDevice = useCallback(
    async (id: number, updates: Partial<Device>) => {
      const current = devices.find(d => d.id === id);
      if (!current) throw new Error('Устройство не найдено');
      const merged = { ...current, ...updates };
      await apiFetch<Device>(`/equipment/${id}`, {
        method: 'PUT',
        body: JSON.stringify(merged),
      });
      await reload();
    },
    [devices, reload]
  );

  const deleteDevice = useCallback(
    async (id: number) => {
      await apiFetch<void>(`/equipment/${id}`, { method: 'DELETE' });
      await reload();
    },
    [reload]
  );

  // группы
  const saveGroup = useCallback(
    async (name: string, id?: number) => {
      if (id) {
        await apiFetch<Group>(`/groups/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ name }),
        });
      } else {
        await apiFetch<Group>('/groups', {
          method: 'POST',
          body: JSON.stringify({ name }),
        });
      }
      await reload();
    },
    [reload]
  );

  const deleteGroup = useCallback(
    async (id: number) => {
      await apiFetch<void>(`/groups/${id}`, { method: 'DELETE' });
      await reload();
    },
    [reload]
  );

  // настройки
  const fetchSettings = useCallback(async (): Promise<Settings> => {
    return apiFetch<Settings>('/settings');
  }, []);

  const saveSettings = useCallback(async (s: Settings): Promise<Settings> => {
    return apiFetch<Settings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(s),
    });
  }, []);

  // сканирование
  const startScan = useCallback(async (from?: string, to?: string, method?: string) => {
    return apiFetch<ScanStatus>('/scan', {
      method: 'POST',
      body: JSON.stringify({ from, to, method }),
    });
  }, []);

  const stopScan = useCallback(async () => {
    return apiFetch<ScanStatus>('/scan/stop', { method: 'POST' });
  }, []);

  const fetchScanStatus = useCallback(async () => {
    return apiFetch<ScanStatus>('/scan/status');
  }, []);

  // инвентаризация
  const compareInventory = useCallback(async (file: File): Promise<InventoryResult> => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API}/inventory/compare`, { method: 'POST', body: form });
    if (!res.ok) {
      let msg = `Ошибка ${res.status}`;
      try {
        const body = await res.json();
        if (body?.error) msg = body.error;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
    return (await res.json()) as InventoryResult;
  }, []);

  const setFormOpen = useCallback((open: boolean) => {
    formOpenRef.current = open;
  }, []);

  return {
    devices,
    groups,
    loading,
    error,
    reload,
    addDevice,
    updateDevice,
    deleteDevice,
    saveGroup,
    deleteGroup,
    fetchSettings,
    saveSettings,
    startScan,
    stopScan,
    fetchScanStatus,
    compareInventory,
    setFormOpen,
  };
}