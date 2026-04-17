# TRAVEX Living Spec
## Travel Intelligence Module — LIFEX Platform

---

## Module Purpose

TRAVEX is the travel intelligence module of the LIFEX personal intelligence suite. It allows the user to log air, train, bus, and road journeys, visualise them on an animated 3D globe (Three.js), and receive AI-powered travel suggestions that cross-reference their BUDGEX financial position.

---

## Architecture

### Backend
- **Framework:** FastAPI 0.115.0 with asynccontextmanager lifespan
- **ORM:** SQLAlchemy 2.0 async (create_async_engine, async_sessionmaker)
- **Driver:** asyncpg 0.29.0
- **Migrations:** Alembic 1.13.2 (version_table: `travex_alembic_version`)
- **Schema:** Pydantic v2 with ConfigDict(from_attributes=True)
- **Port:** 8004
- **Process:** python3.12 -m uvicorn app.main:app --host 0.0.0.0 --port 8004

### Frontend
- **Bundler:** Vite 5.4.2
- **Framework:** React 18.3.1 + TypeScript strict
- **State:** Zustand 4.5.4
- **3D:** Three.js r167 with @types/three
- **HTTP:** axios 1.7.5
- **Port:** 3004

### Database
- **Container:** staax_db (shared Docker Postgres)
- **DB name:** travex_db
- **User:** staax / staax_password
- **Host:** 127.0.0.1:5432

---

## Data Model

### cities table
| Column     | Type                  | Notes                    |
|------------|----------------------|--------------------------|
| id         | Integer PK            | autoincrement            |
| code       | String(6) UNIQUE      | IATA-style city code     |
| name       | String(100)           |                          |
| lat        | Float                 | decimal degrees          |
| lng        | Float                 | decimal degrees          |
| created_at | DateTime(timezone=True) | server_default now()   |

### trips table
| Column       | Type                  | Notes                        |
|-------------|----------------------|------------------------------|
| id           | Integer PK            | autoincrement                |
| from_city_id | Integer FK cities.id  |                              |
| to_city_id   | Integer FK cities.id  |                              |
| mode         | String(10)            | air / train / bus / road     |
| travel_date  | Date                  |                              |
| cost_inr     | Integer               | default 0                    |
| notes        | Text nullable         |                              |
| created_at   | DateTime(timezone=True) | server_default now()       |
| updated_at   | DateTime(timezone=True) | onupdate func.now()        |

---

## Seeded Data

### 11 Cities (via Alembic migration 0001)
```
BLR  Bangalore   12.97  77.59
DEL  Delhi       28.61  77.20
MUM  Mumbai      19.08  72.88
GOI  Goa         15.49  73.83
CHN  Chennai     13.08  80.27
HYD  Hyderabad   17.38  78.48
PNQ  Pune        18.52  73.85
AMD  Ahmedabad   23.02  72.57
CBE  Coimbatore  11.00  76.96
MYS  Mysore      12.29  76.64
OTY  Ooty        11.41  76.70
```

### 5 Demo Trips (seeded on first startup via seed_trips.py)
```
BLR → DEL  air    2026-04-03  ₹6,200
CHN → CBE  train  2026-03-21  ₹890
DEL → GOI  air    2026-03-08  ₹4,100
BLR → MYS  bus    2026-02-14  ₹220
MUM → PNQ  train  2026-01-29  ₹320
```

---

## Full API Surface

| Method | Path                  | Description                              |
|--------|----------------------|------------------------------------------|
| GET    | /health               | Health check + DB probe                  |
| GET    | /api/v1/cities        | List all cities ordered by name          |
| POST   | /api/v1/cities        | Create a city                            |
| GET    | /api/v1/trips         | List trips (mode, year, limit, offset)   |
| POST   | /api/v1/trips         | Create a trip (returns 201)              |
| GET    | /api/v1/trips/timeline| Grouped by year {year: [{from, to, mode, month}]} |
| GET    | /api/v1/trips/{id}    | Get single trip                          |
| PUT    | /api/v1/trips/{id}    | Partial update trip                      |
| DELETE | /api/v1/trips/{id}    | Delete trip, returns {ok: true}          |
| GET    | /api/v1/stats         | Full stats summary                       |
| GET    | /api/v1/stats/arcs    | Deduplicated arc pairs for Globe3D       |

