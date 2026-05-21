import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';

export interface NavEntry {
  id: string;
  label: string;
  parentLabel?: string;
}

interface NavigationContextValue {
  current: NavEntry | null;
  previousEntry: NavEntry | null;
  history: NavEntry[];
  recents: NavEntry[];
  navigate: (entry: NavEntry) => void;
  goBack: () => NavEntry | null;
  canGoBack: boolean;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

const MAX_RECENTS = 5;

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<NavEntry[]>([]);
  const [recents, setRecents] = useState<NavEntry[]>([]);
  const historyRef = useRef<NavEntry[]>([]);

  const current = history[history.length - 1] ?? null;
  const previousEntry = history.length > 1 ? history[history.length - 2] : null;
  const canGoBack = history.length > 1;

  const navigate = useCallback((entry: NavEntry) => {
    const last = historyRef.current[historyRef.current.length - 1];
    if (last?.id === entry.id) return;

    const next = [...historyRef.current, entry];
    historyRef.current = next;
    setHistory(next);

    setRecents((prev) => {
      const filtered = prev.filter((r) => r.id !== entry.id);
      return [entry, ...filtered].slice(0, MAX_RECENTS);
    });
  }, []);

  const goBack = useCallback((): NavEntry | null => {
    if (historyRef.current.length <= 1) return null;
    const next = historyRef.current.slice(0, -1);
    const previous = next[next.length - 1];
    historyRef.current = next;
    setHistory(next);
    return previous;
  }, []);

  return (
    <NavigationContext.Provider value={{ current, previousEntry, history, recents, navigate, goBack, canGoBack }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigation must be used within NavigationProvider');
  return ctx;
}
