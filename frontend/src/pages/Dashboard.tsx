import { useEffect, useState } from 'react'
import { getDashboard, listActivities, type Dashboard, type Activity } from '../api'
import StepCard from '../components/StepCard'

const USER_ID_KEY = 'stridequest_user_id'

function getUserId(): string {
  let id = localStorage.getItem(USER_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(USER_ID_KEY, id)
  }
  return id
}

export default function DashboardPage() {
  const userId = getUserId()
  const [dash, setDash] = useState<Dashboard | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getDashboard(userId), listActivities({ user_id: userId, limit: 5 })])
      .then(([d, a]) => {
        setDash(d)
        setActivities(a)
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Failed to load dashboard'),
      )
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return <p className="text-gray-500">Loading…</p>
  if (error)
    return (
      <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4">
        <p className="font-medium">Could not load dashboard</p>
        <p className="text-sm mt-1">{error}</p>
        <p className="text-xs mt-2 text-amber-600">
          Make sure the backend is running on port 3000.
        </p>
      </div>
    )

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StepCard label="Total Steps" value={(dash?.total_steps ?? 0).toLocaleString()} />
        <StepCard
          label="Total Distance"
          value={((dash?.total_distance_m ?? 0) / 1000).toFixed(2)}
          sub="km"
        />
        <StepCard label="Activities" value={dash?.total_activities ?? 0} />
        <StepCard label="Streak" value={dash?.streak_days ?? 0} sub="days" />
      </div>

      {/* Achievements */}
      {(dash?.achievements.length ?? 0) > 0 && (
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
            Achievements
          </h2>
          <div className="flex flex-wrap gap-2">
            {dash!.achievements.map((a) => (
              <span
                key={a.id}
                className="bg-indigo-100 text-indigo-700 text-xs font-medium px-3 py-1 rounded-full"
                title={new Date(a.earned_at).toLocaleDateString()}
              >
                🏅 {a.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent activities */}
      <div className="bg-white rounded-xl shadow p-5">
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
          Recent Activities
        </h2>
        {activities.length === 0 ? (
          <p className="text-gray-400 text-sm">No activities yet. Go log one!</p>
        ) : (
          <ul className="divide-y">
            {activities.map((a) => (
              <li key={a.id} className="py-3 flex justify-between text-sm">
                <div>
                  <p className="font-medium text-gray-800">
                    {(a.steps_actual ?? a.steps_estimated).toLocaleString()} steps
                    {a.is_estimated ? (
                      <span className="ml-1 text-xs text-gray-400">(est.)</span>
                    ) : null}
                  </p>
                  <p className="text-gray-400">
                    {(a.distance_m / 1000).toFixed(2)} km ·{' '}
                    {Math.round(a.duration_secs / 60)} min
                  </p>
                </div>
                <span className="text-gray-400">
                  {new Date(a.completed_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
