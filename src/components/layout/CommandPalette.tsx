import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ArrowRight, Clock, X } from 'lucide-react';
import { NavEntry } from '../../contexts/NavigationContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (id: string) => void;
  allItems: NavEntry[];
  recents: NavEntry[];
}

export function CommandPalette({ isOpen, onClose, onNavigate, allItems, recents }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.parentLabel && item.parentLabel.toLowerCase().includes(q))
    );
  }, [query, allItems]);

  const displayItems = query.trim() ? filtered : recents;
  const showRecentsLabel = !query.trim() && recents.length > 0;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, displayItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (displayItems[selectedIndex]) {
        onNavigate(displayItems[selectedIndex].id);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher un module, une page..."
            className="flex-1 text-sm text-slate-900 placeholder-slate-400 outline-none bg-transparent"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 hover:bg-slate-100 rounded">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs text-slate-400 bg-slate-100 rounded border border-slate-200">
            Esc
          </kbd>
        </div>

        {displayItems.length > 0 ? (
          <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
            {showRecentsLabel && (
              <div className="flex items-center gap-2 px-4 py-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Recents</span>
              </div>
            )}
            {displayItems.map((item, i) => (
              <button
                key={item.id}
                onClick={() => { onNavigate(item.id); onClose(); }}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${
                  i === selectedIndex ? 'bg-slate-100' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex-1 min-w-0">
                  {item.parentLabel && (
                    <span className="text-xs text-slate-400 mb-0.5 block">{item.parentLabel}</span>
                  )}
                  <span className="text-sm font-medium text-slate-900">{item.label}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        ) : query.trim() ? (
          <div className="py-10 text-center text-sm text-slate-400">
            Aucun resultat pour "{query}"
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-slate-400">
            Commencez a taper pour rechercher
          </div>
        )}

        <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-slate-100 rounded border border-slate-200">↑↓</kbd> naviguer</span>
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-slate-100 rounded border border-slate-200">↵</kbd> ouvrir</span>
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-slate-100 rounded border border-slate-200">Esc</kbd> fermer</span>
        </div>
      </div>
    </div>
  );
}
