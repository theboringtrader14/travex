import { useNavigate, useLocation } from 'react-router-dom'
import { COLORS, FONTS, TRAVEX_GRADIENT } from '../tokens'

const NAV_ITEMS = [
  { label: 'Globe',  path: '/'       },
  { label: 'Trips',  path: '/trips'  },
  { label: 'Budget', path: '/budget' },
  { label: 'Buddy',  path: '/buddy'  },
  { label: 'Stats',  path: '/stats'  },
]

export default function Topbar() {
  const navigate   = useNavigate()
  const { pathname } = useLocation()

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', height: 60,
      background: 'rgba(4,13,10,0.95)',
      borderBottom: `1px solid ${COLORS.border}`,
      backdropFilter: 'blur(20px)',
      flexShrink: 0,
      position: 'relative',
      zIndex: 10,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{
          fontFamily: FONTS.display, fontWeight: 800, fontSize: 22,
          background: TRAVEX_GRADIENT,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>TRAVEX</span>
        <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.muted }}>· LIFEX OS</span>
      </div>

      {/* Nav pills */}
      <div style={{ display: 'flex', gap: 4 }}>
        {NAV_ITEMS.map(item => {
          const active = pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                cursor: 'pointer',
                fontFamily: FONTS.mono,
                fontSize: 12,
                background: active ? 'rgba(45,212,191,0.12)' : 'transparent',
                border: active ? '1px solid rgba(45,212,191,0.4)' : '1px solid transparent',
                color: active ? COLORS.teal : COLORS.muted,
                transition: 'all 0.15s',
              }}
            >{item.label}</button>
          )
        })}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Budget chip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 14px', borderRadius: 20,
          background: 'rgba(52,211,153,0.08)',
          border: '1px solid rgba(52,211,153,0.2)',
          fontFamily: FONTS.mono, fontSize: 12, color: COLORS.forest,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: COLORS.forest, display: 'inline-block',
            animation: 'blink 2s ease-in-out infinite',
          }} />
          ₹18,400 avail.
        </div>

        {/* AI Buddy button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => navigate('/buddy')}
            style={{
              padding: '6px 16px', borderRadius: 20, cursor: 'pointer',
              fontFamily: FONTS.mono, fontSize: 12,
              background: 'linear-gradient(135deg, rgba(56,189,248,0.15), rgba(45,212,191,0.15))',
              border: '1px solid rgba(56,189,248,0.4)',
              color: COLORS.sky,
            }}
          >AI Buddy</button>
          <div style={{
            position: 'absolute', inset: -4, borderRadius: 24,
            border: '1px solid rgba(56,189,248,0.3)',
            animation: 'pulseRing 2s ease-out infinite',
            pointerEvents: 'none',
          }} />
        </div>
      </div>
    </div>
  )
}
