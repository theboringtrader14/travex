import { COLORS, FONTS, MODE_COLORS } from '../tokens'

interface Props {
  byMode:     Record<string, { count: number; spend: number }>
  totalTrips: number
}

export default function ModeBars({ byMode, totalTrips }: Props) {
  const modes = [
    { key: 'air',   label: 'Air',   color: MODE_COLORS.air   },
    { key: 'train', label: 'Train', color: MODE_COLORS.train },
    { key: 'bus',   label: 'Bus',   color: MODE_COLORS.bus   },
  ]

  return (
    <div>
      <div style={{
        fontFamily: FONTS.mono, fontSize: 10, color: COLORS.muted,
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
      }}>By Mode</div>
      {modes.map(m => {
        const pct = totalTrips > 0
          ? Math.round((byMode[m.key]?.count ?? 0) / totalTrips * 100)
          : 0
        return (
          <div key={m.key} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.text }}>{m.label}</span>
              <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: m.color }}>{pct}%</span>
            </div>
            <div style={{
              height: 4, background: 'rgba(255,255,255,0.06)',
              borderRadius: 2, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', width: `${pct}%`,
                background: m.color, borderRadius: 2,
                transition: 'width 1.5s ease',
                animation: 'fillBar 1.5s ease forwards',
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
