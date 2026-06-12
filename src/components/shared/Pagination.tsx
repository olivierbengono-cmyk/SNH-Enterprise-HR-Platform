import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export type PageSize = typeof PAGE_SIZE_OPTIONS[number];

interface PaginationProps {
  total: number;
  page: number;
  pageSize: PageSize;
  onPage: (page: number) => void;
  onPageSize: (size: PageSize) => void;
}

export function Pagination({ total, page, pageSize, onPage, onPageSize }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const pages = buildPageRange(page, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/50">
      {/* Count + per-page selector */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>{total === 0 ? '0 résultat' : `${from}–${to} sur ${total}`}</span>
        <span className="text-gray-300">|</span>
        <span>Afficher</span>
        <select
          value={pageSize}
          onChange={e => { onPageSize(Number(e.target.value) as PageSize); onPage(1); }}
          className="border border-gray-200 rounded-md px-2 py-1 text-xs bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
        >
          {PAGE_SIZE_OPTIONS.map(s => (
            <option key={s} value={s}>{s} / page</option>
          ))}
        </select>
      </div>

      {/* Page navigation */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <NavBtn onClick={() => onPage(1)} disabled={page === 1} title="Première page">
            <ChevronsLeft size={13} />
          </NavBtn>
          <NavBtn onClick={() => onPage(page - 1)} disabled={page === 1} title="Page précédente">
            <ChevronLeft size={13} />
          </NavBtn>

          {pages.map((p, i) =>
            p === '…' ? (
              <span key={`ellipsis-${i}`} className="px-1 text-gray-400 text-xs select-none">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPage(p as number)}
                className={`min-w-[28px] h-7 px-1.5 rounded-md text-xs font-medium transition ${
                  p === page
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p}
              </button>
            )
          )}

          <NavBtn onClick={() => onPage(page + 1)} disabled={page === totalPages} title="Page suivante">
            <ChevronRight size={13} />
          </NavBtn>
          <NavBtn onClick={() => onPage(totalPages)} disabled={page === totalPages} title="Dernière page">
            <ChevronsRight size={13} />
          </NavBtn>
        </div>
      )}
    </div>
  );
}

function NavBtn({ onClick, disabled, title, children }: {
  onClick: () => void; disabled: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
    >
      {children}
    </button>
  );
}

function buildPageRange(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const delta = 2;
  const range: number[] = [];
  for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
    range.push(i);
  }
  const result: (number | '…')[] = [1];
  if (range[0] > 2) result.push('…');
  result.push(...range);
  if (range[range.length - 1] < total - 1) result.push('…');
  result.push(total);
  return result;
}

/** Slice an array to the current page window */
export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  return items.slice((page - 1) * pageSize, page * pageSize);
}
