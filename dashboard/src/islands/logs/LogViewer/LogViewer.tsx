import { useEffect, useRef, useState, useMemo, useCallback } from 'preact/hooks';
import { createSSEClient } from '@lib/sse';
import { Search, Download } from 'lucide-preact';
import styles from './log-viewer.module.css';

type LogEntry = {
  timestamp: string;
  level: string;
  message: string;
}

const MAX_LINES = 10_000;
const ROW_HEIGHT = 22;
const OVERSCAN = 10;

type Props = {
  appId: string;
}

export default function LogViewer({ appId }: Props) {
  const bufferRef = useRef<LogEntry[]>([]);
  const [lines, setLines] = useState<LogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [levelFilter, setLevelFilter] = useState('all');
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);
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

  // Measure container height on mount and resize
  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    }
    measure();
    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const filtered = useMemo(() => lines.filter((l) => {
    if (levelFilter !== 'all' && l.level !== levelFilter) return false;
    if (searchQuery && !l.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }), [lines, searchQuery, levelFilter]);

  // Auto-scroll when new lines arrive
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      const totalHeight = filtered.length * ROW_HEIGHT;
      containerRef.current.scrollTop = totalHeight;
    }
  }, [filtered.length, autoScroll]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    setScrollTop(el.scrollTop);
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    if (!atBottom && autoScroll) setAutoScroll(false);
  }, [autoScroll]);

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

  const searchCount = searchQuery ? filtered.length : null;

  // Virtualization calculations
  const totalHeight = filtered.length * ROW_HEIGHT;
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIdx = Math.min(filtered.length, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN);
  const visibleItems = filtered.slice(startIdx, endIdx);
  const offsetY = startIdx * ROW_HEIGHT;

  const levelClass = (level: string) => {
    switch (level) {
      case 'ERROR': return styles.levelError;
      case 'WARN': return styles.levelWarn;
      default: return styles.levelInfo;
    }
  };

  const lineBorderClass = (level: string) => {
    switch (level) {
      case 'ERROR': return styles.logLineBorderError;
      case 'WARN': return styles.logLineBorderWarn;
      default: return styles.logLineBorderNone;
    }
  };

  return (
    <div class={styles.viewer}>
      <div class={styles.toolbar}>
        <Search size={14} class={styles.searchIcon} aria-hidden="true" />
        <input
          id="log-search"
          type="text"
          placeholder="Search logs..."
          value={searchQuery}
          onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
          class={styles.searchInput}
          aria-label="Search logs"
        />
        {/* a11y [WCAG 4.1.3]: announce search result count to AT */}
        <span class={styles.searchCount} role="status" aria-live="polite">
          {searchCount !== null ? `${searchCount} results` : ''}
        </span>
        <label for="log-level-filter" class="sr-only">Filter by log level</label>
        <select
          id="log-level-filter"
          value={levelFilter}
          onChange={(e) => setLevelFilter((e.target as HTMLSelectElement).value)}
          class={styles.levelSelect}
          aria-label="Filter by log level"
        >
          <option value="all">All levels</option>
          <option value="INFO">INFO</option>
          <option value="WARN">WARN</option>
          <option value="ERROR">ERROR</option>
        </select>
      </div>

      {/* a11y [WCAG 4.1.3]: live log output announced to AT */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        class={styles.logContainer}
        style={{ overflow: 'auto' }}
        role="log"
        aria-live="polite"
        aria-label="Application logs"
      >
        {filtered.length === 0 ? (
          <div class={styles.emptyState}>
            {lines.length === 0 ? 'Waiting for log output...' : 'No matching logs.'}
          </div>
        ) : (
          <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
            <div style={{ transform: `translateY(${offsetY}px)` }}>
              {visibleItems.map((line, i) => (
                <div
                  key={startIdx + i}
                  class={lineBorderClass(line.level)}
                  style={{ height: `${ROW_HEIGHT}px` }}
                >
                  <span class={styles.lineNumber}>
                    {startIdx + i + 1}
                  </span>
                  <span class={styles.timestamp}>
                    {line.timestamp.replace('T', ' ').replace('Z', '').slice(0, 23)}
                  </span>
                  <span class={levelClass(line.level)}>
                    {line.level}
                  </span>
                  <span class={styles.message}>
                    {line.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div class={styles.statusBar}>
        <div class={styles.statusLeft}>
          <label class={styles.autoScrollLabel}>
            <span class={autoScroll ? styles.autoScrollDotActive : styles.autoScrollDotInactive} />
            <button
              onClick={() => { setAutoScroll(!autoScroll); if (!autoScroll && containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight; }}
              class={styles.ghostButton}
            >
              Auto-scroll
            </button>
          </label>
          <span>{lines.length.toLocaleString()} lines</span>
        </div>
        <div class={styles.statusRight}>
          <button onClick={() => setLines([])} class={styles.ghostButton} aria-label="Clear logs">Clear</button>
          <button onClick={handleDownload} class={styles.downloadButton} aria-label="Download logs">
            <Download size={12} /> Download logs
          </button>
        </div>
      </div>
    </div>
  );
}
