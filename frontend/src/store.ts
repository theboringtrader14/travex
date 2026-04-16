import { create } from 'zustand'
import type { TripRead, CityRead, StatsResponse, ArcDef } from './services/api'

interface TravexStore {
  trips:   TripRead[]
  cities:  CityRead[]
  stats:   StatsResponse | null
  arcs:    ArcDef[]
  loading: boolean
  setTrips:   (trips: TripRead[]) => void
  setCities:  (cities: CityRead[]) => void
  setStats:   (stats: StatsResponse) => void
  setArcs:    (arcs: ArcDef[]) => void
  setLoading: (v: boolean) => void
}

export const useStore = create<TravexStore>((set) => ({
  trips:   [],
  cities:  [],
  stats:   null,
  arcs:    [],
  loading: false,
  setTrips:   (trips)   => set({ trips }),
  setCities:  (cities)  => set({ cities }),
  setStats:   (stats)   => set({ stats }),
  setArcs:    (arcs)    => set({ arcs }),
  setLoading: (loading) => set({ loading }),
}))
