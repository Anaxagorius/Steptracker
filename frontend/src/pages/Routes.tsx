import { useEffect, useState } from 'react'
import { listRoutes, createRoute, type Route } from '../api'

const USER_ID_KEY = 'stridequest_user_id'
const getUserId = () => localStorage.getItem(USER_ID_KEY) ?? ''

// Default stride: 0.414 × 170 cm / 100
const DEFAULT_STRIDE = (0.414 * 170) / 100

export default function RoutesPage() {
  const userId = getUserId()
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [distanceKm, setDistanceKm] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = () => {
    setLoading(true)
    listRoutes(userId || undefined)
      .then(setRoutes)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [userId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    const dist = parseFloat(distanceKm)
    if (!name || isNaN(dist) || dist <= 0) {
      setFormError('Name and a valid distance are required.')
      return
    }
    setSaving(true)
    try {
      await createRoute({ user_id: userId, name, description: description || undefined, distance_m: dist * 1000 })
      setName(''); setDescription(''); setDistanceKm('')
      setShowModal(false)
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
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
        >
          + New Route
        </button>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {routes.length === 0 ? (
        <p className="text-gray-400">No routes yet. Create your first route!</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {routes.map((r) => {
            const estSteps = Math.round(r.distance_m / DEFAULT_STRIDE)
            return (
              <div key={r.id} className="bg-white rounded-xl shadow p-5">
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">New Route</h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <div>
                <label className="text-sm text-gray-600">Name</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Morning Run"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Description (optional)</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Around the park"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Distance (km)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                  placeholder="5.0"
                />
              </div>
              {formError && <p className="text-red-500 text-sm">{formError}</p>}
              <div className="flex gap-2 justify-end mt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600">
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
