import type { ErgoTimelineEvent } from '../types/videoErgo';

const TYPE_ICONS: Record<ErgoTimelineEvent['type'], string> = {
  postura: '🧍',
  correcao: '✅',
  repeticao: '🔄',
  carga: '📦',
  risco: '⚠️',
};

const SEVERITY_COLORS: Record<string, string> = {
  critico: 'var(--red)',
  alto: 'var(--orange, #f97316)',
  medio: 'var(--amber, #eab308)',
  baixo: 'var(--green)',
};

interface ErgoVideoTimelineProps {
  events: ErgoTimelineEvent[];
  maxItems?: number;
}

export function ErgoVideoTimeline({ events, maxItems = 20 }: ErgoVideoTimelineProps) {
  const items = events.slice(0, maxItems);

  if (items.length === 0) {
    return <p className="t2" style={{ fontSize: 12 }}>Nenhum evento registrado na linha do tempo.</p>;
  }

  return (
    <div className="ergo-timeline" style={{ position: 'relative', paddingLeft: 16 }}>
      <div
        style={{
          position: 'absolute',
          left: 6,
          top: 4,
          bottom: 4,
          width: 2,
          background: 'var(--border, rgba(255,255,255,0.1))',
        }}
      />
      {items.map((ev, i) => (
        <div
          key={`${ev.timestampMs}-${i}`}
          style={{
            position: 'relative',
            marginBottom: 12,
            paddingLeft: 12,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: -14,
              top: 4,
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: SEVERITY_COLORS[ev.severity] ?? 'var(--t2)',
              border: '2px solid var(--bg)',
            }}
          />
          <div style={{ fontSize: 11, color: 'var(--t2)', fontFamily: 'monospace' }}>{ev.timeLabel}</div>
          <div style={{ fontSize: 12, marginTop: 2 }}>
            {TYPE_ICONS[ev.type]} {ev.message}
          </div>
        </div>
      ))}
    </div>
  );
}