**Route ordering note:** `/api/v1/trips/timeline` MUST be defined before `/api/v1/trips/{id}` — FastAPI uses first-match routing and would otherwise parse "timeline" as an integer ID.

---

## Globe3D Implementation Notes

### Shaders
- **Globe VertexShader:** Passes vNormal + vPos to fragment shader
- **Globe FragmentShader:** Latitude-based colour blend (cyan/dark green/deep), fresnel rim
- **Atmosphere VertexShader:** Standard normal passthrough
- **Atmosphere FragmentShader:** Fresnel intensity-based glow, BackSide + AdditiveBlending

### Globe Geometry
- SphereGeometry(1, 64, 64) for globe
- SphereGeometry(1.08, 64, 64) for atmosphere (BackSide)
- SphereGeometry(1.001, 24, 16) wireframe at opacity 0.06

### Country / State Boundaries (updated 2026-04-16)
- **Country outlines:** TopoJSON via CDN (world-atlas@2 + topojson-client) — 286 lines loaded ✅
- **India state boundaries:** CDN (geohacker/india) at opacity 0.2; `.catch()` is silent warn — no fallback boxes
- **Removed:** India approximate bounding-box fallback (was causing unwanted viewfinder marks on India)
- Debug log: `[Globe] TopoJSON CDN fetch: 200 OK`, country line count, city marker count
- Grid lines: 15° lat/lng, opacity 0.06

### Arcs (updated 2026-04-16)
- QuadraticBezierCurve3 with 80 points
- Height factors: air 0.45, train 0.22, bus 0.12, road 0.12
- Arc colour: air #38bdf8, train #2dd4bf, bus #34d399, road #FFB300
- Traveller dot: SphereGeometry(0.018) in matching mode colour
- Traveller speed: `progress += 0.0015 + random*0.001` (reduced from 0.003)
- Staggered starts: `(i * 0.3) % 1.0`
- Lines visible=false until elapsed >= arc.delay

### Transport Icons (updated 2026-04-16 — replaces emoji sprites)
- `makeTransportMesh(mode)` factory function — all geometric Three.js shapes
- **Air:** ShapeGeometry diamond (rotated square)
- **Train:** BoxGeometry (narrow box)
- **Bus:** BoxGeometry (wider box)
- Icons oriented along arc tangent: `quaternion.setFromUnitVectors(forward, tangent)`
- Train arcs get dashed crosshatch track lines (LineSegments)

### City Markers (updated 2026-04-16)
- RingGeometry(0.028, 0.036, 16) with DoubleSide material
- SphereGeometry(0.014) inner dot, both teal #2dd4bf
- `userData['isCityMarker'] = true` — used for selective cleanup on re-render
- Pulse animation: scale 0.85 + 0.15 * sin(elapsed * 2 + i * 0.7)
- Opacity: 0.5 + 0.3 * sin(elapsed * 1.5 + i)
- Both ring and dot re-positioned each frame to follow globe rotation
- **Race condition fix:** cities array added to `useEffect` dependency list

### Stars
- 1200 points scattered at radius 8-20
- PointsMaterial size 0.025, opacity 0.5

### Mouse Interaction
- Drag-to-rotate: mousedown/mousemove/mouseup
- rotX clamped to [-0.8, 0.8]
- Auto-rotation: `elapsed * 0.03` (reduced from 0.06 — half speed)

### Layout (updated 2026-04-16)
- GlobePage: `position: relative; height: 100%` (was `position: fixed`) — fills content area without overlapping topbar
- Renderer mounted to `mountRef` div via `renderer.domElement` append
- ResizeObserver on container div (not `window.resize`)

### HUD Update
- DOM refs (latRef, lngRef) updated inside animation loop — NO React setState
- Prevents unnecessary re-renders while globe animates

### Cleanup
- All THREE.Mesh/Line/Points geometry + materials disposed on unmount
- `userData['isCityMarker']` selective cleanup on re-render
- renderer.dispose() called
- ResizeObserver disconnected
- Event listeners removed

---

## Brand Colors

