import { useEffect } from 'react'
import ModeBars from '../components/ModeBars'
import TripCard from '../components/TripCard'
import { useStore } from '../store'
import { statsAPI } from '../services/api'
import { COLORS, FONTS, TRAVEX_GRADIENT } from '../tokens'

const MONTHLY_BUDGET = 18400

export default function BudgetPage() {
  const { stats, setStats } = useStore()

  useEffect(() => {
    statsAPI.summary().then(r => setStats(r.data)).catch(() => {})
  }, [setStats])

  const spent      = stats?.spend_this_year_inr ?? 0
  const remaining  = Math.max(0, MONTHLY_BUDGET - (stats ? Math.min(spent, MONTHLY_BUDGET) : 0))
  const pctUsed    = Math.min(100, Math.round((MONTHLY_BUDGET - remaining) / MONTHLY_BUDGET * 100))

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px 32px' }}>
      <h1 style={{
        fontFamily: FONTS.display, fontSize: 24, fontWeight: 800,
        background: TRAVEX_GRADIENT,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        marginBottom: 8,
      }}>Travel Budget</h1>
      <p style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.muted, marginBottom: 28 }}>
        Monthly travel allocation — April 2026
      </p>

      {/* Main budget card */}
      <div className="glass-card" style={{ padding: '28px 32px', marginBottom: 24 }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 20,
        }}>
          <span style={{
            fontFamily: FONTS.mono, fontSize: 36, fontWeight: 800,
            background: TRAVEX_GRADIENT,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>₹{remaining.toLocaleString('en-IN')}</span>
          <span style={{ fontFamily: FONTS.mono, fontSize: 13, color: COLORS.muted }}>
            remaining this month
          </span>
        </div>

        {/* Budget bar */}
        <div style={{ marginBottom: 12 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', marginBottom: 8,
            fontFamily: FONTS.mono, fontSize: 10, color: COLORS.muted,
          }}>
            <span>₹0</span>
            <span style={{ color: COLORS.forest }}>{pctUsed}% used</span>
            <span>₹{MONTHLY_BUDGET.toLocaleString('en-IN')}</span>
          </div>
          <div style={{
            height: 8, background: 'rgba(45,212,191,0.08)',
            borderRadius: 4, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', width: `${pctUsed}%`,
              background: pctUsed > 80
                ? 'linear-gradient(90deg, #FFB300, #ef4444)'
                : TRAVEX_GRADIENT,
              borderRadius: 4,
              transition: 'width 1s ease',
            }} />
          </div>
        </div>
        <div style={{
          fontFamily: FONTS.serif, fontStyle: 'italic', fontSize: 12, color: COLORS.muted,
        }}>
          Monthly budget: ₹{MONTHLY_BUDGET.toLocaleString('en-IN')} · Resets May 1, 2026
        </div>
      </div>

      {/* Mode breakdown + recent */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="glass-card" style={{ padding: '20px 24px' }}>
          <h2 style={{
            fontFamily: FONTS.display, fontSize: 16, fontWeight: 700, color: COLORS.text,
            marginBottom: 16,
          }}>Spend by Mode (this year)</h2>
          <ModeBars
            byMode={stats?.by_mode ?? {}}
            totalTrips={stats?.total_trips ?? 0}
          />
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${COLORS.border}` }}>
            {Object.entries(stats?.by_mode ?? {}).map(([m, data]) => (
              <div key={m} style={{
                display: 'flex', justifyContent: 'space-between',
                fontFamily: FONTS.mono, fontSize: 11,
                color: COLORS.muted, marginBottom: 6,
              }}>
                <span style={{ textTransform: 'capitalize' }}>{m}</span>
                <span style={{ color: COLORS.forest }}>₹{data.spend.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card">
          <div style={{
            padding: '16px 24px 8px',
            fontFamily: FONTS.mono, fontSize: 10, color: COLORS.muted,
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>Recent High-Cost Trips</div>
          {(stats?.recent_trips ?? [])
            .sort((a, b) => b.cost_inr - a.cost_inr)
            .slice(0, 4)
            .map(t => <TripCard key={t.id} trip={t} compact />)}
        </div>
      </div>

      {/* Note */}
      <div style={{
        marginTop: 24, padding: '14px 20px',
        background: 'rgba(45,212,191,0.04)',
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10,
        fontFamily: FONTS.serif, fontStyle: 'italic', fontSize: 12,
        color: COLORS.muted,
      }}>
        Budget integration with BUDGEX coming in v2 — full cross-module budget sync, automatic category tracking, and AI-powered spend forecasting.
      </div>
    </div>
  )
}
