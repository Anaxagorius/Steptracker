import { lazy, Suspense, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listRoutes, createRoute, getUser, type Route, type User } from '../api'
import RouteMapPreview from '../components/RouteMapPreview'
import { totalDistanceMetres, type LatLng } from '../utils/geo'

// Lazy-load MapPicker so Leaflet is only bundled when the modal is open
const MapPicker = lazy(() => import('../components/MapPicker'))

const USER_ID_KEY = 'stridequest_user_id'
const getUserId = () => localStorage.getItem(USER_ID_KEY) ?? ''

// Fallback stride when no profile is available: 0.414 × 170 cm / 100
const DEFAULT_STRIDE = (0.414 * 170) / 100

function closeModal(
  setShowModal: (v: boolean) => void,
  setName: (v: string) => void,
  setDescription: (v: string) => void,
  setManualKm: (v: string) => void,
  setWaypoints: (v: LatLng[]) => void,
  setFormError: (v: string) => void,
) {
  setShowModal(false)
  setName('')
  setDescription('')
  setManualKm('')
  setWaypoints([])
  setFormError('')
}

export default function RoutesPage() {
  const userId = getUserId()
  const [userExists, setUserExists] = useState<boolean | null>(null)
  const [strideM, setStrideM] = useState<number>(DEFAULT_STRIDE)
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [waypoints, setWaypoints] = useState<LatLng[]>([])
  const [manualKm, setManualKm] = useState('') // used only when no waypoints are drawn
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const mapDistanceM = totalDistanceMetres(waypoints)
  const mapDistanceKm = mapDistanceM / 1000

  const load = () => {
    setLoading(true)
    const userCheck = userId
      ? getUser(userId)
          .then((u: User) => { setUserExists(true); setStrideM(u.stride_m) })
          .catch(() => { setUserExists(false) })
      : Promise.resolve().then(() => setUserExists(false))
    userCheck
      .then(() => listRoutes(userId || undefined))
      .then(setRoutes)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    // Prefer map-derived distance; fall back to manual entry
    let distanceM: number
    if (waypoints.length >= 2) {
      distanceM = mapDistanceM
    } else {
      const parsed = parseFloat(manualKm)
      if (!manualKm || isNaN(parsed) || parsed <= 0) {
        setFormError('Draw a route on the map or enter a distance manually.')
        return
      }
      distanceM = parsed * 1000
    }

    if (!name) {
      setFormError('A route name is required.')
      return
    }

    setSaving(true)
    try {
      await createRoute({
        user_id: userId,
        name,
        description: description || undefined,
        distance_m: distanceM,
        waypoints: waypoints.length >= 2 ? waypoints : undefined,
      })
      closeModal(setShowModal, setName, setDescription, setManualKm, setWaypoints, setFormError)
      load()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create route')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-gray-500">Loading…</p>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Routes</h1>
        <button
          onClick={() => setShowModal(true)}
          disabled={userExists !== true}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + New Route
        </button>
      </div>

      {userExists === false && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          You need to set up your profile before creating routes.{' '}
          <Link to="/profile" className="font-semibold underline hover:text-amber-900">Go to Profile →</Link>
        </div>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {routes.length === 0 ? (
        <p className="text-gray-400">No routes yet. Create your first route!</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {routes.map((r) => {
            const estSteps = Math.round(r.distance_m / strideM)
            return (
              <div key={r.id} className="bg-white rounded-xl shadow p-5">
                <RouteMapPreview waypoints={r.waypoints} className="mb-3" />
                <h3 className="font-semibold text-gray-800">{r.name}</h3>
                {r.description && <p className="text-sm text-gray-500 mt-1">{r.description}</p>}
                <div className="mt-3 flex gap-4 text-sm text-indigo-600 font-medium">
                  <span>{(r.distance_m / 1000).toFixed(2)} km</span>
                  <span>~{estSteps.toLocaleString()} steps</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Created {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">New Route</h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              {/* Name */}
              <div>
                <label className="text-sm text-gray-600">Name</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Morning Walk"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm text-gray-600">Description (optional)</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Around the park"
                />
              </div>

              {/* Map picker */}
              <div>
                <label className="text-sm text-gray-600 mb-1 block">
                  Plan your route on the map
                </label>
                <Suspense fallback={<div className="w-full h-[280px] bg-gray-100 rounded-lg flex items-center justify-center text-sm text-gray-400">Loading map…</div>}>
                  <MapPicker waypoints={waypoints} onChange={setWaypoints} />
                </Suspense>
                {waypoints.length >= 2 && (
                  <p className="text-sm text-indigo-700 font-medium mt-2">
                    📍 {waypoints.length} waypoints · {mapDistanceKm.toFixed(2)} km
                    · ~{Math.round(mapDistanceM / strideM).toLocaleString()} steps
                  </p>
                )}
              </div>

              {/* Manual distance fallback */}
              {waypoints.length < 2 && (
                <div>
                  <label className="text-sm text-gray-600">
                    Or enter distance manually (km)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                    value={manualKm}
                    onChange={(e) => setManualKm(e.target.value)}
                    placeholder="5.0"
                  />
                </div>
              )}

              {formError && <p className="text-red-500 text-sm">{formError}</p>}

              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => closeModal(setShowModal, setName, setDescription, setManualKm, setWaypoints, setFormError)}
                  className="px-4 py-2 text-sm text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
