import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8004'
const api = axios.create({ baseURL: BASE })

export interface CityRead {
  id: number
  code: string
  name: string
  lat: number
  lng: number
}

export interface TripRead {
  id: number
  from_city: CityRead
  to_city:   CityRead
  mode:      'air' | 'train' | 'bus' | 'road'
  travel_date: string
  cost_inr:  number
  notes:     string | null
  created_at: string
}

export interface ArcDef {
  from: { lat: number; lng: number; code: string }
  to:   { lat: number; lng: number; code: string }
  mode: 'air' | 'train' | 'bus' | 'road'
  count: number
}

export interface StatsResponse {
  total_trips: number
  total_cities: number
  lifetime_spend_inr: number
  spend_this_year_inr: number
  by_mode: Record<string, { count: number; spend: number }>
  recent_trips: TripRead[]
}

export const tripsAPI = {
  list:     (params?: object) => api.get<{ trips: TripRead[]; total: number }>('/api/v1/trips', { params }),
  get:      (id: number) => api.get<TripRead>(`/api/v1/trips/${id}`),
  create:   (data: object) => api.post<TripRead>('/api/v1/trips', data),
  update:   (id: number, data: object) => api.put<TripRead>(`/api/v1/trips/${id}`, data),
  delete:   (id: number) => api.delete(`/api/v1/trips/${id}`),
  timeline: () => api.get('/api/v1/trips/timeline'),
}

export const citiesAPI = {
  list:   () => api.get<CityRead[]>('/api/v1/cities'),
  create: (data: object) => api.post<CityRead>('/api/v1/cities', data),
}

export const statsAPI = {
  summary: () => api.get<StatsResponse>('/api/v1/stats'),
  arcs:    () => api.get<ArcDef[]>('/api/v1/stats/arcs'),
}
