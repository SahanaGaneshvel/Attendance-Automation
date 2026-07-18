import { useMemo, useState, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import { EmptyState } from './EmptyState'

export interface DataTableColumn<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  align?: 'left' | 'right' | 'center'
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  searchable?: boolean
  searchPlaceholder?: string
  filterFn?: (row: T, query: string) => boolean
  maxHeight?: number
  emptyLabel?: string
}

export function DataTable<T>({
  columns,
  rows,
  searchable = true,
  searchPlaceholder = 'Search…',
  filterFn,
  maxHeight = 420,
  emptyLabel = 'No matching records',
}: DataTableProps<T>) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query) return rows
    if (filterFn) return rows.filter((r) => filterFn(r, query))
    // default: stringify row and search
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(query.toLowerCase()))
  }, [rows, query, filterFn])

  return (
    <div className="data-table-wrap">
      {searchable && (
        <div className="data-table-search">
          <Search className="w-3.5 h-3.5 text-faint flex-shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
          />
        </div>
      )}
      <div style={{ maxHeight, overflow: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} style={{ textAlign: col.align ?? 'left' }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col.key} style={{ textAlign: col.align ?? 'left' }}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState title={emptyLabel} />}
      </div>
    </div>
  )
}
