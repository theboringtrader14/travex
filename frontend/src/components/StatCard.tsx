import { COLORS, FONTS, TRAVEX_GRADIENT } from '../tokens'

interface Props {
  label: string
  value: string | number
  sub?:  string
}

export default function StatCard({ label, value, sub }: Props) {
  return (
    <div className="glass-card shimmer" style={{ padding: '16px', marginBottom: 12 }}>
      <div style={{
        fontFamily: FONTS.mono, fontSize: 10, color: COLORS.muted,
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
      }}>{label}</div>
      <div style={{
        fontFamily: FONTS.mono, fontSize: 22, fontWeight: 700,
        background: TRAVEX_GRADIENT,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>{value}</div>
      {sub && (
        <div style={{
          fontFamily: FONTS.serif, fontStyle: 'italic', fontSize: 11,
          color: COLORS.muted, marginTop: 4,
        }}>{sub}</div>
      )}
    </div>
  )
}
