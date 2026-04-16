import { useEffect } from 'react'
import Globe3D from '../components/Globe3D'
import StatCard from '../components/StatCard'
import ModeBars from '../components/ModeBars'
import { useStore } from '../store'
import { tripsAPI, citiesAPI, statsAPI } from '../services/api'
import { FONTS } from '../tokens'

export default function GlobePage() {
  const { cities, stats, arcs, setTrips, setCities, setStats, setArcs } = useStore()

  useEffect(() => {
    citiesAPI.list().then(r => setCities(r.data)).catch(() => {})
    statsAPI.summary().then(r => setStats(r.data)).catch(() => {})
    statsAPI.arcs().then(r => setArcs(r.data)).catch(() => {})
    tripsAPI.list({ limit: 5 }).then(r => setTrips(r.data.trips)).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    // FIX 4 — relative container so globe tracks parent, not full viewport
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      background: '#040d0a',
    }}>

      {/* Globe fills the entire viewport */}
      <Globe3D arcs={arcs} cities={cities} />

      {/* Bottom-left overlay — stat cards */}
      <div style={{
        position: 'absolute',
        bottom: 52,   // leave room above the coord HUD
        left: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: 200,
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
      </div>

      {/* Bottom-right overlay — mode legend / transport bars */}
      <div style={{
        position: 'absolute',
        bottom: 52,
        right: 20,
        width: 200,
        padding: '14px 16px',
        background: 'rgba(4,20,16,0.82)',
        border: '1px solid rgba(45,212,191,0.12)',
        borderRadius: 12,
        backdropFilter: 'blur(12px)',
        fontFamily: FONTS.mono,
        animation: 'fadeUp 0.6s ease',
      }}>
        <ModeBars
          byMode={stats?.by_mode ?? {}}
          totalTrips={stats?.total_trips ?? 0}
        />
      </div>
    </div>
  )
}
