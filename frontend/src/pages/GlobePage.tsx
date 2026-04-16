import { useEffect } from 'react'
import Globe3D from '../components/Globe3D'
import StatCard from '../components/StatCard'
import ModeBars from '../components/ModeBars'
import TripCard from '../components/TripCard'
import AiBuddyCard from '../components/AiBuddyCard'
import { useStore } from '../store'
import { tripsAPI, citiesAPI, statsAPI } from '../services/api'
import { COLORS, FONTS } from '../tokens'

export default function GlobePage() {
  const { trips, cities, stats, arcs, setTrips, setCities, setStats, setArcs } = useStore()

  useEffect(() => {
    citiesAPI.list().then(r => setCities(r.data)).catch(() => {})
    statsAPI.summary().then(r => setStats(r.data)).catch(() => {})
    statsAPI.arcs().then(r => setArcs(r.data)).catch(() => {})
    tripsAPI.list({ limit: 5 }).then(r => setTrips(r.data.trips)).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const recentTrips = stats?.recent_trips ?? trips.slice(0, 5)

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '220px 1fr 240px',
      flex: 1,
      overflow: 'hidden',
      height: '100%',
    }}>

      {/* Left panel — Stats */}
      <div style={{
        padding: '20px 16px',
        overflowY: 'auto',
        borderRight: `1px solid ${COLORS.border}`,
        animation: 'fadeUp 0.6s ease',
      }}>
        <StatCard
          label="Total Trips"
          value={stats?.total_trips ?? '—'}
          sub="lifetime journeys"
        />
        <StatCard
          label="Cities Visited"
          value={stats?.total_cities ?? '—'}
          sub="unique destinations"
        />
        <StatCard
          label="Total Spent"
          value={stats ? `₹${(stats.lifetime_spend_inr / 100000).toFixed(1)}L` : '—'}
          sub="travel spend"
        />
        <div style={{ marginTop: 20 }}>
          <ModeBars
            byMode={stats?.by_mode ?? {}}
            totalTrips={stats?.total_trips ?? 0}
          />
        </div>
      </div>

      {/* Center — Globe */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <Globe3D arcs={arcs} cities={cities} />
      </div>

      {/* Right panel — Recent trips */}
      <div style={{
        borderLeft: `1px solid ${COLORS.border}`,
        overflowY: 'auto',
        animation: 'fadeUp 0.6s ease',
      }}>
        <div style={{
          padding: '16px 16px 8px',
          fontFamily: FONTS.mono, fontSize: 10,
          color: COLORS.muted,
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          Recent Trips
        </div>
        {recentTrips.map(t => <TripCard key={t.id} trip={t} compact />)}
        <div style={{ padding: '0 12px' }}>
          <AiBuddyCard />
        </div>
      </div>
    </div>
  )
}
