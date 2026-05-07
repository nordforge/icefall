import { useEffect, useRef, useState } from 'preact/hooks';
import { createSSEClient } from '../../lib/sse';
import { Search, Download } from 'lucide-preact';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

const MAX_LINES = 10_000;

interface Props {
  appId: string;
}

export default function LogViewer({ appId }: Props) {
  const bufferRef = useRef<LogEntry[]>([]);
  const [lines, setLines] = useState<LogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [levelFilter, setLevelFilter] = useState('all');
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const sse = createSSEClient(`/api/v1/apps/${appId}/events`, {
      'build.step.output': (data: any) => {
        const entry: LogEntry = {
          timestamp: new Date().toISOString(),
          level: 'INFO',
          message: typeof data === 'string' ? data : data.line || JSON.stringify(data),
        };
        bufferRef.current.push(entry);
        if (bufferRef.current.length > MAX_LINES) {
          bufferRef.current = bufferRef.current.slice(-MAX_LINES);
        }
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            setLines([...bufferRef.current]);
          });
        }
      },
    });

    return () => {
      sse.close();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [appId]);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines.length, autoScroll]);

  function handleScroll() {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    if (!atBottom && autoScroll) setAutoScroll(false);
  }

  function handleDownload() {
    const text = lines.map((l) => `${l.timestamp} [${l.level}] ${l.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${appId}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = lines.filter((l) => {
    if (levelFilter !== 'all' && l.level !== levelFilter) return false;
    if (searchQuery && !l.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const searchCount = searchQuery ? filtered.length : null;

  const levelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return 'var(--color-error)';
      case 'WARN': return 'var(--color-warning)';
      default: return 'oklch(0.55 0.12 250)';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 250px)', minHeight: 400 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)',
        background: 'oklch(0.18 0.015 250)',
        borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
        borderBottom: '1px solid oklch(0.25 0.015 250)',
      }}>
        <Search size={14} style={{ color: 'oklch(0.5 0.01 250)' }} />
        <input
          type="text"
          placeholder="Search logs..."
          value={searchQuery}
          onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: 'oklch(0.9 0.005 250)',
            fontSize: 'var(--text-sm)',
            outline: 'none',
            fontFamily: 'var(--font-mono)',
          }}
        />
        {searchCount !== null && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'oklch(0.5 0.01 250)' }}>
            {searchCount} results
          </span>
        )}
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter((e.target as HTMLSelectElement).value)}
          style={{
            background: 'oklch(0.22 0.015 250)',
            border: '1px solid oklch(0.30 0.015 250)',
            color: 'oklch(0.8 0.005 250)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px var(--space-2)',
            fontSize: 'var(--text-xs)',
          }}
        >
          <option value="all">All levels</option>
          <option value="INFO">INFO</option>
          <option value="WARN">WARN</option>
          <option value="ERROR">ERROR</option>
        </select>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflow: 'auto',
          background: 'oklch(0.14 0.015 250)',
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          lineHeight: 1.7,
          padding: 'var(--space-2) 0',
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'oklch(0.4 0.01 250)' }}>
            {lines.length === 0 ? 'Waiting for log output...' : 'No matching logs.'}
          </div>
        ) : (
          filtered.map((line, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                padding: '0 var(--space-4)',
                borderLeft: line.level === 'ERROR' ? '3px solid var(--color-error)' : line.level === 'WARN' ? '3px solid var(--color-warning)' : '3px solid transparent',
              }}
            >
              <span style={{ color: 'oklch(0.35 0.01 250)', userSelect: 'none', width: 48, flexShrink: 0, textAlign: 'right', paddingRight: 'var(--space-3)' }}>
                {i + 1}
              </span>
              <span style={{ color: 'oklch(0.45 0.01 250)', width: 200, flexShrink: 0, fontSize: '12px' }}>
                {line.timestamp.replace('T', ' ').replace('Z', '').slice(0, 23)}
              </span>
              <span style={{
                display: 'inline-block',
                width: 45,
                flexShrink: 0,
                fontWeight: 600,
                fontSize: '11px',
                color: levelColor(line.level),
              }}>
                {line.level}
              </span>
              <span style={{ color: 'oklch(0.85 0.005 250)', flex: 1, wordBreak: 'break-all' }}>
                {line.message}
              </span>
            </div>
          ))
        )}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-2) var(--space-4)',
        background: 'oklch(0.18 0.015 250)',
        borderRadius: '0 0 var(--radius-md) var(--radius-md)',
        borderTop: '1px solid oklch(0.25 0.015 250)',
        fontSize: 'var(--text-xs)',
        color: 'oklch(0.5 0.01 250)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', cursor: 'pointer' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: autoScroll ? 'var(--color-success)' : 'oklch(0.35 0.01 250)' }} />
            <button
              onClick={() => { setAutoScroll(!autoScroll); if (!autoScroll && containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight; }}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 'inherit' }}
            >
              Auto-scroll
            </button>
          </label>
          <span>{lines.length.toLocaleString()} lines</span>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button onClick={() => setLines([])} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>Clear</button>
          <button onClick={handleDownload} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
            <Download size={12} /> Download logs
          </button>
        </div>
      </div>
    </div>
  );
}
