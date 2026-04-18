import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

interface City {
  name: string
  lat: number
  lng: number
}

interface Trip {
  fromLat: number
  fromLng: number
  toLat: number
  toLng: number
}

interface MapboxGlobeProps {
  cities: City[]
  trips: Trip[]
  width?: number
  height?: number
}

const TRAVEX_TEAL = '#2dd4bf'

export function MapboxGlobe({ cities, trips, width, height }: MapboxGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const token = import.meta.env.VITE_MAPBOX_TOKEN

  useEffect(() => {
    if (!token) {
      console.warn('[MapboxGlobe] VITE_MAPBOX_TOKEN missing — globe will not render. Get free token at mapbox.com')
      return
    }
    if (!containerRef.current || mapRef.current) return

    mapboxgl.accessToken = token

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      projection: { name: 'globe' } as any,
      center: [78.9629, 20.5937],
      zoom: 1.4,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
      antialias: true,
    })

    mapRef.current = map

    map.on('style.load', () => {
      map.setFog({
        'range': [0.5, 10],
        'color': 'rgba(45, 212, 191, 0.08)',
        'horizon-blend': 0.08,
        'high-color': '#0b0f14',
        'space-color': '#000000',
        'star-intensity': 0.15,
      })

      if (map.getLayer('country-label')) {
        map.setPaintProperty('country-label', 'text-color', 'rgba(255,255,255,0.7)')
      }

      addAdminBoundaries(map)
      addCityMarkers(map, cities)
      addTravelArcs(map, trips)
      startAutoRotation(map)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [token])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    if (map.getSource('cities')) {
      ;(map.getSource('cities') as mapboxgl.GeoJSONSource).setData(citiesToGeoJSON(cities))
    }
  }, [cities])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    if (map.getSource('arcs')) {
      ;(map.getSource('arcs') as mapboxgl.GeoJSONSource).setData(tripsToArcsGeoJSON(trips))
    }
  }, [trips])

  if (!token) {
    return (
      <div style={{
        width: width || '100%',
        height: height || '100%',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '12px',
        color: 'rgba(255,255,255,0.5)',
        fontFamily: 'monospace',
        fontSize: '13px',
        textAlign: 'center',
        padding: '24px',
      }}>
        <div style={{ fontSize: '32px' }}>🗺️</div>
        <div style={{ color: '#2dd4bf' }}>MapboxGlobe — token required</div>
        <div>Add VITE_MAPBOX_TOKEN to .env</div>
        <div style={{ opacity: 0.5 }}>Get a free token at account.mapbox.com</div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: width || '100%',
        height: height || '100%',
        background: '#000',
      }}
    />
  )
}

function addAdminBoundaries(map: mapboxgl.Map) {
  map.addLayer({
    id: 'travex-land-frost',
    type: 'fill',
    source: 'composite',
    'source-layer': 'land',
    paint: {
      'fill-color': 'rgba(255,255,255,0.035)',
      'fill-opacity': 1,
    },
  }, 'water')

  map.addLayer({
    id: 'travex-country-borders',
    type: 'line',
    source: 'composite',
    'source-layer': 'admin',
    filter: ['==', 'admin_level', 0],
    paint: {
      'line-color': 'rgba(255,255,255,0.35)',
      'line-width': 0.6,
    },
  })

  map.addLayer({
    id: 'travex-state-borders',
    type: 'line',
    source: 'composite',
    'source-layer': 'admin',
    filter: ['==', 'admin_level', 1],
    paint: {
      'line-color': 'rgba(255,255,255,0.18)',
      'line-width': 0.3,
    },
  })

  map.addLayer({
    id: 'travex-district-borders',
    type: 'line',
    source: 'composite',
    'source-layer': 'admin',
    filter: ['==', 'admin_level', 2],
    minzoom: 3,
    paint: {
      'line-color': 'rgba(255,255,255,0.1)',
      'line-width': 0.15,
    },
  })

  // India districts custom layer — fetch gracefully, skip on failure
  fetch('/india-districts.geojson')
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json()
    })
    .then(data => {
      if (map.getSource('india-districts')) return
      map.addSource('india-districts', { type: 'geojson', data })
      map.addLayer({
        id: 'travex-india-district-fill',
        type: 'fill',
        source: 'india-districts',
        minzoom: 2,
        paint: {
          'fill-color': 'rgba(255,255,255,0.02)',
          'fill-outline-color': 'rgba(255,255,255,0.08)',
        },
      })
      map.addLayer({
        id: 'travex-india-district-borders',
        type: 'line',
        source: 'india-districts',
        minzoom: 2,
        paint: {
          'line-color': 'rgba(255,255,255,0.2)',
          'line-width': 0.25,
        },
      })
    })
    .catch(() => {
      console.warn('[MapboxGlobe] india-districts.geojson not found — skipping India district layer')
    })
}

