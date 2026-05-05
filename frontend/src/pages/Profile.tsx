import { useEffect, useState } from 'react'
import { getUser, createUser, updateUser, type User } from '../api'

const USER_ID_KEY = 'stridequest_user_id'

function getUserId(): string {
  let id = localStorage.getItem(USER_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(USER_ID_KEY, id)
  }
  return id
}

export default function Profile() {
  const userId = getUserId()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Form fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    getUser(userId)
      .then((u) => {
        setUser(u)
        setName(u.name)
        setEmail(u.email)
        setHeightCm(String(u.height_cm))
      })
      .catch(() => {
        // User doesn't exist yet — show create form
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [userId])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveMsg('')
    setError('')
    try {
      const height = parseFloat(heightCm)
      if (!name || !email) throw new Error('Name and email are required.')

      let saved: User
      if (user) {
        saved = await updateUser(userId, { name, email, height_cm: isNaN(height) ? undefined : height })
      } else {
        saved = await createUser({ name, email, height_cm: isNaN(height) ? undefined : height })
        localStorage.setItem(USER_ID_KEY, saved.id)
      }
      setUser(saved)
      setSaveMsg('Profile saved!')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-gray-500">Loading…</p>

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-800">Profile</h1>
      {!user && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          No profile found for your device. Fill in the form below to create one.
        </div>
      )}
      <div className="bg-white rounded-xl shadow p-6">
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-gray-600">Name</label>
            <input
              className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Email</label>
            <input
              type="email"
              className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Height (cm)</label>
            <input
              type="number"
              min="50"
              max="250"
              className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="170"
            />
          </div>
          {user && (
            <div className="bg-indigo-50 rounded-lg px-4 py-3 text-sm text-indigo-800">
              Computed stride length:{' '}
              <span className="font-bold">{user.stride_m.toFixed(3)} m</span>
            </div>
          )}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {saveMsg && <p className="text-green-600 text-sm">{saveMsg}</p>}
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 self-start"
          >
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}
