import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbProps {
  current: { id: string; label: string; parentLabel?: string } | null;
  onNavigate: (id: string) => void;
}

export function Breadcrumb({ current, onNavigate }: BreadcrumbProps) {
  if (!current || current.id === 'dashboard') return null;

  return (
    <nav className="flex items-center gap-1 text-sm text-slate-500 mb-6">
      <button
        onClick={() => onNavigate('dashboard')}
        className="flex items-center gap-1 hover:text-slate-900 transition"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Accueil</span>
      </button>

      {current.parentLabel && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-slate-500">{current.parentLabel}</span>
        </>
      )}

      <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
      <span className="font-medium text-slate-900">{current.label}</span>
    </nav>
  );
}
