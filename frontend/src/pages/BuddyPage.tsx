import { useState } from 'react'
import { COLORS, FONTS, TRAVEX_GRADIENT } from '../tokens'

const STATIC_INSIGHTS = [
  "Based on your travel history, you visit Bangalore → Delhi most frequently (air, avg ₹5,800 per trip).",
  "Your busiest travel month is March — 2 trips logged in March 2026 alone.",
  "You've spent ₹11,200 on air travel this year — within 65% of your estimated annual air budget.",
  "Train travel is your most economical mode — avg ₹605 per trip vs ₹5,150 for air.",
  "Consider booking BLR → GOA — current avg fares are ~₹4,100, well within your monthly budget.",
]

export default function BuddyPage() {
  const [query,    setQuery]    = useState('')
  const [response, setResponse] = useState<string | null>(null)

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    // Static response for v1
    setResponse(
      `AI Buddy (v1 — static): "${query.trim()}" — I'd suggest checking your recent trip patterns. ` +
      `Your most frequent route is BLR → DEL. Gemma 4 AI integration is coming in v2 for real-time analysis.`
    )
    setQuery('')
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px 32px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
        <h1 style={{
          fontFamily: FONTS.display, fontSize: 28, fontWeight: 800,
          background: TRAVEX_GRADIENT,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: 8,
        }}>AI Travel Buddy</h1>
        <p style={{ fontFamily: FONTS.serif, fontStyle: 'italic', fontSize: 14, color: COLORS.muted }}>
          Your personal travel intelligence — knows your finances, history, and preferences.
        </p>
      </div>

      {/* Insights */}
      <div style={{ marginBottom: 32, maxWidth: 640, margin: '0 auto 32px' }}>
        <div style={{
          fontFamily: FONTS.mono, fontSize: 10, color: COLORS.muted,
          textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16, textAlign: 'center',
        }}>Current Insights</div>
        {STATIC_INSIGHTS.map((insight, i) => (
          <div key={i} style={{
            padding: '16px 20px', marginBottom: 12,
            background: 'rgba(4,20,16,0.75)',
            border: `1px solid ${COLORS.border}`,
            borderLeft: `3px solid ${i === 0 ? '#38bdf8' : i === 1 ? '#2dd4bf' : '#34d399'}`,
            borderRadius: 10,
            fontFamily: FONTS.serif, fontStyle: 'italic',
            fontSize: 13, color: 'rgba(200,237,231,0.85)',
            lineHeight: 1.6,
            animation: `fadeUp 0.4s ease ${i * 0.1}s both`,
          }}>
            {insight}
          </div>
        ))}
      </div>

      {/* Ask input */}
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <form onSubmit={handleAsk} style={{ marginBottom: 20 }}>
          <div style={{
            display: 'flex', gap: 12,
            background: 'rgba(4,20,16,0.75)',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 50, padding: '6px 6px 6px 20px',
          }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ask your travel buddy..."
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontFamily: FONTS.mono, fontSize: 13, color: COLORS.text,
              }}
            />
            <button type="submit" style={{
              padding: '8px 20px', borderRadius: 40,
              background: 'rgba(45,212,191,0.15)',
              border: `1px solid rgba(45,212,191,0.4)`,
              color: COLORS.teal, fontFamily: FONTS.mono, fontSize: 12, cursor: 'pointer',
            }}>Ask →</button>
          </div>
        </form>

        {response && (
          <div style={{
            padding: '16px 20px',
            background: 'rgba(56,189,248,0.06)',
            border: '1px solid rgba(56,189,248,0.2)',
            borderTop: '2px solid #38bdf8',
            borderRadius: 12,
            fontFamily: FONTS.serif, fontStyle: 'italic',
            fontSize: 13, color: 'rgba(200,237,231,0.9)',
            lineHeight: 1.6,
            animation: 'fadeUp 0.4s ease',
          }}>
            {response}
          </div>
        )}

        {/* V2 note */}
        <div style={{
          marginTop: 32, padding: '14px 20px',
          background: 'rgba(4,20,16,0.4)',
          border: `1px solid ${COLORS.border}`,
          borderRadius: 10, textAlign: 'center',
          fontFamily: FONTS.serif, fontStyle: 'italic',
          fontSize: 12, color: COLORS.muted,
        }}>
          Gemma 4 AI integration coming in v2 — real-time analysis of your travel patterns, smart booking suggestions, and budget-aware trip planning.
        </div>
      </div>
    </div>
  )
}
