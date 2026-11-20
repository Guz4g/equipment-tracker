import React, { useState, useEffect } from 'react';
import { Device, CustomField, Group } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { X, Plus, Save, Trash2, Loader2, AlertCircle } from 'lucide-react';

interface DeviceFormProps {
  isOpen: boolean;
  groups: Group[];
  editingDevice?: Device | null;
  onClose: () => void;
  onSave: (
    data: Omit<Device, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'lastActivity'>
  ) => Promise<void>;
}

type FormState = Omit<Device, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'lastActivity'>;

const defaultForm: FormState = {
  hostname: '',
  domainName: '',
  ipAddress: '',
  macAddress: '',
  inventoryNumber: '',
  groupId: null,
  comment: '',
  customFields: [],
  os: '',
  location: '',
  department: '',
  responsible: '',
};

const IP_REGEX = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/;

export default function DeviceForm({
  isOpen,
  groups,
  editingDevice,
  onClose,
  onSave,
}: DeviceFormProps) {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [ipTouched, setIptouched] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editingDevice) {
      const { id, createdAt, updatedAt, status, lastActivity, ...rest } = editingDevice;
      setForm(rest);
    } else {
      setForm(defaultForm);
    }
    setServerError(null);
    setIptouched(false);
    setNewFieldLabel('');
    setNewFieldValue('');
  }, [isOpen, editingDevice]);

  if (!isOpen) return null;

  const ipValid = IP_REGEX.test(form.ipAddress);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setIptouched(true);
    if (!ipValid) return;
    setSaving(true);
    try {
      await onSave(form);
    } catch (err) {
      setServerError((err as Error).message || 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof FormState, value: string | number | null) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const addCustomField = () => {
    if (!newFieldLabel.trim()) return;
    const field: CustomField = {
      id: uuidv4(),
      label: newFieldLabel.trim(),
      value: newFieldValue.trim(),
    };
    setForm(prev => ({ ...prev, customFields: [...prev.customFields, field] }));
    setNewFieldLabel('');
    setNewFieldValue('');
  };

  const removeCustomField = (id: string) => {
    setForm(prev => ({ ...prev, customFields: prev.customFields.filter(f => f.id !== id) }));
  };

  const updateCustomFieldValue = (id: string, value: string) => {
    setForm(prev => ({
      ...prev,
      customFields: prev.customFields.map(f => (f.id === id ? { ...f, value } : f)),
    }));
  };

  const inputCls =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {editingDevice ? 'Редактировать устройство' : 'Добавить устройство'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            disabled={saving}
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {serverError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-300">{serverError}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Локальное имя *
              </label>
              <input
                type="text"
                required
                value={form.hostname}
                onChange={e => handleChange('hostname', e.target.value)}
                className={inputCls}
                placeholder="Бухгалтерия-ПК"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Имя в домене
              </label>
              <input
                type="text"
                value={form.domainName}
                onChange={e => handleChange('domainName', e.target.value)}
                className={inputCls}
                placeholder="WORKSTATION-01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                IP адрес *
              </label>
              <input
                type="text"
                required
                value={form.ipAddress}
                onChange={e => handleChange('ipAddress', e.target.value)}
                onBlur={() => setIptouched(true)}
                className={`${inputCls} ${
                  iptouched && !ipValid ? 'border-red-400 focus:ring-red-500' : ''
                }`}
                placeholder="192.168.1.100"
              />
              {iptouched && !ipValid && (
                <p className="text-xs text-red-500 mt-1">Введите корректный IPv4-адрес</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                MAC адрес
              </label>
              <input
                type="text"
                value={form.macAddress}
                onChange={e => handleChange('macAddress', e.target.value)}
                className={inputCls}
                placeholder="AA:BB:CC:DD:EE:FF"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Инвентарный номер
              </label>
              <input
                type="text"
                value={form.inventoryNumber}
                onChange={e => handleChange('inventoryNumber', e.target.value)}
                className={inputCls}
                placeholder="INV-001234"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Группа
              </label>
              <select
                value={form.groupId == null ? '' : String(form.groupId)}
                onChange={e =>
                  handleChange('groupId', e.target.value === '' ? null : Number(e.target.value))
                }
                className={inputCls}
              >
                <option value="">Без группы</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Операционная система
              </label>
              <input
                type="text"
                value={form.os}
                onChange={e => handleChange('os', e.target.value)}
                className={inputCls}
                placeholder="Windows 11 Pro"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Расположение
              </label>
              <input
                type="text"
                value={form.location}
                onChange={e => handleChange('location', e.target.value)}
                className={inputCls}
                placeholder="Офис 305"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Отдел
              </label>
              <input
                type="text"
                value={form.department}
                onChange={e => handleChange('department', e.target.value)}
                className={inputCls}
                placeholder="Бухгалтерия"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ответственный
              </label>
              <input
                type="text"
                value={form.responsible}
                onChange={e => handleChange('responsible', e.target.value)}
                className={inputCls}
                placeholder="Иванов И.И."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Комментарий
            </label>
            <textarea
              value={form.comment}
              onChange={e => handleChange('comment', e.target.value)}
              rows={3}
              className={`${inputCls} resize-y`}
              placeholder="Заметки об устройстве..."
            />
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Дополнительные поля
            </h3>
            {form.customFields.length > 0 && (
              <div className="space-y-2 mb-4">
                {form.customFields.map(field => (
                  <div key={field.id} className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[120px]">
                      {field.label}:
                    </span>
                    <input
                      type="text"
                      value={field.value}
                      onChange={e => updateCustomFieldValue(field.id, e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeCustomField(field.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newFieldLabel}
                onChange={e => setNewFieldLabel(e.target.value)}
                placeholder="Название поля"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
              <input
                type="text"
                value={newFieldValue}
                onChange={e => setNewFieldValue(e.target.value)}
                placeholder="Значение"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
              <button
                type="button"
                onClick={addCustomField}
                className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {editingDevice ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}