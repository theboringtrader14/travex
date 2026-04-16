import { useEffect } from 'react'
import ModeBars from '../components/ModeBars'
import { useStore } from '../store'
import { statsAPI } from '../services/api'
import { COLORS, FONTS, TRAVEX_GRADIENT, MODE_COLORS } from '../tokens'

const MODE_ICON: Record<string, string> = {
  air:   '✈',
  train: '🚆',
  bus:   '🚌',
  road:  '🚗',
}

export default function StatsPage() {
  const { stats, setStats } = useStore()

  useEffect(() => {
    statsAPI.summary().then(r => setStats(r.data)).catch(() => {})
  }, [setStats])

  const topStats = [
    { label: 'Total Trips',       value: stats?.total_trips ?? '—' },
    { label: 'Cities Visited',    value: stats?.total_cities ?? '—' },
    { label: 'Lifetime Spend',    value: stats ? `₹${(stats.lifetime_spend_inr).toLocaleString('en-IN')}` : '—' },
    { label: 'This Year Spend',   value: stats ? `₹${(stats.spend_this_year_inr).toLocaleString('en-IN')}` : '—' },
  ]

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px 32px' }}>
      <h1 style={{
        fontFamily: FONTS.display, fontSize: 24, fontWeight: 800,
        background: TRAVEX_GRADIENT,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        marginBottom: 24,
      }}>Travel Stats</h1>

      {/* Top stat numbers */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32,
      }}>
        {topStats.map(s => (
          <div key={s.label} className="glass-card" style={{ padding: '20px 24px' }}>
            <div style={{
              fontFamily: FONTS.mono, fontSize: 10, color: COLORS.muted,
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
            }}>{s.label}</div>
            <div style={{
              fontFamily: FONTS.mono, fontSize: 28, fontWeight: 700,
              background: TRAVEX_GRADIENT,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Mode breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <div className="glass-card" style={{ padding: '20px 24px' }}>
          <h2 style={{
            fontFamily: FONTS.display, fontSize: 16, fontWeight: 700, color: COLORS.text,
            marginBottom: 16,
          }}>Mode Breakdown</h2>
          <ModeBars
            byMode={stats?.by_mode ?? {}}
            totalTrips={stats?.total_trips ?? 0}
          />
        </div>

        {/* Mode spend table */}
        <div className="glass-card" style={{ padding: '20px 24px' }}>
          <h2 style={{
            fontFamily: FONTS.display, fontSize: 16, fontWeight: 700, color: COLORS.text,
            marginBottom: 16,
          }}>Spend by Mode</h2>
          {Object.entries(stats?.by_mode ?? {}).map(([m, data]) => {
            const color = MODE_COLORS[m as keyof typeof MODE_COLORS] ?? COLORS.teal
            return (
              <div key={m} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: `1px solid ${COLORS.border}`,
              }}>
                <span style={{ fontFamily: FONTS.mono, fontSize: 12, color }}>
                  {MODE_ICON[m] ?? '✈'} {m.charAt(0).toUpperCase() + m.slice(1)}
                </span>
                <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.muted }}>
                  {data.count} trips
                </span>
                <span style={{ fontFamily: FONTS.mono, fontSize: 13, color: COLORS.forest, fontWeight: 600 }}>
                  ₹{data.spend.toLocaleString('en-IN')}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent trips table */}
      <div className="glass-card">
        <div style={{
          padding: '16px 24px', borderBottom: `1px solid ${COLORS.border}`,
          fontFamily: FONTS.display, fontSize: 16, fontWeight: 700, color: COLORS.text,
        }}>Recent Trips</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Mode', 'Route', 'Date', 'Cost'].map(h => (
                  <th key={h} style={{
                    padding: '12px 24px', textAlign: 'left',
                    fontFamily: FONTS.mono, fontSize: 10,
                    color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.08em',
                    borderBottom: `1px solid ${COLORS.border}`,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(stats?.recent_trips ?? []).map(t => {
                const color = MODE_COLORS[t.mode as keyof typeof MODE_COLORS] ?? COLORS.teal
                return (
                  <tr key={t.id}>
                    <td style={{ padding: '12px 24px', fontFamily: FONTS.mono, fontSize: 11, color }}>
                      {MODE_ICON[t.mode] ?? '✈'} {t.mode.toUpperCase()}
                    </td>
                    <td style={{ padding: '12px 24px', fontFamily: FONTS.display, fontSize: 13, color: COLORS.text }}>
                      {t.from_city.code} → {t.to_city.code}
                    </td>
                    <td style={{ padding: '12px 24px', fontFamily: FONTS.mono, fontSize: 11, color: COLORS.muted }}>
                      {t.travel_date}
                    </td>
                    <td style={{ padding: '12px 24px', fontFamily: FONTS.mono, fontSize: 13, color: COLORS.forest, fontWeight: 600 }}>
                      ₹{t.cost_inr.toLocaleString('en-IN')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
