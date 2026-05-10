import { useState, useRef, useEffect } from 'preact/hooks';
import Sparkline from '@islands/shared/Sparkline/Sparkline';
import styles from './metrics-chart.module.css';

type DataPoint = {
  timestamp: string;
  value: number;
}

type Props = {
  data: DataPoint[];
  label: string;
  formatValue: (v: number) => string;
  min?: number;
  max?: number;
  color?: string;
  height?: number;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MetricsChart({
  data,
  label,
  formatValue,
  min = 0,
  max,
  color = 'var(--color-primary)',
  height = 120,
}: Props) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (data.length < 2) {
    return (
      <div class={styles.empty}>
        Collecting data...
      </div>
    );
  }

  const values = data.map(d => d.value);
  const yMax = max ?? Math.max(...values);

  function handleMouseMove(e: MouseEvent) {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (!chartRef.current || data.length === 0) return;
      const rect = chartRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = x / rect.width;
      const idx = Math.round(ratio * (data.length - 1));
      setHoverIdx(Math.max(0, Math.min(idx, data.length - 1)));
    });
  }

  const hoverPoint = hoverIdx !== null ? data[hoverIdx] : null;

  return (
    <div class={styles.wrapper}>
      <div class={styles.yAxis}>
        <span class={styles.yLabel}>{formatValue(yMax)}</span>
        <span class={styles.yLabel}>{formatValue(min)}</span>
      </div>
      <div class={styles.chartArea}>
        <div
          ref={chartRef}
          class={styles.chart}
          style={{ height: `${height}px` }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <Sparkline
            data={values}
            min={min}
            max={yMax}
            color={color}
            fillOpacity={0.15}
            strokeWidth={1.5}
          />
          {hoverIdx !== null && (
            <div
              class={styles.hoverLine}
              style={{ left: `${(hoverIdx / (data.length - 1)) * 100}%` }}
            />
          )}
        </div>
        <div class={styles.xAxis}>
          <span class={styles.xLabel}>{formatTime(data[0].timestamp)}</span>
          {data.length > 2 && (
            <span class={styles.xLabel}>{formatTime(data[Math.floor(data.length / 2)].timestamp)}</span>
          )}
          <span class={styles.xLabel}>{formatTime(data[data.length - 1].timestamp)}</span>
        </div>
        {hoverPoint && (
          <div
            class={styles.tooltip}
            style={{ left: `${(hoverIdx! / (data.length - 1)) * 100}%` }}
          >
            <span class={styles.tooltipValue}>{formatValue(hoverPoint.value)}</span>
            <span class={styles.tooltipTime}>{formatTime(hoverPoint.timestamp)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
