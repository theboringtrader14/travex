import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import * as topojson from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { ArcDef, CityRead } from '../services/api'
import { MODE_COLORS } from '../tokens'

void MODE_COLORS  // suppress unused warning

const COUNTRIES_TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
const COUNTRIES_GEOJSON_URL = 'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson'

function latLngToVec3(lat: number, lng: number, radius = 1.001): THREE.Vector3 {
  const phi   = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
     radius * Math.cos(phi),
     radius * Math.sin(phi) * Math.sin(theta)
  )
}

const MODE_HEX: Record<string, number> = {
  air: 0x38bdf8, train: 0x2dd4bf, bus: 0x34d399, road: 0xFFB300,
}
const HEIGHT_FACTOR: Record<string, number> = {
  air: 0.5, train: 0.25, bus: 0.12, road: 0.12,
}

// IMPROVEMENT 2 — Emoji sprite helper
function makeIconSprite(emoji: string, size = 64): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.font = `${size * 0.7}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emoji, size / 2, size / 2)
  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(0.08, 0.08, 0.08)
  return sprite
}

const MODE_EMOJI: Record<string, string> = {
  air: '✈', train: '🚂', bus: '🚌', road: '🚗',
}

// Atmosphere shaders
const ATMO_VERT = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const ATMO_FRAG = `
  varying vec3 vNormal;
  void main() {
    float intensity = pow(0.8 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
    vec3 col = mix(vec3(0.0, 0.58, 0.80), vec3(0.22, 0.83, 0.75), intensity);
    gl_FragColor = vec4(col, intensity * 0.6);
  }
`

function addCountryLines(topo: Topology, group: THREE.Group): void {
  const countries = topojson.feature(topo, topo.objects['countries'] as GeometryCollection)
  const mat = new THREE.LineBasicMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.4 })
  let count = 0
  countries.features.forEach(feature => {
    if (!feature.geometry) return
    const coords: number[][][][] =
      feature.geometry.type === 'Polygon'
        ? [feature.geometry.coordinates as number[][][]]
        : feature.geometry.type === 'MultiPolygon'
        ? feature.geometry.coordinates as number[][][][]
        : []
    coords.forEach(poly => {
      poly.forEach(ring => {
        const pts = (ring as [number, number][]).map(([lng, lat]) => latLngToVec3(lat, lng, 1.001))
        if (pts.length < 2) return
        group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat))
        count++
      })
    })
  })
  console.log('[Globe] country lines added (TopoJSON):', count)
}

// IMPROVEMENT 4 — addGeoJsonLines now accepts explicit color/opacity params
function addGeoJsonLines(
  geoJson: { features: Array<{ geometry: { type: string; coordinates: unknown } }> },
  group: THREE.Group,
  color: number = 0x2dd4bf,
  opacity: number = 0.4
): void {
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity })
  let count = 0
  geoJson.features.forEach(feature => {
    const geom = feature.geometry
    if (!geom) return
    const polys: number[][][][] =
      geom.type === 'Polygon'
        ? [geom.coordinates as number[][][]]
        : geom.type === 'MultiPolygon'
        ? geom.coordinates as number[][][][]
        : []
    polys.forEach(poly => {
      poly.forEach(ring => {
        const pts = (ring as [number, number][]).map(([lng, lat]) => latLngToVec3(lat, lng, 1.001))
        if (pts.length < 2) return
        group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat))
        count++
      })
    })
  })
  console.log('[Globe] lines added (GeoJSON):', count)
}

function addGridLines(group: THREE.Group): void {
  const mat = new THREE.LineBasicMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.06 })
  // Latitude lines
  for (let lat = -75; lat <= 75; lat += 15) {
    const pts: THREE.Vector3[] = []
    for (let lng = -180; lng <= 180; lng += 3) pts.push(latLngToVec3(lat, lng, 1.001))
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat))
  }
  // Longitude lines
  for (let lng = -180; lng < 180; lng += 15) {
    const pts: THREE.Vector3[] = []
    for (let lat = -90; lat <= 90; lat += 3) pts.push(latLngToVec3(lat, lng, 1.001))
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat))
  }
}

interface Props {
  arcs: ArcDef[]
  cities: CityRead[]
}

export default function Globe3D({ arcs, cities }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const latRef    = useRef<HTMLSpanElement>(null)
  const lngRef    = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const W = canvas.offsetWidth  || 800
    const H = canvas.offsetHeight || 600
    const R = 1

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H)
    renderer.setClearColor(0x000000, 0)

    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100)
    camera.position.set(0, 0.3, 2.8)
    camera.lookAt(0, 0, 0)

    // Globe group — all surface elements rotate together
    const globeGroup = new THREE.Group()
    scene.add(globeGroup)

    // 1. Dark base sphere
    globeGroup.add(new THREE.Mesh(
      new THREE.SphereGeometry(R, 64, 64),
      new THREE.MeshPhongMaterial({
        color:    0x040d14,
        emissive: new THREE.Color(0x020a10),
        emissiveIntensity: 1.0,
      })
    ))

    // 2. Wireframe overlay (subtle)
    globeGroup.add(new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.0005, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0x2dd4bf, wireframe: true, transparent: true, opacity: 0.02 })
    ))

    // 3. Grid lines
    addGridLines(globeGroup)

    // 4. Country outlines (async fetch — TopoJSON CDN, fall back to GeoJSON)
    fetch(COUNTRIES_TOPO_URL)
      .then(r => {
        if (!r.ok) throw new Error(`TopoJSON fetch failed: ${r.status}`)
        console.log('[Globe] TopoJSON CDN fetch: 200 OK')
        return r.json()
      })
      .then((topo: Topology) => addCountryLines(topo, globeGroup))
      .catch((err) => {
        console.warn('[Globe] TopoJSON CDN failed, trying GeoJSON fallback:', err)
        fetch(COUNTRIES_GEOJSON_URL)
          .then(r => {
            if (!r.ok) throw new Error(`GeoJSON fetch failed: ${r.status}`)
            console.log('[Globe] GeoJSON fallback fetch: 200 OK')
            return r.json()
          })
          .then(data => addGeoJsonLines(data, globeGroup, 0x2dd4bf, 0.4))
          .catch(e => console.error('[Globe] Both CDN sources failed:', e))
      })

    // IMPROVEMENT 4 — India state boundaries
    const INDIA_STATES_URL = 'https://cdn.jsdelivr.net/npm/india-geojson@0.1.0/india.json'

    fetch(INDIA_STATES_URL)
      .then(r => {
        if (!r.ok) throw new Error(`India states fetch failed: ${r.status}`)
        return r.json()
      })
      .then(data => {
        const features = data.features || (data.type === 'Feature' ? [data] : [])
        if (features.length > 0) {
          addGeoJsonLines(data, globeGroup, 0x2dd4bf, 0.2)
          console.log('[Globe] India state lines added:', features.length, 'features')
        } else {
          throw new Error('No features found')
        }
      })
      .catch(() => {
        const INDIA_APPROX: [number, number, number, number][] = [
          [68, 8, 78, 18],
          [72, 18, 80, 26],
          [76, 26, 88, 34],
          [88, 20, 95, 28],
          [70, 22, 76, 28],
        ]
        const boxMat = new THREE.LineBasicMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.15 })
        INDIA_APPROX.forEach(([w, s, e, n]) => {
          const corners = [
            latLngToVec3(s, w, 1.001), latLngToVec3(n, w, 1.001),
            latLngToVec3(n, e, 1.001), latLngToVec3(s, e, 1.001),
            latLngToVec3(s, w, 1.001),
          ]
          globeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(corners), boxMat))
        })
        console.log('[Globe] India states: CDN failed, using approximate boxes')
      })

    // 5. Atmosphere glow
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.15, 64, 64),
      new THREE.ShaderMaterial({
        vertexShader:   ATMO_VERT,
        fragmentShader: ATMO_FRAG,
        side:        THREE.BackSide,
        transparent: true,
        blending:    THREE.AdditiveBlending,
        depthWrite:  false,
      })
    ))

    // 6. Lighting
    scene.add(new THREE.AmbientLight(0x0a1628, 0.4))
    const dir = new THREE.DirectionalLight(0x38bdf8, 0.6)
    dir.position.set(5, 3, 5)
    scene.add(dir)
    const pt = new THREE.PointLight(0x2dd4bf, 0.3, 10)
    pt.position.set(-3, -2, -3)
    scene.add(pt)

    // 7. Stars
    const sCnt = 1500
    const sPos = new Float32Array(sCnt * 3)
    for (let i = 0; i < sCnt; i++) {
      const r = 8 + Math.random() * 12
      const t = Math.random() * Math.PI * 2
      const p = Math.acos(Math.random() * 2 - 1)
      sPos[i*3]   = r * Math.sin(p) * Math.cos(t)
      sPos[i*3+1] = r * Math.cos(p)
      sPos[i*3+2] = r * Math.sin(p) * Math.sin(t)
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sPos, 3))
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.025, transparent: true, opacity: 0.5,
    })))

    // 8. Travel arcs — added to globeGroup (rotate with globe)
    // IMPROVEMENT 2 — dot is now THREE.Sprite instead of THREE.Mesh
    interface ArcObject {
      tube: THREE.Mesh
      dot:  THREE.Sprite
      points: THREE.Vector3[]
      progress: number
      delay:    number
      speed:    number
    }
    const arcObjects: ArcObject[] = arcs.map((arc, i) => {
      const p1  = latLngToVec3(arc.from.lat, arc.from.lng, R)
      const p2  = latLngToVec3(arc.to.lat,   arc.to.lng,   R)
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5)
      const dist = p1.distanceTo(p2)
      const hf  = HEIGHT_FACTOR[arc.mode] ?? 0.2
      mid.normalize().multiplyScalar(R + dist * hf)

      const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2)
      const pts   = curve.getPoints(80)
      const tube  = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 60, 0.004, 4, false),
        new THREE.MeshBasicMaterial({
          color: MODE_HEX[arc.mode] ?? 0xffffff,
          transparent: true, opacity: 0.85,
        })
      )
      tube.visible = false
      globeGroup.add(tube)

      // IMPROVEMENT 2 — train dashed track lines
      if (arc.mode === 'train') {
        const dashMat = new THREE.LineBasicMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.3 })
        for (let d = 5; d < pts.length - 5; d += 8) {
          const p = pts[d]
          const dir = pts[d + 1].clone().sub(pts[d - 1]).normalize()
          const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize().multiplyScalar(0.025)
          const dashPts = [p.clone().add(perp), p.clone().sub(perp)]
          globeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(dashPts), dashMat))
        }
      }

      // IMPROVEMENT 2 — emoji sprite instead of sphere dot
      const dot = makeIconSprite(MODE_EMOJI[arc.mode] ?? '●')
      globeGroup.add(dot)

      // IMPROVEMENT 3 — staggered starts + slower speed
      return {
        tube,
        dot,
        points: pts,
        progress: (i * 0.3) % 1.0,
        delay: i * 0.4,
        speed: 0.0015 + Math.random() * 0.001,
      }
    })

    // 9. City markers — children of globeGroup
    interface CityNode { ring: THREE.Mesh; dot: THREE.Mesh }
    const cityNodes: CityNode[] = cities.map((city) => {
      const pos = latLngToVec3(city.lat, city.lng, R * 1.002)

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.012, 0.018, 16),
        new THREE.MeshBasicMaterial({
          color: 0x2dd4bf, transparent: true, opacity: 0.9, side: THREE.DoubleSide,
        })
      )
      ring.position.copy(pos)
      ring.lookAt(pos.clone().multiplyScalar(2))
      globeGroup.add(ring)

      const dotM = new THREE.Mesh(
        new THREE.SphereGeometry(0.008, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x2dd4bf })
      )
      dotM.position.copy(pos)
      globeGroup.add(dotM)

      return { ring, dot: dotM }
    })
    console.log('[Globe] city markers added:', cities.length)

    // Drag
    let rotY = 0, rotX = 0
    let isDragging = false, lastX = 0, lastY = 0
    const onMouseDown = (e: MouseEvent) => { isDragging = true; lastX = e.clientX; lastY = e.clientY }
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      rotY += (e.clientX - lastX) * 0.005
      rotX  = Math.max(-0.8, Math.min(0.8, rotX + (e.clientY - lastY) * 0.005))
      lastX = e.clientX; lastY = e.clientY
    }
    const onMouseUp = () => { isDragging = false }
    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)

    // Animation loop
    let animId = 0
    const clock = new THREE.Clock()

    const animate = () => {
      animId = requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()

      // IMPROVEMENT 1 — rotation slowed by 50% (0.06 → 0.03)
      globeGroup.rotation.y = elapsed * 0.03 + rotY
      globeGroup.rotation.x = rotX

      // Arc traveller dots
      arcObjects.forEach((arc) => {
        if (elapsed < arc.delay) return
        if (!arc.tube.visible) arc.tube.visible = true
        arc.progress = (arc.progress + arc.speed) % 1
        const idx = Math.floor(arc.progress * (arc.points.length - 1))
        arc.dot.position.copy(arc.points[idx])
      })

      // City marker pulse (scale)
      cityNodes.forEach((n, i) => {
        const s = 0.9 + 0.1 * Math.sin(elapsed * 2 + i * 0.7)
        n.ring.scale.setScalar(s)
        n.dot.scale.setScalar(s)
      })

      // HUD
      const lat = (Math.sin(elapsed * 0.1) * 28.6).toFixed(2)
      const lng = (Math.cos(elapsed * 0.08) * 77.2).toFixed(2)
      if (latRef.current) latRef.current.textContent = `${lat}°N`
      if (lngRef.current) lngRef.current.textContent = `${lng}°E`

      renderer.render(scene, camera)
    }
    animate()

    // Resize
    const resizeObs = new ResizeObserver(() => {
      const w = canvas.offsetWidth, h = canvas.offsetHeight
      if (w === 0 || h === 0) return
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    })
    resizeObs.observe(canvas)

    return () => {
      cancelAnimationFrame(animId)
      resizeObs.disconnect()
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',   onMouseUp)
      scene.traverse((obj) => {
        if (
          obj instanceof THREE.Mesh ||
          obj instanceof THREE.Line ||
          obj instanceof THREE.Points ||
          obj instanceof THREE.Sprite
        ) {
          if ('geometry' in obj && obj.geometry) obj.geometry.dispose()
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
          mats.forEach((m: THREE.Material) => m.dispose())
        }
      })
      renderer.dispose()
    }
  }, [arcs, cities])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          cursor: 'grab',
        }}
      />

      {/* Arc legend — top center */}
      <div style={{
        position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 16,
        background: 'rgba(4,20,16,0.75)',
        border: '1px solid rgba(45,212,191,0.12)',
        borderRadius: 20, padding: '6px 16px',
        backdropFilter: 'blur(10px)',
        fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
      }}>
        {[
          { label: 'Air',   color: '#38bdf8' },
          { label: 'Train', color: '#2dd4bf' },
          { label: 'Bus',   color: '#34d399' },
        ].map(m => (
          <span key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(200,237,231,0.7)' }}>
            <span style={{
              width: 20, height: 2, background: m.color,
              borderRadius: 1, display: 'inline-block',
            }} />
            {m.label}
          </span>
        ))}
      </div>

      {/* Coord HUD — bottom center */}
      <div style={{
        position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
        color: 'rgba(45,212,191,0.5)',
        background: 'rgba(4,20,16,0.6)', padding: '4px 12px',
        borderRadius: 6, border: '1px solid rgba(45,212,191,0.08)',
      }}>
        Lat <span ref={latRef} style={{ color: '#2dd4bf' }}>--</span>
        {' '}· Lng <span ref={lngRef} style={{ color: '#2dd4bf' }}>--</span>
        {' '}· Alt <span style={{ color: '#2dd4bf' }}>35,000 ft</span>
      </div>
    </div>
  )
}
