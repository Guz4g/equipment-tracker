import { useRef, useState } from 'react';
import { InventoryResult, Device } from '../types';
import { Upload, FileText, CheckCircle2, AlertCircle, PackageX, Copy } from 'lucide-react';

interface InventoryPageProps {
  onCompare: (file: File) => Promise<InventoryResult>;
  onView: (device: Device) => void;
}

export default function InventoryPage({ onCompare, onView }: InventoryPageProps) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<InventoryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File | null) => {
    setFile(f);
    setResult(null);
    setError(null);
  };

  const compare = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const r = await onCompare(file);
      setResult(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!result) return;
    const lines: string[] = [];
    lines.push('Секция;Инвентарный номер;Устройство;IP');
    result.matched.forEach(m =>
      lines.push(`Совпало;${m.inventoryNumber};${m.device.hostname};${m.device.ipAddress}`)
    );
    result.missing.forEach(inv => lines.push(`Нет в базе;${inv};;`));
    result.extra.forEach(d => lines.push(`Лишнее в базе;${d.inventoryNumber};${d.hostname};${d.ipAddress}`));
    if (result.duplicatesInFile.length) {
      lines.push('');
      lines.push('Дубликаты в файле');
      result.duplicatesInFile.forEach(d => lines.push(d));
    }
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Сверка инвентаризации
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Загрузите .txt файл со списком инвентарных номеров (по одному в строке) и нажмите «Сравнить».
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => inputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 text-gray-700 dark:text-gray-300"
          >
            <Upload size={18} />
            {file ? file.name : 'Выбрать .txt файл'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".txt"
            className="hidden"
            onChange={e => handleFile(e.target.files?.[0] ?? null)}
          />
          <button
            onClick={compare}
            disabled={!file || loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <FileText size={18} />
            {loading ? 'Сравнение...' : 'Сравнить'}
          </button>
        </div>
        {error && (
          <div className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-800 dark:text-red-300">
            {error}
          </div>
        )}
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummaryCard
              icon={<CheckCircle2 className="text-green-600" size={20} />}
              label="Совпало"
              value={result.matched.length}
              color="green"
            />
            <SummaryCard
              icon={<PackageX className="text-red-600" size={20} />}
              label="Нет в базе"
              value={result.missing.length}
              color="red"
            />
            <SummaryCard
              icon={<AlertCircle className="text-amber-600" size={20} />}
              label="Лишние в базе"
              value={result.extra.length}
              color="amber"
            />
            <SummaryCard
              icon={<Copy className="text-purple-600" size={20} />}
              label="Дубликаты в файле"
              value={result.duplicatesInFile.length}
              color="purple"
            />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white">Результаты</h3>
              <button
                onClick={downloadReport}
                className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                Скачать отчёт (CSV)
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Section title="Совпало" count={result.matched.length} color="green">
                {result.matched.map(m => (
                  <Row key={m.inventoryNumber} onClick={() => onView(m.device)}>
                    <span className="font-mono text-xs text-gray-500">{m.inventoryNumber}</span>
                    <span className="text-sm text-gray-900 dark:text-white">{m.device.hostname}</span>
                  </Row>
                ))}
              </Section>
              <Section title="Нет в базе" count={result.missing.length} color="red">
                {result.missing.map(inv => (
                  <Row key={inv}>
                    <span className="font-mono text-xs text-gray-500">{inv}</span>
                  </Row>
                ))}
              </Section>
              <Section title="Лишние в базе" count={result.extra.length} color="amber">
                {result.extra.map(d => (
                  <Row key={d.id} onClick={() => onView(d)}>
                    <span className="font-mono text-xs text-gray-500">
                      {d.inventoryNumber || '—'}
                    </span>
                    <span className="text-sm text-gray-900 dark:text-white">{d.hostname}</span>
                  </Row>
                ))}
              </Section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: JSX.Element;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      </div>
      <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
        {title} <span className="text-gray-400">({count})</span>
      </h4>
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700 max-h-80 overflow-y-auto">
        {count === 0 ? (
          <p className="p-3 text-xs text-gray-400">Пусто</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function Row({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <div
      className={`p-2 flex flex-col ${onClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30' : ''}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}