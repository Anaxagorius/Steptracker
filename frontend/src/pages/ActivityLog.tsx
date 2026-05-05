import { useEffect, useState } from 'react'
import { listActivities, listRoutes, createActivity, type Activity, type Route } from '../api'
import ActivityForm from '../components/ActivityForm'

const USER_ID_KEY = 'stridequest_user_id'
const getUserId = () => localStorage.getItem(USER_ID_KEY) ?? ''

export default function ActivityLog() {
  const userId = getUserId()
  const [activities, setActivities] = useState<Activity[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  const load = () => {
    Promise.all([
      listActivities({ user_id: userId, limit: 50 }),
      listRoutes(userId || undefined),
    ])
      .then(([acts, rts]) => {
        setActivities(acts)
        setRoutes(rts)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [userId])

  const handleLog = async (data: {
    route_id?: string
    distance_m: number
    duration_secs: number
    steps_actual?: number
    has_gps: boolean
    has_sensor: boolean
  }) => {
    await createActivity({ user_id: userId, ...data })
    load()
  }

  if (loading) return <p className="text-gray-500">Loading…</p>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Activity Log</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
        >
          + Log Activity
        </button>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {activities.length === 0 ? (
        <p className="text-gray-400">No activities yet. Log your first one!</p>
      ) : (
        <div className="bg-white rounded-xl shadow divide-y">
          {activities.map((a) => {
            const steps = a.steps_actual ?? a.steps_estimated
            const confPct = Math.round(a.confidence * 100)
            return (
              <div key={a.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-800">
                    {steps.toLocaleString()} steps
                    {a.is_estimated ? (
                      <span className="ml-1 text-xs text-gray-400">(estimated)</span>
                    ) : null}
                  </p>
                  <p className="text-sm text-gray-500">
                    {(a.distance_m / 1000).toFixed(2)} km · {Math.round(a.duration_secs / 60)} min
                  </p>
                  {/* Confidence bar */}
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-1.5 w-24 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${confPct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{confPct}% confidence</span>
                  </div>
                </div>
                <span className="text-sm text-gray-400 shrink-0">
                  {new Date(a.completed_at).toLocaleDateString()}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <ActivityForm
          routes={routes}
          userId={userId}
          onSubmit={handleLog}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
