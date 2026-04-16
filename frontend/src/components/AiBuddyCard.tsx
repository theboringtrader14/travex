import { COLORS, FONTS, TRAVEX_GRADIENT } from '../tokens'

export default function AiBuddyCard() {
  return (
    <div style={{
      margin: '12px 0',
      padding: '14px 16px',
      background: COLORS.glass,
      border: '1px solid rgba(56,189,248,0.25)',
      borderTop: '2px solid #38bdf8',
      borderRadius: 12,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.4), transparent)',
      }} />
      <div style={{
        fontFamily: FONTS.mono, fontSize: 10, color: '#38bdf8',
        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6,
        background: TRAVEX_GRADIENT,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>AI Travel Buddy</div>
      <div style={{
        fontFamily: FONTS.serif,
        fontStyle: 'italic',
        fontSize: 12,
        color: 'rgba(200,237,231,0.75)',
        lineHeight: 1.5,
      }}>
        Based on your ₹18,400 travel budget this month, you can afford a short trip — consider Mysore or Coimbatore by train.
      </div>
    </div>
  )
}