function citiesToGeoJSON(cities: City[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: cities.map(c => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
      properties: { name: c.name },
    })),
  }
}

function addCityMarkers(map: mapboxgl.Map, cities: City[]) {
  map.addSource('cities', { type: 'geojson', data: citiesToGeoJSON(cities) })

  map.addLayer({
    id: 'travex-city-pulse',
    type: 'circle',
    source: 'cities',
    paint: {
      'circle-radius': 8,
      'circle-color': TRAVEX_TEAL,
      'circle-opacity': 0.15,
      'circle-blur': 0.5,
    },
  })

  map.addLayer({
    id: 'travex-city-dot',
    type: 'circle',
    source: 'cities',
    paint: {
      'circle-radius': 3,
      'circle-color': TRAVEX_TEAL,
      'circle-stroke-color': '#fff',
      'circle-stroke-width': 1,
    },
  })

  map.addLayer({
    id: 'travex-city-labels',
    type: 'symbol',
    source: 'cities',
    layout: {
      'text-field': ['get', 'name'],
      'text-size': 11,
      'text-offset': [0, 1.2],
      'text-anchor': 'top',
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
    },
    paint: {
      'text-color': 'rgba(230,245,255,0.9)',
      'text-halo-color': 'rgba(0,0,0,0.85)',
      'text-halo-width': 1.2,
    },
  })
}

function tripsToArcsGeoJSON(trips: Trip[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = trips.map(t => {
    const points: [number, number][] = []
    const n = 50
    for (let i = 0; i <= n; i++) {
      const f = i / n
      const lng = t.fromLng + (t.toLng - t.fromLng) * f
      const lat = t.fromLat + (t.toLat - t.fromLat) * f
      points.push([lng, lat])
    }
    return {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: points },
      properties: {},
    }
  })

  return { type: 'FeatureCollection', features }
}

function addTravelArcs(map: mapboxgl.Map, trips: Trip[]) {
  map.addSource('arcs', { type: 'geojson', data: tripsToArcsGeoJSON(trips) })

  map.addLayer({
    id: 'travex-arc-glow',
    type: 'line',
    source: 'arcs',
    paint: {
      'line-color': TRAVEX_TEAL,
      'line-width': 3,
      'line-opacity': 0.15,
      'line-blur': 3,
    },
  })

  map.addLayer({
    id: 'travex-arc-core',
    type: 'line',
    source: 'arcs',
    paint: {
      'line-color': TRAVEX_TEAL,
      'line-width': 1.2,
      'line-opacity': 0.8,
    },
  })
}

function startAutoRotation(map: mapboxgl.Map) {
  let spinning = true

  map.on('mousedown', () => (spinning = false))
  map.on('touchstart', () => (spinning = false))

  function spin() {
    if (!spinning) return
    const center = map.getCenter()
    center.lng = (center.lng + 0.08) % 360
    map.easeTo({ center, duration: 1000, easing: (n: number) => n })
    setTimeout(spin, 1000)
  }
  spin()
}
