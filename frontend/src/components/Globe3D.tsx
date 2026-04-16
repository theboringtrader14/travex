import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { ArcDef, CityRead } from '../services/api'
import { MODE_COLORS } from '../tokens'

interface Props {
  arcs:   ArcDef[]
  cities: CityRead[]
}

// Outside component — pure helper
function latLngToVec3(lat: number, lng: number, r: number): THREE.Vector3 {
  const phi   = (90 - lat) * Math.PI / 180
  const theta = (lng + 180) * Math.PI / 180
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  )
}

const MODE_HEX: Record<string, number> = {
  air:   0x38bdf8,
  train: 0x2dd4bf,
  bus:   0x34d399,
  road:  0xFFB300,
}

const HEIGHT_FACTOR: Record<string, number> = {
  air: 0.45, train: 0.22, bus: 0.12, road: 0.12,
}

// Vertex shader from reference HTML
const GLOBE_VERT = `
  uniform float time;
  varying vec3 vNormal;
  varying vec3 vPos;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Fragment shader from reference HTML
const GLOBE_FRAG = `
  uniform float time;
  uniform vec3 colorA;
  uniform vec3 colorB;
  uniform vec3 colorC;
  varying vec3 vNormal;
  varying vec3 vPos;
  void main() {
    float lat = vPos.y;
    float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
    vec3 base = mix(colorB, colorA, lat * 0.5 + 0.5);
    base = mix(colorC, base, 0.7);
    vec3 rim = colorA * 0.6;
    vec3 col = mix(base, rim, fresnel * 0.8);
    gl_FragColor = vec4(col, 0.92);
  }
`

// Atmosphere vertex shader
const ATMO_VERT = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Atmosphere fragment shader
const ATMO_FRAG = `
  uniform vec3 colorA;
  uniform vec3 colorB;
  varying vec3 vNormal;
  void main() {
    float intensity = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 4.0);
    vec3 col = mix(colorA, colorB, intensity);
    gl_FragColor = vec4(col, intensity * 0.55);
  }
`

// Suppress unused import warning for MODE_COLORS (used via MODE_HEX)
void MODE_COLORS

export default function Globe3D({ arcs, cities }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const latRef    = useRef<HTMLSpanElement>(null)
  const lngRef    = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const W = canvas.offsetWidth || 800
    const H = canvas.offsetHeight || 600
    const R = 1

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H)
    renderer.setClearColor(0x000000, 0)

    // Scene + Camera
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100)
    camera.position.set(0, 0.3, 2.8)
    camera.lookAt(0, 0, 0)

    // Globe mesh
    const globeMat = new THREE.ShaderMaterial({
      uniforms: {
        time:   { value: 0 },
        colorA: { value: new THREE.Color(0x0891b2) },
        colorB: { value: new THREE.Color(0x065f46) },
        colorC: { value: new THREE.Color(0x040d0a) },
      },
      vertexShader:   GLOBE_VERT,
      fragmentShader: GLOBE_FRAG,
      transparent: true,
    })
    const globe = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 64), globeMat)
    scene.add(globe)

    // Atmosphere
    const atmoMat = new THREE.ShaderMaterial({
      uniforms: {
        colorA: { value: new THREE.Color(0x2dd4bf) },
        colorB: { value: new THREE.Color(0x38bdf8) },
      },
      vertexShader:   ATMO_VERT,
      fragmentShader: ATMO_FRAG,
      side:        THREE.BackSide,
      transparent: true,
      blending:    THREE.AdditiveBlending,
      depthWrite:  false,
    })
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.08, 64, 64), atmoMat))

    // Wireframe
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.001, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0x2dd4bf, wireframe: true, transparent: true, opacity: 0.06 })
    ))

    // Lighting
    scene.add(new THREE.AmbientLight(0x2dd4bf, 0.3))
    const dir = new THREE.DirectionalLight(0x38bdf8, 0.8)
    dir.position.set(3, 2, 4)
    scene.add(dir)
    const rim = new THREE.DirectionalLight(0x34d399, 0.4)
    rim.position.set(-3, -1, -2)
    scene.add(rim)

    // Stars
    const sCnt = 1200
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

    // Build arcs
    interface ArcObject {
      line:    THREE.Line
      points:  THREE.Vector3[]
      dot:     THREE.Mesh
      progress: number
      delay:   number
      speed:   number
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
      const geo   = new THREE.BufferGeometry().setFromPoints(pts)
      const mat   = new THREE.LineBasicMaterial({
        color: MODE_HEX[arc.mode] ?? 0xffffff,
        transparent: true,
        opacity: 0.85,
      })
      const line  = new THREE.Line(geo, mat)
      line.visible = false
      scene.add(line)

      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 8, 8),
        new THREE.MeshBasicMaterial({ color: MODE_HEX[arc.mode] ?? 0xffffff })
      )
      scene.add(dot)

      return {
        line,
        points:   pts,
        dot,
        progress: Math.random(),
        delay:    i * 0.4,
        speed:    0.004 + Math.random() * 0.003,
      }
    })

    // Build city markers
    interface CityNode { ring: THREE.Mesh; dot: THREE.Mesh; pos: THREE.Vector3 }
    const cityNodes: CityNode[] = cities.map((city) => {
      const pos = latLngToVec3(city.lat, city.lng, R)

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.028, 0.036, 16),
        new THREE.MeshBasicMaterial({
          color: 0x2dd4bf, transparent: true, opacity: 0.8, side: THREE.DoubleSide,
        })
      )
      ring.position.copy(pos)
      ring.lookAt(pos.clone().multiplyScalar(2))
      scene.add(ring)

      const dotM = new THREE.Mesh(
        new THREE.SphereGeometry(0.014, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x2dd4bf })
      )
      dotM.position.copy(pos)
      scene.add(dotM)

      return { ring, dot: dotM, pos }
    })

    // Drag state
    let rotY = 0, rotX = 0
    let isDragging = false, lastX = 0, lastY = 0

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true
      lastX = e.clientX
      lastY = e.clientY
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      rotY += (e.clientX - lastX) * 0.005
      rotX  = Math.max(-0.8, Math.min(0.8, rotX + (e.clientY - lastY) * 0.005))
      lastX = e.clientX
      lastY = e.clientY
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

      globeMat.uniforms.time.value = elapsed
      globe.rotation.y = elapsed * 0.06 + rotY
      globe.rotation.x = rotX

      // Arcs + traveller dots
      arcObjects.forEach((arc) => {
        if (elapsed < arc.delay) return
        if (!arc.line.visible) arc.line.visible = true
        arc.progress = (arc.progress + arc.speed) % 1
        const idx = Math.floor(arc.progress * (arc.points.length - 1))
        const wp  = arc.points[idx].clone().applyEuler(globe.rotation)
        arc.dot.position.copy(wp)
        arc.line.rotation.copy(globe.rotation)
      })

      // City markers
      cityNodes.forEach((n, i) => {
        const pulse = 0.85 + 0.15 * Math.sin(elapsed * 2 + i * 0.7)
        n.ring.scale.setScalar(pulse)
        ;(n.ring.material as THREE.MeshBasicMaterial).opacity = 0.5 + 0.3 * Math.sin(elapsed * 1.5 + i)
        const bp = n.pos.clone().applyEuler(globe.rotation)
        n.ring.position.copy(bp)
        n.ring.lookAt(bp.clone().multiplyScalar(2))
        n.dot.position.copy(bp)
      })

      // HUD update via DOM refs — no React setState to avoid re-renders
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
          obj instanceof THREE.Points
        ) {
          obj.geometry.dispose()
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
          mats.forEach(m => m.dispose())
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
