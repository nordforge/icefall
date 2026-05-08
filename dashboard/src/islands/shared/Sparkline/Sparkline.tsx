import styles from './sparkline.module.css';

type Props = {
  data: number[];
  min?: number;
  max?: number;
  color?: string;
  fillOpacity?: number;
  strokeWidth?: number;
  className?: string;
}

const W = 1000;
const H = 400;

export default function Sparkline({
  data,
  min = 0,
  max,
  color = 'var(--color-primary)',
  fillOpacity = 0.1,
  strokeWidth = 1.5,
  className,
}: Props) {
  if (data.length < 2) return null;

  const yMax = max ?? Math.max(...data);
  const yMin = min;
  const range = yMax - yMin || 1;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * W;
    const pct = (val - yMin) / range;
    const y = H - pct * H;
    return `${x},${y}`;
  });

  const linePoints = points.join(' ');
  const fillPoints = `0,${H} ${linePoints} ${W},${H}`;
  const gradientId = `spark-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg
      class={`${styles.svg} ${className || ''}`}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color={color} stop-opacity={fillOpacity} />
          <stop offset="100%" stop-color={color} stop-opacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={fillPoints}
        fill={`url(#${gradientId})`}
      />
      <polyline
        points={linePoints}
        fill="none"
        stroke={color}
        stroke-width={strokeWidth}
        vector-effect="non-scaling-stroke"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
    </svg>
  );
}
