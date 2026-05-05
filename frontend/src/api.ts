// Typed API client. Base URL is /api.

const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? res.statusText)
  }
  return res.json() as Promise<T>
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  name: string
  email: string
  height_cm: number
  stride_m: number
  created_at: string
  updated_at: string
}

export interface Route {
  id: string
  user_id: string
  name: string
  description?: string
  distance_m: number
  waypoints: string
  created_at: string
}

export interface Activity {
  id: string
  user_id: string
  route_id?: string
  steps_actual?: number
  steps_estimated: number
  distance_m: number
  duration_secs: number
  confidence: number
  is_estimated: number
  has_gps: number
  has_sensor: number
  started_at: string
  completed_at: string
}

export interface Achievement {
  id: string
  user_id: string
  kind: string
  label: string
  earned_at: string
}

export interface Dashboard {
  user_id: string
  total_steps: number
  total_distance_m: number
  total_activities: number
  streak_days: number
  avg_confidence: number
  achievements: Achievement[]
}

// ── User endpoints ────────────────────────────────────────────────────────────

export const createUser = (body: { name: string; email: string; height_cm?: number }) =>
  request<User>('/users', { method: 'POST', body: JSON.stringify(body) })

export const getUser = (id: string) => request<User>(`/users/${id}`)

export const updateUser = (id: string, body: Partial<{ name: string; email: string; height_cm: number }>) =>
  request<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) })

// ── Route endpoints ───────────────────────────────────────────────────────────

export const createRoute = (body: {
  user_id: string
  name: string
  description?: string
  distance_m: number
  waypoints?: unknown[]
}) => request<Route>('/routes', { method: 'POST', body: JSON.stringify(body) })

export const listRoutes = (user_id?: string) =>
  request<Route[]>(`/routes${user_id ? `?user_id=${user_id}` : ''}`)

export const getRoute = (id: string) => request<Route>(`/routes/${id}`)

// ── Activity endpoints ────────────────────────────────────────────────────────

export const createActivity = (body: {
  user_id: string
  route_id?: string
  steps_actual?: number
  distance_m: number
  duration_secs: number
  has_gps?: boolean
  has_sensor?: boolean
  started_at?: string
}) => request<Activity>('/activities', { method: 'POST', body: JSON.stringify(body) })

export const listActivities = (params?: { user_id?: string; limit?: number }) => {
  const qs = new URLSearchParams()
  if (params?.user_id) qs.set('user_id', params.user_id)
  if (params?.limit != null) qs.set('limit', String(params.limit))
  return request<Activity[]>(`/activities${qs.toString() ? `?${qs}` : ''}`)
}

export const getActivity = (id: string) => request<Activity>(`/activities/${id}`)

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const getDashboard = (user_id: string) => request<Dashboard>(`/dashboard/${user_id}`)

// ── Achievements ──────────────────────────────────────────────────────────────

export const listAchievements = (user_id: string) =>
  request<Achievement[]>(`/achievements/${user_id}`)
