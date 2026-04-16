import { useEffect, useState } from 'react'
import TripCard from '../components/TripCard'
import { useStore } from '../store'
import { tripsAPI, citiesAPI, type TripRead, type CityRead } from '../services/api'
import { COLORS, FONTS, TRAVEX_GRADIENT } from '../tokens'

type ModeFilter = 'all' | 'air' | 'train' | 'bus' | 'road'

export default function TripsPage() {
  const { cities, setCities } = useStore()

  const [trips, setTrips]         = useState<TripRead[]>([])
  const [total, setTotal]         = useState(0)
  const [mode, setMode]           = useState<ModeFilter>('all')
  const [year, setYear]           = useState<number | undefined>(undefined)
  const [showAdd, setShowAdd]     = useState(false)
  const [loading, setLoading]     = useState(false)

  // Form state
  const [fromCityId, setFromCityId] = useState('')
  const [toCityId,   setToCityId]   = useState('')
  const [tripMode,   setTripMode]   = useState('air')
  const [travelDate, setTravelDate] = useState('')
  const [costInr,    setCostInr]    = useState('')
  const [notes,      setNotes]      = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchTrips = () => {
    setLoading(true)
    const params: Record<string, string | number> = { limit: 50, offset: 0 }
    if (mode !== 'all') params.mode = mode
    if (year) params.year = year
    tripsAPI.list(params)
      .then(r => { setTrips(r.data.trips); setTotal(r.data.total) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchTrips() }, [mode, year]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (cities.length === 0) {
      citiesAPI.list().then(r => setCities(r.data)).catch(() => {})
    }
  }, [cities.length, setCities])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await tripsAPI.create({
        from_city_id: parseInt(fromCityId),
        to_city_id:   parseInt(toCityId),
        mode:         tripMode,
        travel_date:  travelDate,
        cost_inr:     parseInt(costInr) || 0,
        notes:        notes || null,
      })
      setShowAdd(false)
      setFromCityId(''); setToCityId(''); setTravelDate('')
      setCostInr(''); setNotes(''); setTripMode('air')
      fetchTrips()
    } catch {
      // silent
    } finally {
      setSubmitting(false)
    }
  }

  const modeButtons: { key: ModeFilter; label: string }[] = [
    { key: 'all',   label: 'All'   },
    { key: 'air',   label: '✈ Air' },
    { key: 'train', label: '🚆 Train' },
    { key: 'bus',   label: '🚌 Bus' },
  ]

  const inputStyle = {
    width: '100%', padding: '8px 12px',
    background: 'rgba(45,212,191,0.06)',
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8, color: COLORS.text,
    fontFamily: FONTS.mono, fontSize: 13,
    outline: 'none',
  }

  const labelStyle = {
    fontFamily: FONTS.mono, fontSize: 10,
    color: COLORS.muted, textTransform: 'uppercase' as const,
    letterSpacing: '0.08em', marginBottom: 4, display: 'block',
  }

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      padding: '24px 32px', overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24,
      }}>
        <div>
          <h1 style={{
            fontFamily: FONTS.display, fontSize: 24, fontWeight: 800,
            background: TRAVEX_GRADIENT,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: 4,
          }}>Trip Log</h1>
          <p style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.muted }}>
            {total} trips recorded
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            padding: '8px 20px', borderRadius: 20,
            background: 'rgba(45,212,191,0.12)',
            border: `1px solid rgba(45,212,191,0.4)`,
            color: COLORS.teal, fontFamily: FONTS.mono, fontSize: 12,
            cursor: 'pointer',
          }}
        >+ Add Trip</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {modeButtons.map(b => (
          <button
            key={b.key}
            onClick={() => setMode(b.key)}
            style={{
              padding: '6px 16px', borderRadius: 20, cursor: 'pointer',
              fontFamily: FONTS.mono, fontSize: 11,
              background: mode === b.key ? 'rgba(45,212,191,0.15)' : 'transparent',
              border: mode === b.key
                ? '1px solid rgba(45,212,191,0.5)'
                : `1px solid ${COLORS.border}`,
              color: mode === b.key ? COLORS.teal : COLORS.muted,
            }}
          >{b.label}</button>
        ))}
        <select
          value={year ?? ''}
          onChange={e => setYear(e.target.value ? parseInt(e.target.value) : undefined)}
          style={{
            ...inputStyle, width: 'auto', padding: '6px 12px',
            background: 'rgba(4,20,16,0.8)',
          }}
        >
          <option value="">All Years</option>
          {[2026, 2025, 2024].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Trip list */}
      <div className="glass-card" style={{ flex: 1 }}>
        {loading && (
          <div style={{ padding: 24, fontFamily: FONTS.mono, fontSize: 12, color: COLORS.muted, textAlign: 'center' }}>
            Loading...
          </div>
        )}
        {!loading && trips.length === 0 && (
          <div style={{ padding: 24, fontFamily: FONTS.mono, fontSize: 12, color: COLORS.muted, textAlign: 'center' }}>
            No trips found.
          </div>
        )}
        {trips.map(t => <TripCard key={t.id} trip={t} />)}
      </div>

      {/* Add Trip Modal */}
      {showAdd && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(4,13,10,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 480, background: 'rgba(4,20,16,0.95)',
            border: `1px solid ${COLORS.border}`,
            borderTop: `2px solid ${COLORS.teal}`,
            borderRadius: 16, padding: 32,
          }}>
            <h2 style={{
              fontFamily: FONTS.display, fontSize: 18, fontWeight: 700,
              background: TRAVEX_GRADIENT,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              marginBottom: 24,
            }}>Add New Trip</h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>From City</label>
                  <select value={fromCityId} onChange={e => setFromCityId(e.target.value)}
                    required style={{ ...inputStyle, background: 'rgba(4,13,10,0.9)' }}>
                    <option value="">Select city</option>
                    {cities.map((c: CityRead) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>To City</label>
                  <select value={toCityId} onChange={e => setToCityId(e.target.value)}
                    required style={{ ...inputStyle, background: 'rgba(4,13,10,0.9)' }}>
                    <option value="">Select city</option>
                    {cities.map((c: CityRead) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Mode</label>
                  <select value={tripMode} onChange={e => setTripMode(e.target.value)}
                    style={{ ...inputStyle, background: 'rgba(4,13,10,0.9)' }}>
                    <option value="air">Air</option>
                    <option value="train">Train</option>
                    <option value="bus">Bus</option>
                    <option value="road">Road</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Date</label>
                  <input type="date" value={travelDate} onChange={e => setTravelDate(e.target.value)}
                    required style={{ ...inputStyle, colorScheme: 'dark' }} />
                </div>
                <div>
                  <label style={labelStyle}>Cost (₹)</label>
                  <input type="number" value={costInr} onChange={e => setCostInr(e.target.value)}
                    placeholder="0" style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Notes (optional)</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Any notes..." style={inputStyle} />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" onClick={() => setShowAdd(false)} style={{
                  padding: '8px 20px', borderRadius: 20,
                  background: 'transparent',
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.muted, fontFamily: FONTS.mono, fontSize: 12,
                  cursor: 'pointer',
                }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{
                  padding: '8px 20px', borderRadius: 20,
                  background: 'rgba(45,212,191,0.15)',
                  border: `1px solid rgba(45,212,191,0.5)`,
                  color: COLORS.teal, fontFamily: FONTS.mono, fontSize: 12,
                  cursor: submitting ? 'wait' : 'pointer',
                  opacity: submitting ? 0.6 : 1,
                }}>
                  {submitting ? 'Saving...' : 'Save Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
