import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDownAZ, ArrowUpAZ, Columns3, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatNumber } from '@/utils/format';
import { EmptyState } from '@/components/ui/feedback';
import { IconButton } from '@/components/ui/Button';

export interface Column<T> {
  key: string;
  header: string;
  /** cell renderer */
  cell: (row: T) => ReactNode;
  /** value used for sorting; omit to disable sorting on the column */
  sortValue?: (row: T) => string | number;
  width?: string;
  align?: 'start' | 'end' | 'center';
  /** technical columns can be hidden by default on narrow screens */
  optional?: boolean;
}

export interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
  caption?: string;
  dense?: boolean;
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  pageSize = 10,
  emptyTitle = 'موردی برای نمایش وجود ندارد',
  emptyDescription = 'با تغییر فیلترها یا جست‌وجو، نتایج دیگری را بررسی کنید.',
  emptyAction,
  caption,
  dense,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = useState(0);
  const [hidden, setHidden] = useState<string[]>([]);
  const [columnsOpen, setColumnsOpen] = useState(false);

  const visibleColumns = columns.filter((c) => !hidden.includes(c.key));

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.sortValue) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = column.sortValue!(a);
      const bv = column.sortValue!(b);
      if (av === bv) return 0;
      const result = av > bv ? 1 : -1;
      return sort.dir === 'asc' ? result : -result;
    });
    return copy;
  }, [rows, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <p className="num text-xs text-muted">
          {formatNumber(sorted.length)} مورد
          {pageCount > 1 && ` — صفحه ${formatNumber(safePage + 1)} از ${formatNumber(pageCount)}`}
        </p>
        <div className="relative">
          <IconButton
            label="ستون‌های نمایش‌داده‌شده"
            icon={<Columns3 size={15} />}
            size="sm"
            onClick={() => setColumnsOpen((v) => !v)}
            aria-expanded={columnsOpen}
          />
          {columnsOpen && (
            <div className="absolute end-0 top-9 z-20 w-56 rounded-lg border border-border bg-surface p-2 shadow-raised">
              <p className="px-1 pb-1.5 text-xs font-medium text-muted">ستون‌ها</p>
              {columns.map((column) => (
                <label
                  key={column.key}
                  className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-[13px] hover:bg-surface-2"
                >
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-[color:var(--c-primary-600)]"
                    checked={!hidden.includes(column.key)}
                    onChange={(event) =>
                      setHidden((prev) =>
                        event.target.checked
                          ? prev.filter((k) => k !== column.key)
                          : [...prev, column.key],
                      )
                    }
                  />
                  {column.header}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-[13px]">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="sticky top-0 z-10 bg-surface-2">
            <tr>
              {visibleColumns.map((column) => {
                const sortable = Boolean(column.sortValue);
                const active = sort?.key === column.key;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    style={{ width: column.width }}
                    className={cn(
                      'border-b border-border px-3 py-2.5 text-xs font-semibold text-muted',
                      column.align === 'end' ? 'text-end' : column.align === 'center' ? 'text-center' : 'text-start',
                    )}
                    aria-sort={active ? (sort?.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() =>
                          setSort((prev) =>
                            prev?.key === column.key
                              ? { key: column.key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                              : { key: column.key, dir: 'asc' },
                          )
                        }
                        className={cn(
                          'inline-flex items-center gap-1 hover:text-text',
                          active && 'text-primary-700',
                        )}
                      >
                        {column.header}
                        {active ? (
                          sort?.dir === 'asc' ? (
                            <ArrowUpAZ size={13} />
                          ) : (
                            <ArrowDownAZ size={13} />
                          )
                        ) : null}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr
                key={rowKey(row)}
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'button' : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
                className={cn(
                  'border-b border-border last:border-0',
                  onRowClick && 'cursor-pointer hover:bg-surface-2 focus:bg-surface-2',
                )}
              >
                {visibleColumns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      dense ? 'px-3 py-1.5' : 'px-3 py-2.5',
                      'align-middle',
                      column.align === 'end' ? 'text-end' : column.align === 'center' ? 'text-center' : 'text-start',
                    )}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <nav
          aria-label="صفحه‌بندی"
          className="flex items-center justify-between gap-2 border-t border-border px-3 py-2"
        >
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-border-strong px-2.5 text-xs disabled:opacity-45"
          >
            <ChevronRight size={14} />
            قبلی
          </button>
          <span className="num text-xs text-muted">
            {formatNumber(safePage + 1)} / {formatNumber(pageCount)}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={safePage >= pageCount - 1}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-border-strong px-2.5 text-xs disabled:opacity-45"
          >
            بعدی
            <ChevronLeft size={14} />
          </button>
        </nav>
      )}
    </div>
  );
}
