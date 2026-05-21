import { useState } from 'react';
import { Plus, Trash2, Save, X, AlertCircle, CheckCircle, Copy } from 'lucide-react';

export type ColumnType = 'text' | 'select' | 'date' | 'number' | 'email';

export interface BatchColumn<T> {
  key: keyof T;
  label: string;
  type: ColumnType;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  width?: string;
  defaultValue?: string | number;
}

interface BatchEntryTableProps<T extends Record<string, unknown>> {
  columns: BatchColumn<T>[];
  onSave: (rows: T[]) => Promise<{ success: number; errors: string[] }>;
  onClose: () => void;
  title: string;
  emptyRow: () => T;
  initialRows?: number;
}

function CellInput<T extends Record<string, unknown>>({
  col,
  value,
  onChange,
  hasError,
}: {
  col: BatchColumn<T>;
  value: unknown;
  onChange: (v: string) => void;
  hasError: boolean;
}) {
  const base = `w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition ${
    hasError ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white hover:border-slate-300'
  }`;

  if (col.type === 'select') {
    return (
      <select value={String(value ?? '')} onChange={e => onChange(e.target.value)} className={base}>
        <option value="">—</option>
        {col.options?.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  }

  return (
    <input
      type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : col.type === 'email' ? 'email' : 'text'}
      value={String(value ?? '')}
      onChange={e => onChange(e.target.value)}
      placeholder={col.placeholder}
      className={base}
    />
  );
}

export default function BatchEntryTable<T extends Record<string, unknown>>({
  columns,
  onSave,
  onClose,
  title,
  emptyRow,
  initialRows = 5,
}: BatchEntryTableProps<T>) {
  const [rows, setRows] = useState<T[]>(() =>
    Array.from({ length: initialRows }, emptyRow)
  );
  const [errors, setErrors] = useState<Record<number, Set<string>>>({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);

  const updateCell = (rowIdx: number, key: keyof T, value: string) => {
    setRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, [key]: value } : r));
    setErrors(prev => {
      const next = { ...prev };
      if (next[rowIdx]) {
        next[rowIdx] = new Set([...next[rowIdx]].filter(k => k !== key));
        if (next[rowIdx].size === 0) delete next[rowIdx];
      }
      return next;
    });
  };

  const addRows = (n = 1) => {
    setRows(prev => [...prev, ...Array.from({ length: n }, emptyRow)]);
  };

  const removeRow = (idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
    setErrors(prev => {
      const next: Record<number, Set<string>> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const ki = parseInt(k);
        if (ki < idx) next[ki] = v;
        else if (ki > idx) next[ki - 1] = v;
      });
      return next;
    });
  };

  const duplicateRow = (idx: number) => {
    setRows(prev => {
      const copy = [...prev];
      copy.splice(idx + 1, 0, { ...prev[idx] });
      return copy;
    });
  };

  const isRowEmpty = (row: T) =>
    columns.every(col => !row[col.key] || String(row[col.key]).trim() === '');

  const validate = (): boolean => {
    const newErrors: Record<number, Set<string>> = {};
    rows.forEach((row, idx) => {
      if (isRowEmpty(row)) return;
      columns.forEach(col => {
        if (col.required && (!row[col.key] || String(row[col.key]).trim() === '')) {
          if (!newErrors[idx]) newErrors[idx] = new Set();
          newErrors[idx].add(String(col.key));
        }
      });
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const filled = rows.filter(r => !isRowEmpty(r));
    if (filled.length === 0) return;
    setSaving(true);
    setResult(null);
    const res = await onSave(filled);
    setSaving(false);
    setResult(res);
    if (res.errors.length === 0) {
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  const filledCount = rows.filter(r => !isRowEmpty(r)).length;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div>
            <h3 className="font-semibold text-slate-900 text-base">Saisie par lots — {title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Remplissez plusieurs lignes, puis cliquez sur Enregistrer tout.
              Les lignes vides sont ignorées.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* Result banner */}
        {result && (
          <div className={`mx-6 mt-4 flex items-start gap-3 px-4 py-3 rounded-xl text-sm shrink-0 ${
            result.errors.length === 0
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-amber-50 border border-amber-200 text-amber-800'
          }`}>
            {result.errors.length === 0
              ? <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
              : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
            <div>
              <p className="font-medium">
                {result.success} enregistrement{result.success > 1 ? 's' : ''} sauvegardé{result.success > 1 ? 's' : ''} avec succès.
                {result.errors.length > 0 && ` ${result.errors.length} erreur(s).`}
              </p>
              {result.errors.map((e, i) => (
                <p key={i} className="text-xs mt-0.5 opacity-80">{e}</p>
              ))}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="py-2 pr-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-8">#</th>
                {columns.map(col => (
                  <th
                    key={String(col.key)}
                    className="py-2 px-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide"
                    style={{ width: col.width }}
                  >
                    {col.label}
                    {col.required && <span className="text-red-500 ml-0.5">*</span>}
                  </th>
                ))}
                <th className="py-2 pl-2 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={idx}
                  className={`border-b border-slate-100 transition ${
                    errors[idx] ? 'bg-red-50/30' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                  }`}
                >
                  <td className="py-1.5 pr-2 text-xs text-slate-400 font-mono select-none">{idx + 1}</td>
                  {columns.map(col => (
                    <td key={String(col.key)} className="py-1 px-1">
                      <CellInput
                        col={col}
                        value={row[col.key]}
                        onChange={v => updateCell(idx, col.key, v)}
                        hasError={!!errors[idx]?.has(String(col.key))}
                      />
                    </td>
                  ))}
                  <td className="py-1 pl-2">
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => duplicateRow(idx)}
                        title="Dupliquer la ligne"
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => removeRow(idx)}
                        title="Supprimer la ligne"
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 shrink-0 bg-slate-50 rounded-b-2xl">
          <div className="flex items-center gap-2">
            <button
              onClick={() => addRows(1)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter une ligne
            </button>
            <button
              onClick={() => addRows(5)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              +5 lignes
            </button>
            <span className="text-xs text-slate-400 ml-2">
              {filledCount} ligne{filledCount !== 1 ? 's' : ''} à enregistrer
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving || filledCount === 0}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Enregistrement…' : `Enregistrer tout (${filledCount})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
