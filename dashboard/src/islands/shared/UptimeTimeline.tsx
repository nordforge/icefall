import { useEffect, useState } from 'preact/hooks';
import { api } from '../../lib/api';

interface HealthEvent {
  status: string;
  checked_at: string;
}

interface Props {
  appId: string;
}

const RANGES = [
  { key: '24h', label: '24h', hours: 24 },
  { key: '7d', label: '7d', hours: 168 },
  { key: '30d', label: '30d', hours: 720 },
];

const SEGMENTS = 48;

export default function UptimeTimeline({ appId }: Props) {
  const [events, setEvents] = useState<HealthEvent[]>([]);
  const [range, setRange] = useState('24h');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/v1/apps/${appId}/health?limit=1000`)
      .then((r) => r.json())
      .then((data) => {
        const allEvents = data.data?.flatMap((c: any) => c.recent_events || []) || [];
        setEvents(allEvents);
      })
      .catch(() => {});
  }, [appId]);

  const selectedRange = RANGES.find((r) => r.key === range) || RANGES[0];
  const now = Date.now();
  const rangeMs = selectedRange.hours * 60 * 60 * 1000;
  const segmentMs = rangeMs / SEGMENTS;

  const segments = Array.from({ length: SEGMENTS }, (_, i) => {
    const segStart = now - rangeMs + i * segmentMs;
    const segEnd = segStart + segmentMs;

    const segEvents = events.filter((e) => {
      const t = new Date(e.checked_at).getTime();
      return t >= segStart && t < segEnd;
    });

    if (segEvents.length === 0) return 'none';
    const unhealthy = segEvents.some((e) => e.status === 'unhealthy');
    return unhealthy ? 'unhealthy' : 'healthy';
  });

  const rangeStart = now - rangeMs;
  const rangeEvents = events.filter((e) => new Date(e.checked_at).getTime() >= rangeStart);
  const healthyCount = rangeEvents.filter((e) => e.status === 'healthy').length;
  const uptimePercent = rangeEvents.length > 0 ? ((healthyCount / rangeEvents.length) * 100).toFixed(1) : '100.0';

  const segColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'var(--color-success)';
      case 'unhealthy': return 'var(--color-error)';
      default: return 'var(--color-border)';
    }
  };

  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text)' }}>
          Uptime
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-semibold)', color: parseFloat(uptimePercent) >= 99 ? 'var(--color-success)' : 'var(--color-warning)' }}>
            {uptimePercent}%
          </span>
          <div style={{ display: 'flex', gap: 2 }}>
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                style={{
                  padding: '2px var(--space-2)',
                  fontSize: 'var(--text-xs)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  background: range === r.key ? 'var(--color-primary-subtle)' : 'transparent',
                  color: range === r.key ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  fontWeight: range === r.key ? 'var(--weight-medium)' : 'var(--weight-normal)',
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{ display: 'flex', gap: 1, height: 24, borderRadius: 'var(--radius-sm)', overflow: 'hidden', position: 'relative' }}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        {segments.map((status, i) => (
          <div
            key={i}
            onMouseEnter={() => setHoveredIdx(i)}
            style={{
              flex: 1,
              background: segColor(status),
              opacity: hoveredIdx === i ? 0.8 : 1,
              cursor: 'default',
              transition: 'opacity var(--duration-fast) var(--ease-out)',
            }}
            title={`${new Date(now - rangeMs + i * segmentMs).toLocaleString()} — ${status}`}
          />
        ))}
      </div>

      {hoveredIdx !== null && (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
          {new Date(now - rangeMs + hoveredIdx * segmentMs).toLocaleString()} — {segments[hoveredIdx]}
        </div>
      )}
    </div>
  );
}
