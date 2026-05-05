import { useState } from 'react'
import type { Route } from '../api'

interface ActivityFormProps {
  routes: Route[]
  onSubmit: (data: {
    route_id?: string
    distance_m: number
    duration_secs: number
    steps_actual?: number
    has_gps: boolean
    has_sensor: boolean
  }) => Promise<void>
  onClose: () => void
}

export default function ActivityForm({ routes, onSubmit, onClose }: ActivityFormProps) {
  const [routeId, setRouteId] = useState('')
  const [distanceKm, setDistanceKm] = useState('')
  const [durationMin, setDurationMin] = useState('')
  const [stepsActual, setStepsActual] = useState('')
  const [hasGps, setHasGps] = useState(false)
  const [hasSensor, setHasSensor] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedRoute = routes.find((r) => r.id === routeId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const distance_m = selectedRoute
      ? selectedRoute.distance_m
      : parseFloat(distanceKm) * 1000

    if (!distance_m || isNaN(distance_m) || distance_m <= 0) {
      setError('Please enter a valid distance.')
      return
    }
    const duration_secs = parseFloat(durationMin) * 60
    if (!duration_secs || isNaN(duration_secs)) {
      setError('Please enter a valid duration.')
      return
    }

    setSaving(true)
    try {
      await onSubmit({
        route_id: routeId || undefined,
        distance_m,
        duration_secs,
        steps_actual: stepsActual ? parseInt(stepsActual) : undefined,
        has_gps: hasGps,
        has_sensor: hasSensor,
      })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to log activity')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Log Activity</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-sm text-gray-600">Route (optional)</label>
            <select
              className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
              value={routeId}
              onChange={(e) => setRouteId(e.target.value)}
            >
              <option value="">-- No route --</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({(r.distance_m / 1000).toFixed(2)} km)
                </option>
              ))}
            </select>
          </div>
          {!routeId && (
            <div>
              <label className="text-sm text-gray-600">Distance (km)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value)}
                placeholder="e.g. 5.0"
              />
            </div>
          )}
          <div>
            <label className="text-sm text-gray-600">Duration (minutes)</label>
            <input
              type="number"
              min="0"
              className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              placeholder="e.g. 30"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Actual steps (optional)</label>
            <input
              type="number"
              min="0"
              className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
              value={stepsActual}
              onChange={(e) => setStepsActual(e.target.value)}
              placeholder="Leave blank to estimate"
            />
          </div>
          <div className="flex gap-4 text-sm text-gray-600">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasGps}
                onChange={(e) => setHasGps(e.target.checked)}
              />
              GPS used
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasSensor}
                onChange={(e) => setHasSensor(e.target.checked)}
              />
              Pedometer used
            </label>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 justify-end mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Log Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
