import type { TripRead } from '../services/api'
import { COLORS, FONTS, MODE_COLORS } from '../tokens'

const MODE_ICON: Record<string, string> = {
  air:   '✈',
  train: '🚆',
  bus:   '🚌',
  road:  '🚗',
}

interface Props {
  trip:     TripRead
  compact?: boolean
}

export default function TripCard({ trip, compact }: Props) {
  const color = MODE_COLORS[trip.mode as keyof typeof MODE_COLORS] ?? COLORS.teal

  const tagStyle = {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 4,
    fontFamily: FONTS.mono,
    fontSize: 10,
    fontWeight: 600,
    color,
    border: `1px solid ${color}`,
    background: `${color}18`,
    marginBottom: compact ? 4 : 8,
  }

  return (
    <div style={{
      padding: compact ? '10px 12px' : '14px 16px',
      borderBottom: `1px solid ${COLORS.border}`,
      animation: 'slideIn 0.5s ease',
    }}>
      <span style={tagStyle}>
        {MODE_ICON[trip.mode] ?? '✈'} {trip.mode.toUpperCase()}
      </span>
      <div style={{
        fontFamily: FONTS.display,
        fontSize: compact ? 13 : 14,
        fontWeight: 600,
        color: COLORS.text,
        marginBottom: 4,
      }}>
        {trip.from_city.code} → {trip.to_city.code}
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontFamily: FONTS.mono, fontSize: 10, color: COLORS.muted,
      }}>
        <span>{trip.travel_date}</span>
        <span style={{ color: COLORS.forest }}>
          ₹{trip.cost_inr.toLocaleString('en-IN')}
        </span>
      </div>
    </div>
  )
}
