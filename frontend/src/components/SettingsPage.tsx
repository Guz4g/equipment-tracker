import { useEffect, useState } from 'react';
import { Settings, WhitelistEntry } from '../types';
import { Save, Plus, Trash2, AlertTriangle, Loader2 } from 'lucide-react';

interface SettingsPageProps {
  fetchSettings: () => Promise<Settings>;
  saveSettings: (s: Settings) => Promise<Settings>;
  onError: (msg: string) => void;
}

export default function SettingsPage({ fetchSettings, saveSettings, onError }: SettingsPageProps) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [newIp, setNewIp] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [clientIp, setClientIp] = useState<string>('');

  useEffect(() => {
    fetchSettings()
      .then(setSettings)
      .catch(e => onError((e as Error).message));
    fetch('/api/health')
      .then(r => r.json())
      .then(d => setClientIp(d.client ?? ''))
      .catch(() => {});
  }, [fetchSettings, onError]);

  if (!settings) {
    return <div className="text-center py-16 text-gray-500">Загрузка настроек...</div>;
  }

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => (prev ? { ...prev, [key]: value } : prev));
  };

  const addWhitelist = () => {
    if (!newIp.trim()) return;
    const entry: WhitelistEntry = {
      id: -Date.now(),
      ipCidr: newIp.trim(),
      description: newDesc.trim(),
    };
    update('whitelist', [...settings.whitelist, entry]);
    setNewIp('');
    setNewDesc('');
  };

  const removeWhitelist = (id: number) => {
    update('whitelist', settings.whitelist.filter(w => w.id !== id));
  };

  const save = async () => {
    setSaving(true);
    try {
      const r = await saveSettings(settings);
      setSettings(r);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white';

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Настройки сканирования
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Диапазон IP — от
            </label>
            <input
              type="text"
              value={settings.scanRangeFrom}
              onChange={e => update('scanRangeFrom', e.target.value)}
              className={inputCls}
              placeholder="192.168.1.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Диапазон IP — до
            </label>
            <input
              type="text"
              value={settings.scanRangeTo}
              onChange={e => update('scanRangeTo', e.target.value)}
              className={inputCls}
              placeholder="192.168.1.254"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Метод сканирования
            </label>
            <select
              value={settings.scanMethod}
              onChange={e => update('scanMethod', e.target.value as 'tcp' | 'icmp')}
              className={inputCls}
            >
              <option value="tcp">TCP (рекомендуется)</option>
              <option value="icmp">ICMP (требует прав администратора)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Таймаут, мс
            </label>
            <input
              type="number"
              min={100}
              value={settings.scanTimeoutMs}
              onChange={e => update('scanTimeoutMs', Number(e.target.value))}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Интервал автопроверки, мин
            </label>
            <input
              type="number"
              min={1}
              value={settings.scanIntervalMinutes}
              onChange={e => update('scanIntervalMinutes', Number(e.target.value))}
              className={inputCls}
            />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoScanEnabled}
                onChange={e => update('autoScanEnabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
            <span className="text-sm text-gray-700 dark:text-gray-300">Автосканирование</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={18} className="text-amber-500" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Белый список IP</h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          Ваш IP: <code className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{clientIp || '...'}</code>
        </p>
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">
          Не удалите свой собственный IP — потеряете доступ к приложению.
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newIp}
            onChange={e => setNewIp(e.target.value)}
            placeholder="IP или CIDR (192.168.1.0/24)"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <input
            type="text"
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            placeholder="Описание"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <button
            onClick={addWhitelist}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {settings.whitelist.map(w => (
            <div key={w.id} className="flex items-center gap-3 py-2">
              <code className="font-mono text-sm text-gray-900 dark:text-white">{w.ipCidr}</code>
              <span className="text-sm text-gray-500 dark:text-gray-400 flex-1">{w.description}</span>
              <button
                onClick={() => removeWhitelist(w.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Сохранить настройки
        </button>
      </div>
    </div>
  );
}