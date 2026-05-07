import { useEffect, useState } from 'preact/hooks';
import { api } from '@lib/api';
import Button from '@islands/shared/Button/Button';
import { Table, Play, ArrowUpDown, ChevronLeft, ChevronRight, Terminal } from 'lucide-preact';
import styles from './database-browser.module.css';
import formStyles from '@styles/form.module.css';

type Props = {
  dbId: string;
  dbType: string;
}

type QueryResult = {
  columns: string[];
  rows: string[][];
  row_count: number;
}

type SortState = {
  column: number;
  direction: 'asc' | 'desc';
}

const SUPPORTED_TYPES = ['postgres', 'mysql'];
const PAGE_SIZE = 25;

export default function DatabaseBrowser({ dbId, dbType }: Props) {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customQuery, setCustomQuery] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [sort, setSort] = useState<SortState | null>(null);
  const [filterColumn, setFilterColumn] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [page, setPage] = useState(0);

  const isSupported = SUPPORTED_TYPES.includes(dbType);

  useEffect(() => {
    if (!isSupported) return;
    api.listDbTables(dbId).then(({ data }) => setTables(data)).catch(() => {});
  }, [dbId]);

  async function browseTable(table: string) {
    setSelectedTable(table);
    setSort(null);
    setFilterColumn('');
    setFilterValue('');
    setPage(0);
    await runQuery(`SELECT * FROM "${table}" LIMIT 100`);
  }

  async function runQuery(sql: string) {
    setLoading(true);
    setError('');
    try {
      const data = await api.queryDb(dbId, sql);
      setResult(data);
    } catch (e: any) {
      setError(e.message || 'Query failed');
      setResult(null);
    }
    setLoading(false);
  }

  async function runCustom() {
    if (!customQuery.trim()) return;
    setSelectedTable('');
    setSort(null);
    setPage(0);
    await runQuery(customQuery);
  }

  function handleSort(colIdx: number) {
    const newDir = sort?.column === colIdx && sort.direction === 'asc' ? 'desc' : 'asc';
    setSort({ column: colIdx, direction: newDir });
    setPage(0);
  }

  function getSortedRows(): string[][] {
    if (!result) return [];
    let rows = [...result.rows];

    if (filterColumn && filterValue) {
      const colIdx = result.columns.indexOf(filterColumn);
      if (colIdx >= 0) {
        const lower = filterValue.toLowerCase();
        rows = rows.filter(r => r[colIdx]?.toLowerCase().includes(lower));
      }
    }

    if (sort) {
      rows.sort((a, b) => {
        const aVal = a[sort.column] || '';
        const bVal = b[sort.column] || '';
        const numA = Number(aVal);
        const numB = Number(bVal);
        const cmp = !isNaN(numA) && !isNaN(numB) ? numA - numB : aVal.localeCompare(bVal);
        return sort.direction === 'asc' ? cmp : -cmp;
      });
    }

    return rows;
  }

  if (!isSupported) {
    return (
      <div class={styles.unsupported}>
        <Terminal size={24} aria-hidden="true" />
        <p>Table browsing is available for PostgreSQL and MySQL databases.</p>
        <p class={styles.unsupportedHint}>Use a {dbType} client to connect directly with the connection string above.</p>
      </div>
    );
  }

  const sortedRows = getSortedRows();
  const totalPages = Math.ceil(sortedRows.length / PAGE_SIZE);
  const pagedRows = sortedRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div class={styles.browser}>
      <div class={styles.header}>
        <h2 class={styles.title}>Browse Data</h2>
        <Button variant={showCustom ? 'primary' : 'ghost'} size="sm" onClick={() => setShowCustom(!showCustom)}>
          <Terminal size={14} aria-hidden="true" /> Custom Query
        </Button>
      </div>

      {showCustom && (
        <div class={styles.queryCard}>
          <label htmlFor="custom-sql" class={formStyles.label}>SQL Query (read-only)</label>
          <textarea
            id="custom-sql"
            class={formStyles.textarea}
            value={customQuery}
            onInput={e => setCustomQuery((e.target as HTMLTextAreaElement).value)}
            placeholder={`SELECT * FROM users WHERE active = true LIMIT 50`}
            rows={3}
          />
          <div class={styles.queryActions}>
            <Button variant="primary" size="sm" onClick={runCustom} loading={loading} disabled={!customQuery.trim()}>
              <Play size={12} aria-hidden="true" /> Run Query
            </Button>
          </div>
        </div>
      )}

      {tables.length > 0 && (
        <div class={styles.tableList}>
          <span class={styles.tableListLabel}>Tables</span>
          <div class={styles.tablePills}>
            {tables.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => browseTable(t)}
                class={`${styles.tablePill} ${selectedTable === t ? styles.tablePillActive : ''}`}
                aria-pressed={selectedTable === t}
              >
                <Table size={12} aria-hidden="true" /> {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div class={styles.error} role="alert">{error}</div>
      )}

      {result && result.columns.length > 0 && (
        <>
          {result.columns.length > 1 && (
            <div class={styles.filterRow}>
              <select
                class={styles.filterSelect}
                value={filterColumn}
                onChange={e => { setFilterColumn((e.target as HTMLSelectElement).value); setPage(0); }}
                aria-label="Filter by column"
              >
                <option value="">Filter by column...</option>
                {result.columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {filterColumn && (
                <input
                  class={styles.filterInput}
                  type="text"
                  value={filterValue}
                  onInput={e => { setFilterValue((e.target as HTMLInputElement).value); setPage(0); }}
                  placeholder={`Filter ${filterColumn}...`}
                  aria-label={`Filter value for ${filterColumn}`}
                />
              )}
              <span class={styles.rowCount}>
                {sortedRows.length} row{sortedRows.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          <div class={styles.tableWrap}>
            <table class={styles.dataTable}>
              <thead>
                <tr>
                  {result.columns.map((col, i) => (
                    <th key={col} class={styles.th}>
                      <button type="button" class={styles.sortButton} onClick={() => handleSort(i)} aria-label={`Sort by ${col}`}>
                        {col}
                        <ArrowUpDown size={10} aria-hidden="true" class={sort?.column === i ? styles.sortActive : styles.sortInactive} />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row, ri) => (
                  <tr key={ri} class={styles.dataRow}>
                    {row.map((cell, ci) => (
                      <td key={ci} class={styles.td} title={cell}>
                        {cell === '' || cell === null ? <span class={styles.nullCell}>NULL</span> : cell}
                      </td>
                    ))}
                  </tr>
                ))}
                {pagedRows.length === 0 && (
                  <tr><td class={styles.emptyCell} colSpan={result.columns.length}>No rows match the filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div class={styles.pagination}>
              <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={14} aria-hidden="true" /> Previous
              </Button>
              <span class={styles.pageInfo}>Page {page + 1} of {totalPages}</span>
              <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                Next <ChevronRight size={14} aria-hidden="true" />
              </Button>
            </div>
          )}
        </>
      )}

      {loading && !result && (
        <p class={styles.loadingText}>Querying database...</p>
      )}
    </div>
  );
}
