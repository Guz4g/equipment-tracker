import { useState } from 'react';
import { Group } from '../types';
import { Plus, Edit2, Trash2, Check, X, Layers } from 'lucide-react';

interface GroupsPageProps {
  groups: Group[];
  onSave: (name: string, id?: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export default function GroupsPage({ groups, onSave, onDelete }: GroupsPageProps) {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await onSave(newName.trim());
      setNewName('');
    } catch {
      /* toast уже показан */
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (g: Group) => {
    setEditingId(g.id);
    setEditName(g.name);
  };

  const saveEdit = async () => {
    if (!editName.trim() || editingId == null) return;
    setBusy(true);
    try {
      await onSave(editName.trim(), editingId);
      setEditingId(null);
    } catch {
      /* toast */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Layers size={20} className="text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Группы устройств</h2>
        </div>

        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Название новой группы"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            onKeyDown={e => e.key === 'Enter' && add()}
          />
          <button
            onClick={add}
            disabled={busy || !newName.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus size={18} />
            Добавить
          </button>
        </div>

        {groups.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Групп пока нет</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {groups.map(g => (
              <div key={g.id} className="flex items-center gap-3 py-3">
                {editingId === g.id ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      autoFocus
                    />
                    <button
                      onClick={saveEdit}
                      disabled={busy}
                      className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 font-medium text-gray-900 dark:text-white">{g.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                      {g.deviceCount ?? 0} устройств
                    </span>
                    <button
                      onClick={() => startEdit(g)}
                      className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            `Удалить группу "${g.name}"? Устройства останутся в базе без группы.`
                          )
                        ) {
                          onDelete(g.id);
                        }
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}