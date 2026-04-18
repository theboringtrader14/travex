import { useEffect, useRef, useMemo, useState } from 'react'
import Globe from 'react-globe.gl'
import * as topojson from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { ArcDef, CityRead } from '../services/api'

// ─── Mode colours (match Globe3D palette) ───────────────────────────────────
const MODE_COLOR: Record<string, string> = {
  air:   '#38bdf8',
  train: '#2dd4bf',
  bus:   '#34d399',
  road:  '#FFB300',
}

// ─── Internal data shapes (plain objects for react-globe.gl) ─────────────────
interface GlobeArc {
  startLat: number
  startLng: number
  endLat:   number
  endLng:   number
  color: string[]
  dashInitGap: number
}

interface GlobeCity {
  lat:  number
  lng:  number
  name: string
}

// ─── Props ───────────────────────────────────────────────────────────────────
interface NetworkGlobeProps {
  cities:       CityRead[]
  arcs:         ArcDef[]
  width?:       number
  height?:      number
  arcColor?:    string   // fallback colour when mode not matched
  arcWidth?:    number   // stroke width, 0.3–1.5
  arcGlow?:     number   // px for CSS drop-shadow
  arcDensity?:  number   // 0–100, percentage of arcs to show
  citySize?:    number   // multiplier for point + ring radius
  pulseSpeed?:  number   // seconds per ring repeat
  showArcs?:    boolean
  showCities?:  boolean
  showLabels?:  boolean
}

// ─── Component ───────────────────────────────────────────────────────────────
export function NetworkGlobe({
  cities,
  arcs,
  width  = 800,
  height = 800,
  arcColor   = '#2dd4bf',
  arcWidth   = 0.6,
  arcGlow    = 13,
  arcDensity = 100,
  citySize   = 1.0,
  pulseSpeed = 3.4,
  showArcs   = true,
  showCities = true,
  showLabels = true,
}: NetworkGlobeProps) {
  const globeRef = useRef<any>(null)
  const [hexPolygons, setHexPolygons] = useState<object[]>([])

  // ── Load dotted-continent hex polygons from world-atlas ───────────────────
  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      .then((topo: Topology) => {
        const land = topojson.feature(topo, topo.objects['countries'] as GeometryCollection)
        const features = (land.features as object[]).filter((f: object) => {
          const feat = f as { geometry?: { coordinates: unknown } }
          if (!feat.geometry) return false
          // Skip Antarctica and extreme southern polygons
          const coordStr = JSON.stringify(feat.geometry.coordinates)
          if (coordStr.includes('-8') && (coordStr.includes('-80') || coordStr.includes('-85') || coordStr.includes('-90'))) return false
          return true
        })
        setHexPolygons(features)
      })
      .catch(() => {/* degrade silently */})
  }, [])

  // ── Globe setup: auto-rotate, disable zoom, initial altitude ─────────────
  useEffect(() => {
    if (!globeRef.current) return
    const controls = globeRef.current.controls()
    if (controls) {
      controls.autoRotate      = true
      controls.autoRotateSpeed = 0.28
      controls.enableZoom      = false
    }
    globeRef.current.pointOfView({ altitude: 2.2 }, 0)
  }, [])

  // ── Arc data ──────────────────────────────────────────────────────────────
  const globeArcs: GlobeArc[] = useMemo(() => {
    const keepCount = Math.max(1, Math.ceil(arcs.length * (arcDensity / 100)))
    return arcs.slice(0, keepCount).map(a => {
      const col = MODE_COLOR[a.mode] ?? arcColor
      return {
        startLat:    a.from.lat,
        startLng:    a.from.lng,
        endLat:      a.to.lat,
        endLng:      a.to.lng,
        color:       [col, col],
        dashInitGap: Math.random(),
      }
    })
  }, [arcs, arcDensity, arcColor])

  // ── City points ───────────────────────────────────────────────────────────
  const globeCities: GlobeCity[] = useMemo(
    () => cities.map(c => ({ lat: c.lat, lng: c.lng, name: c.name })),
    [cities]
  )

  // ── Pulse rings ───────────────────────────────────────────────────────────
  const rings = useMemo(
    () => globeCities.map(c => ({
      lat:              c.lat,
      lng:              c.lng,
      maxR:             4 * citySize,
      propagationSpeed: 0.9,
      repeatPeriod:     pulseSpeed * 1000,
    })),
    [globeCities, citySize, pulseSpeed]
  )

  const glowStyle: React.CSSProperties = {
    filter: arcGlow > 0 ? `drop-shadow(0 0 ${arcGlow}px ${arcColor}66)` : undefined,
  }

  return (
    <div style={glowStyle}>
      <Globe
        ref={globeRef}
        width={width}
        height={height}
        backgroundColor="rgba(0,0,0,0)"

        // ── Globe surface ────────────────────────────────────────────────
        globeImageUrl={null}
        showGlobe={true}
        showGraticules={false}
        showAtmosphere={true}
        atmosphereColor="#2dd4bf"
        atmosphereAltitude={0.14}

        // ── Dotted hex-polygon continents ────────────────────────────────
        hexPolygonsData={hexPolygons}
        hexPolygonResolution={2}
        hexPolygonMargin={0.38}
        hexPolygonUseDots={true}
        hexPolygonColor={() => 'rgba(45,212,191,0.40)'}
        hexPolygonAltitude={0.001}

        // ── Arcs ─────────────────────────────────────────────────────────
        arcsData={showArcs ? globeArcs : []}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor="color"
        arcStroke={arcWidth}
        arcDashLength={0.38}
        arcDashGap={0.22}
        arcDashInitialGap="dashInitGap"
        arcDashAnimateTime={2800}
        arcAltitude={0.28}
        arcAltitudeAutoScale={0.45}

        // ── City dots ────────────────────────────────────────────────────
        pointsData={showCities ? globeCities : []}
        pointLat="lat"
        pointLng="lng"
        pointColor={() => '#2dd4bf'}
        pointAltitude={0.005}
        pointRadius={0.22 * citySize}
        pointsMerge={false}

        // ── Pulse rings ───────────────────────────────────────────────────
        ringsData={showCities ? rings : []}
        ringColor={() => (t: number) => `rgba(45,212,191,${(1 - t) * 0.8})`}
        ringMaxRadius="maxR"
        ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod="repeatPeriod"
        ringAltitude={0.001}

        // ── City labels ───────────────────────────────────────────────────
        labelsData={showLabels ? globeCities : []}
        labelLat="lat"
        labelLng="lng"
        labelText={(c: object) => (c as GlobeCity).name.toUpperCase()}
        labelSize={0.42}
        labelColor={() => 'rgba(230,240,255,0.88)'}
        labelResolution={2}
        labelAltitude={0.012}
        labelDotRadius={0}
      />
    </div>
  )
}
