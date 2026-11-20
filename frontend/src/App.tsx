import { useCallback, useEffect, useState } from 'react';
import {
  Server,
  Monitor,
  Search,
  LayoutGrid,
  List,
  Filter,
  Plus,
  Moon,
  Sun,
  RefreshCw,
  Download,
  ScanLine,
  Layers,
  ClipboardList,
  Settings as SettingsIcon,
  AlertTriangle,
} from 'lucide-react';
import { useApi } from './hooks/useApi';
import { Device, Group, Tab, ScanStatus } from './types';
import DeviceTable from './components/DeviceTable';
import DeviceForm from './components/DeviceForm';
import DeviceDetail from './components/DeviceDetail';
import GroupsPage from './components/GroupsPage';
import InventoryPage from './components/InventoryPage';
import SettingsPage from './components/SettingsPage';
import { ToastContainer, ToastItem, ToastKind } from './components/Toast';

type ViewMode = 'table' | 'cards';
type StatusFilter = 'all' | 'online' | 'offline' | 'unknown';

export default function App() {
  const api = useApi();
  const [tab, setTab] = useState<Tab>('equipment');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [groupFilter, setGroupFilter] = useState<number | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [scan, setScan] = useState<ScanStatus | null>(null);

  // тема
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  // отслеживание скана
  useEffect(() => {
    if (!scan?.running) return;
    const t = setInterval(async () => {
      try {
        const s = await api.fetchScanStatus();
        setScan(s);
        if (!s.running) {
          api.reload();
          toast('success', 'Сканирование завершено');
        }
      } catch {
        /* ignore */
      }
    }, 1000);
    return () => clearInterval(t);
  }, [scan?.running, api]);

  const toast = useCallback((kind: ToastKind, text: string) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, kind, text }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // фильтрация на клиенте
  const filteredDevices = api.devices.filter(d => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (groupFilter !== 'all' && d.groupId !== groupFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.hostname.toLowerCase().includes(q) ||
      d.domainName.toLowerCase().includes(q) ||
      d.ipAddress.toLowerCase().includes(q) ||
      d.inventoryNumber.toLowerCase().includes(q) ||
      d.comment.toLowerCase().includes(q)
    );
  });

  const openNew = () => {
    setEditingDevice(null);
    setIsFormOpen(true);
    api.setFormOpen(true);
  };
  const openEdit = (d: Device) => {
    setEditingDevice(d);
    setSelectedDevice(null);
    setIsFormOpen(true);
    api.setFormOpen(true);
  };
  const closeForm = () => {
    setIsFormOpen(false);
    setEditingDevice(null);
    api.setFormOpen(false);
  };

  const handleStartScan = async () => {
    try {
      const s = await api.startScan();
      setScan(s);
      toast('success', 'Сканирование запущено');
    } catch (e) {
      toast('error', (e as Error).message);
    }
  };

  const groupName = (id: number | null): string => {
    if (id == null) return '—';
    return api.groups.find(g => g.id === id)?.name ?? '—';
  };

  const tabs: { key: Tab; label: string; icon: JSX.Element }[] = [
    { key: 'equipment', label: 'Оборудование', icon: <Monitor size={16} /> },
    { key: 'groups', label: 'Группы', icon: <Layers size={16} /> },
    { key: 'inventory', label: 'Инвентаризация', icon: <ClipboardList size={16} /> },
    { key: 'settings', label: 'Настройки', icon: <SettingsIcon size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Server size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Учёт оборудования
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Управление устройствами в локальной сети
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDark(d => !d)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                title="Тема"
              >
                {dark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <a
                href="/api/export/csv"
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                title="Экспорт CSV"
              >
                <Download size={20} />
              </a>
              <button
                onClick={handleStartScan}
                disabled={scan?.running}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <ScanLine size={16} />
                <span className="hidden sm:inline">Сканировать</span>
              </button>
              <button
                onClick={openNew}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Добавить</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Индикатор скана */}
      {scan?.running && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-200 dark:border-emerald-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-3 text-sm">
            <RefreshCw size={16} className="text-emerald-600 animate-spin" />
            <span className="text-emerald-800 dark:text-emerald-300">
              Сканирование: {scan.done} / {scan.total} (онлайн: {scan.online})
            </span>
            <div className="flex-1 h-1.5 bg-emerald-200 dark:bg-emerald-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all"
                style={{ width: `${scan.total ? (scan.done / scan.total) * 100 : 0}%` }}
              />
            </div>
            <button
              onClick={async () => {
                try {
                  await api.stopScan();
                  toast('success', 'Остановка сканирования...');
                } catch (e) {
                  toast('error', (e as Error).message);
                }
              }}
              className="text-xs px-2 py-1 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 rounded"
            >
              Стоп
            </button>
          </div>
        </div>
      )}

      {/* Баннер ошибки подключения */}
      {api.error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-3 text-sm">
            <AlertTriangle size={16} className="text-red-600" />
            <span className="text-red-800 dark:text-red-300 flex-1">
              Ошибка подключения к серверу: {api.error}
            </span>
            <button
              onClick={() => api.reload()}
              className="text-xs px-2 py-1 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-300 rounded"
            >
              Повторить
            </button>
          </div>
        </div>
      )}

      {/* Вкладки */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.key
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {tab === 'equipment' && (
          <>
            {/* Статистика */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Всего', value: api.devices.length, color: 'blue' },
                { label: 'Онлайн', value: api.devices.filter(d => d.status === 'online').length, color: 'green' },
                { label: 'Оффлайн', value: api.devices.filter(d => d.status === 'offline').length, color: 'red' },
                { label: 'Неизвестно', value: api.devices.filter(d => d.status === 'unknown').length, color: 'gray' },
              ].map(s => (
                <div
                  key={s.label}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
                >
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Тулбар */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-4">
              <div className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Поиск по имени, IP, инв. номеру..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="all">Все статусы</option>
                  <option value="online">Онлайн</option>
                  <option value="offline">Оффлайн</option>
                  <option value="unknown">Неизвестно</option>
                </select>
                <select
                  value={String(groupFilter)}
                  onChange={e =>
                    setGroupFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
                  }
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="all">Все группы</option>
                  {api.groups.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-400'}`}
                  >
                    <List size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`p-1.5 rounded ${viewMode === 'cards' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-400'}`}
                  >
                    <LayoutGrid size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Контент */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              {api.loading ? (
                <div className="text-center py-16 text-gray-500">Загрузка...</div>
              ) : viewMode === 'table' ? (
                <DeviceTable
                  devices={filteredDevices}
                  groups={api.groups}
                  onEdit={openEdit}
                  onDelete={async id => {
                    try {
                      await api.deleteDevice(id);
                      toast('success', 'Устройство удалено');
                    } catch (e) {
                      toast('error', (e as Error).message);
                    }
                  }}
                  onView={setSelectedDevice}
                />
              ) : (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDevices.map(device => (
                    <DeviceCard
                      key={device.id}
                      device={device}
                      groupName={groupName(device.groupId)}
                      onView={() => setSelectedDevice(device)}
                    />
                  ))}
                  {filteredDevices.length === 0 && (
                    <div className="col-span-full text-center py-12">
                      <Monitor size={48} className="mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">Устройства не найдены</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Показано {filteredDevices.length} из {api.devices.length} устройств
            </div>
          </>
        )}

        {tab === 'groups' && (
          <GroupsPage
            groups={api.groups}
            onSave={async (name, id) => {
              try {
                await api.saveGroup(name, id);
                toast('success', id ? 'Группа обновлена' : 'Группа создана');
              } catch (e) {
                toast('error', (e as Error).message);
                throw e;
              }
            }}
            onDelete={async id => {
              try {
                await api.deleteGroup(id);
                toast('success', 'Группа удалена');
              } catch (e) {
                toast('error', (e as Error).message);
                throw e;
              }
            }}
          />
        )}

        {tab === 'inventory' && (
          <InventoryPage
            onCompare={async f => {
              try {
                return await api.compareInventory(f);
              } catch (e) {
                toast('error', (e as Error).message);
                throw e;
              }
            }}
            onView={setSelectedDevice}
          />
        )}

        {tab === 'settings' && (
          <SettingsPage
            fetchSettings={api.fetchSettings}
            saveSettings={async s => {
              const r = await api.saveSettings(s);
              toast('success', 'Настройки сохранены');
              return r;
            }}
            onError={msg => toast('error', msg)}
          />
        )}
      </main>

      <DeviceForm
        isOpen={isFormOpen}
        groups={api.groups}
        editingDevice={editingDevice}
        onClose={closeForm}
        onSave={async data => {
          try {
            if (editingDevice) {
              await api.updateDevice(editingDevice.id, data);
              toast('success', 'Устройство обновлено');
            } else {
              await api.addDevice(data as Omit<Device, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'lastActivity'>);
              toast('success', 'Устройство добавлено');
            }
            closeForm();
          } catch (e) {
            // пробрасываем наверх — форма покажет ошибку
            throw e;
          }
        }}
      />

      <DeviceDetail
        device={selectedDevice}
        groups={api.groups}
        onClose={() => setSelectedDevice(null)}
        onEdit={openEdit}
        onRefresh={async () => {
          try {
            if (selectedDevice) {
              await api.startScan(selectedDevice.ipAddress, selectedDevice.ipAddress, 'tcp');
              toast('success', 'Проверка устройства запущена');
              setTimeout(() => api.reload(), 3000);
            }
          } catch (e) {
            toast('error', (e as Error).message);
          }
        }}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

function DeviceCard({
  device,
  groupName,
  onView,
}: {
  device: Device;
  groupName: string;
  onView: () => void;
}) {
  const colors = {
    online: 'border-l-green-500',
    offline: 'border-l-red-500',
    unknown: 'border-l-gray-400',
  };
  const dots = {
    online: 'bg-green-500',
    offline: 'bg-red-500',
    unknown: 'bg-gray-400',
  };
  return (
    <div
      className={`bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 border-l-4 ${colors[device.status]} p-4 hover:shadow-md cursor-pointer`}
      onClick={onView}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2.5 h-2.5 rounded-full ${dots[device.status]}`} />
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{device.hostname}</h3>
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">IP:</span>
          <span className="font-mono text-gray-700 dark:text-gray-300">{device.ipAddress}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Инв. №:</span>
          <span className="text-gray-700 dark:text-gray-300">{device.inventoryNumber || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Группа:</span>
          <span className="text-gray-700 dark:text-gray-300">{groupName}</span>
        </div>
      </div>
    </div>
  );
}