```
sky:    #38bdf8  — air mode, AI accent
teal:   #2dd4bf  — primary brand, train mode
forest: #34d399  — bus mode, positive/green
deep:   #040d0a  — background
text:   #c8ede7  — body text
muted:  rgba(45,212,191,0.60)  — labels, secondary  [was 0.35, updated 2026-04-16]
glass:  rgba(4, 20, 16, 0.75)  — card background
border: rgba(45, 212, 191, 0.12)  — card borders
glow:   rgba(45, 212, 191, 0.06)  — ambient glow
surface: rgba(14, 18, 24, 0.9)   — elevated surface
```

Gradient: `linear-gradient(135deg, #38bdf8, #2dd4bf, #34d399)` — ONLY LIFEX module with gradient accent

Arc colors: air `#38bdf8`, train `#2dd4bf`, bus `#34d399`, road `#FFB300`

---

## Decisions Log

| Decision | Reason |
|----------|--------|
| No bloom post-processing | Three.js bloom requires EffectComposer which adds complexity; fresnel shader achieves similar visual quality |
| Shared Docker container | staax_db already running — simpler than dedicated container, travex_db is just another database |
| No Redis in v1 | No real-time requirements; simple REST polling is sufficient |
| Manual drag (not OrbitControls) | No dep needed; custom rotX/rotY is simpler and avoids gimbal lock |
| DOM refs for HUD | requestAnimationFrame runs 60fps; React setState would cause 60fps re-renders |
| version_table = travex_alembic_version | Avoids collision with staax/invex alembic version tables if they ever share a DB |
| Seed in lifespan startup | Idempotent; ensures demo data on first run without migration complexity |

---

## Phase 2 Enhancements (Planned)

### Automated Trip Capture
- **Gmail sync:** Parse travel confirmation emails (IndiGo, Air India, SpiceJet, IRCTC) → auto-create trips via Gmail MCP + Gemma 4. App in the Air style full ticket import.
- **IRCTC SMS parsing:** Train booking SMS → auto-create train trips via BUDGEX SMS pipeline
- **FlightAware free tier:** Live flight status tracking

### AI & Finance
- **Travel Buddy AI:** Deeper FINEX/BUDGEX integration for proactive budget suggestions
- **Gemma 4 AI integration:** Real-time travel buddy with BUDGEX cross-reference
- **BUDGEX budget import:** Live monthly budget from BUDGEX API → Topbar chip

### UI / UX
- **Trip detail page:** Full trip view with map, cost breakdown, notes editor
- **Timeline bar:** Bottom timeline component (months/years scrollable)
- **Touch support:** Mobile swipe-to-rotate on globe canvas
- **Export:** CSV export of trip log

### Infrastructure
- **Domain:** travex.lifexos.co.in + travex-api.lifexos.co.in — DNS A records pending; certbot SSL after propagation
- **EC2 deployed:** ✅ Port 8004, systemd service active (since 2026-04-16)

---

## File Structure

```
travex/
├── README.md
├── TRAVEX_LIVING_SPEC.md
├── .gitignore
├── backend/
│   ├── .env
│   ├── .env.example
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/
│   │       └── 0001_initial_schema.py
│   └── app/
│       ├── main.py
│       ├── core/
│       │   ├── config.py
│       │   └── database.py
│       ├── models/
│       │   └── trips.py
│       ├── schemas/
│       │   └── trips.py
│       ├── api/v1/
│       │   ├── system.py
│       │   ├── cities.py
│       │   ├── trips.py
│       │   └── stats.py
│       └── seed/
│           └── seed_trips.py
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css
        ├── tokens.ts
        ├── store.ts
        ├── services/
        │   └── api.ts
        ├── components/
        │   ├── Globe3D.tsx
        │   ├── Topbar.tsx
        │   ├── StatCard.tsx
        │   ├── ModeBars.tsx
        │   ├── TripCard.tsx
        │   └── AiBuddyCard.tsx
        └── pages/
            ├── GlobePage.tsx
            ├── TripsPage.tsx
            ├── StatsPage.tsx
            ├── BudgetPage.tsx
            └── BuddyPage.tsx
```

---

*Created: 2026-04-16 | Version: 1.1.0 | Last updated: 2026-04-16 (evening — Globe3D rebuild, EC2 deploy)*
