import { Device, Group } from '../types';
import { format, isValid } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  X,
  Edit,
  Wifi,
  WifiOff,
  HelpCircle,
  MapPin,
  User,
  Building2,
  HardDrive,
  Calendar,
  MessageSquare,
  ScanLine,
  Tag,
  Layers,
} from 'lucide-react';
import { useState } from 'react';

interface DeviceDetailProps {
  device: Device | null;
  groups: Group[];
  onClose: () => void;
  onEdit: (device: Device) => void;
  onRefresh: () => Promise<void>;
}

function getStatusInfo(status: Device['status']) {
  switch (status) {
    case 'online':
      return {
        bg: 'bg-green-500',
        ring: 'ring-green-200',
        text: 'text-green-600',
        label: 'Онлайн',
        Icon: Wifi,
        pulse: true,
      };
    case 'offline':
      return {
        bg: 'bg-red-500',
        ring: 'ring-red-200',
        text: 'text-red-600',
        label: 'Оффлайн',
        Icon: WifiOff,
        pulse: false,
      };
    default:
      return {
        bg: 'bg-gray-400',
        ring: 'ring-gray-200',
        text: 'text-gray-500',
        label: 'Неизвестно',
        Icon: HelpCircle,
        pulse: false,
      };
  }
}

function formatDate(iso: string | null, fmt = 'dd MMMM yyyy, HH:mm'): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (!isValid(d)) return '—';
  return format(d, fmt, { locale: ru });
}

export default function DeviceDetail({
  device,
  groups,
  onClose,
  onEdit,
  onRefresh,
}: DeviceDetailProps) {
  const [checking, setChecking] = useState(false);
  if (!device) return null;

  const st = getStatusInfo(device.status);
  const groupName = device.groupId != null
    ? groups.find(g => g.id === device.groupId)?.name ?? '—'
    : '—';

  const handleCheck = async () => {
    setChecking(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setChecking(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${st.bg} ring-4 ${st.ring} ${
                st.pulse ? 'animate-pulse' : ''
              }`}
            />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{device.hostname}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(device)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-amber-500"
              title="Редактировать"
            >
              <Edit size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <X size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <st.Icon size={20} className={st.text} />
            <span className={`font-medium ${st.text}`}>{st.label}</span>
            <button
              onClick={handleCheck}
              disabled={checking}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              <ScanLine size={14} className={checking ? 'animate-pulse' : ''} />
              {checking ? 'Проверка...' : 'Проверить сейчас'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Info label="Имя в домене" value={device.domainName || '—'} mono />
            <Info label="IP адрес" value={device.ipAddress} mono />
            <Info label="MAC адрес" value={device.macAddress || '—'} mono />
            <Info label="ОС" value={device.os || '—'} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 flex items-center gap-2">
              <Tag size={16} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Инв. номер</p>
                <p className="text-sm text-gray-900 dark:text-white">{device.inventoryNumber || '—'}</p>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 flex items-center gap-2">
              <Layers size={16} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Группа</p>
                <p className="text-sm text-gray-900 dark:text-white">{groupName}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {device.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin size={16} className="text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">{device.location}</span>
              </div>
            )}
            {device.department && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 size={16} className="text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">{device.department}</span>
              </div>
            )}
            {device.responsible && (
              <div className="flex items-center gap-2 text-sm">
                <User size={16} className="text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">{device.responsible}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Calendar size={16} className="text-gray-400" />
            <span className="text-gray-500 dark:text-gray-400">Последняя активность:</span>
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              {formatDate(device.lastActivity)}
            </span>
          </div>

          {device.comment && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={16} className="text-blue-500" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  Комментарий
                </span>
              </div>
              <p className="text-sm text-blue-800 dark:text-blue-300 whitespace-pre-wrap">
                {device.comment}
              </p>
            </div>
          )}

          {device.customFields.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <HardDrive size={16} />
                Дополнительные поля
              </h3>
              <div className="space-y-2">
                {device.customFields.map(field => (
                  <div key={field.id} className="flex items-start gap-2">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[140px]">
                      {field.label}:
                    </span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {field.value || '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 text-xs text-gray-400 dark:text-gray-500 space-y-1">
            <p>Создано: {formatDate(device.createdAt, 'dd.MM.yyyy HH:mm')}</p>
            <p>Обновлено: {formatDate(device.updatedAt, 'dd.MM.yyyy HH:mm')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className={`text-sm text-gray-900 dark:text-white ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}