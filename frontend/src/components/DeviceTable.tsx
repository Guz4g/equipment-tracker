import { useMemo, useState } from 'react';
import { Device, Group } from '../types';
import { format, isValid } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Edit,
  Trash2,
  Eye,
  Monitor,
  Wifi,
  WifiOff,
  HelpCircle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';

type SortKey = 'hostname' | 'ipAddress' | 'inventoryNumber' | 'group' | 'lastActivity';
type SortOrder = 'asc' | 'desc';

interface DeviceTableProps {
  devices: Device[];
  groups: Group[];
  onEdit: (device: Device) => void;
  onDelete: (id: number) => void;
  onView: (device: Device) => void;
}

function getStatusBadge(status: Device['status']) {
  const styles = {
    online: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    offline: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    unknown: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
  };
  const labels = { online: 'Онлайн', offline: 'Оффлайн', unknown: 'Неизвестно' };
  const Icon = status === 'online' ? Wifi : status === 'offline' ? WifiOff : HelpCircle;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      <Icon size={14} />
      {labels[status]}
    </span>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (!isValid(d)) return '—';
  return format(d, 'dd MMM yyyy, HH:mm', { locale: ru });
}

export default function DeviceTable({ devices, groups, onEdit, onDelete, onView }: DeviceTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('hostname');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const groupName = (id: number | null): string => {
    if (id == null) return '—';
    return groups.find(g => g.id === id)?.name ?? '—';
  };

  const sorted = useMemo(() => {
    const arr = [...devices];
    arr.sort((a, b) => {
      let av: string;
      let bv: string;
      switch (sortKey) {
        case 'group':
          av = groupName(a.groupId);
          bv = groupName(b.groupId);
          break;
        case 'lastActivity':
          av = a.lastActivity ?? '';
          bv = b.lastActivity ?? '';
          break;
        default:
          av = (a[sortKey] ?? '').toString().toLowerCase();
          bv = (b[sortKey] ?? '').toString().toLowerCase();
      }
      if (av < bv) return sortOrder === 'asc' ? -1 : 1;
      if (av > bv) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [devices, groups, sortKey, sortOrder]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown size={12} className="opacity-30" />;
    return sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  if (devices.length === 0) {
    return (
      <div className="text-center py-16">
        <Monitor size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400">Нет устройств</h3>
        <p className="text-gray-400 dark:text-gray-500 mt-1">
          Добавьте первое устройство или запустите сканирование
        </p>
      </div>
    );
  }

  const th = (label: string, k: SortKey) => (
    <th
      className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
      onClick={() => toggleSort(k)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <SortIcon k={k} />
      </span>
    </th>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Статус
            </th>
            {th('Имя', 'hostname')}
            {th('IP', 'ipAddress')}
            {th('Инв. №', 'inventoryNumber')}
            {th('Группа', 'group')}
            {th('Активность', 'lastActivity')}
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Комментарий
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Действия
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {sorted.map(device => (
            <tr
              key={device.id}
              className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
              onClick={() => onView(device)}
            >
              <td className="px-4 py-3">{getStatusBadge(device.status)}</td>
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900 dark:text-white">{device.hostname}</div>
                {device.domainName && (
                  <div className="text-xs text-gray-500 font-mono">{device.domainName}</div>
                )}
              </td>
              <td className="px-4 py-3">
                <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-700 dark:text-gray-300">
                  {device.ipAddress}
                </code>
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-sm">
                {device.inventoryNumber || '—'}
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-sm">
                {groupName(device.groupId)}
              </td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm">
                {formatDate(device.lastActivity)}
              </td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm max-w-[200px] truncate">
                {device.comment || '—'}
              </td>
              <td className="px-4 py-3">
                <div
                  className="flex items-center justify-end gap-1"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={() => onView(device)}
                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                    title="Просмотр"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => onEdit(device)}
                    className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg"
                    title="Редактировать"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Удалить устройство "${device.hostname}"?`)) onDelete(device.id);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    title="Удалить"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}