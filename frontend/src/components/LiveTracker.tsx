import { useCallback, useEffect, useRef, useState } from 'react'
import { totalDistanceMetres, type LatLng } from '../utils/geo'

// ── Step detection constants ──────────────────────────────────────────────────

/** Acceleration magnitude threshold (m/s²) to register a step peak */
const STEP_THRESHOLD = 11.5
/** Minimum milliseconds between two consecutive steps (debounce) */
const STEP_DEBOUNCE_MS = 300
/** Low-pass filter coefficient: higher = smoother but more lag */
const SMOOTHING = 0.8

// ── Types ─────────────────────────────────────────────────────────────────────

type TrackingState = 'idle' | 'running' | 'stopped'

interface LiveTrackerProps {
  onSave: (data: {
    steps_actual: number
    distance_m: number
    duration_secs: number
    has_gps: boolean
    has_sensor: boolean
    started_at: string
  }) => Promise<void>
  onClose: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LiveTracker({ onSave, onClose }: LiveTrackerProps) {
  const [trackingState, setTrackingState] = useState<TrackingState>('idle')
  const [steps, setSteps] = useState(0)
  const [distanceM, setDistanceM] = useState(0)
  const [elapsedSecs, setElapsedSecs] = useState(0)
  const [hasSensor, setHasSensor] = useState(false)
  const [hasGps, setHasGps] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [permissionError, setPermissionError] = useState('')

  // Refs for mutable state inside event callbacks
  const stepsRef = useRef(0)
  const smoothedMagRef = useRef(0)
  const aboveThresholdRef = useRef(false)
  const lastStepTimeRef = useRef(0)
  const waypointsRef = useRef<LatLng[]>([])
  const watchIdRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<Date | null>(null)

  // ── Cleanup on unmount ──────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      stopTracking()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Step detection via DeviceMotion ────────────────────────────────────────

  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    const acc = event.accelerationIncludingGravity
    if (!acc || acc.x == null || acc.y == null || acc.z == null) return

    const mag = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z)

    // Low-pass filter to smooth jitter
    smoothedMagRef.current =
      SMOOTHING * smoothedMagRef.current + (1 - SMOOTHING) * mag

    const now = Date.now()
    const wasAbove = aboveThresholdRef.current

    if (smoothedMagRef.current >= STEP_THRESHOLD) {
      aboveThresholdRef.current = true
    } else {
      if (wasAbove) {
        // Fell below threshold → one step peak detected
        if (now - lastStepTimeRef.current >= STEP_DEBOUNCE_MS) {
          lastStepTimeRef.current = now
          stepsRef.current += 1
          setSteps(stepsRef.current)
        }
      }
      aboveThresholdRef.current = false
    }
  }, [])

  // ── GPS tracking ──────────────────────────────────────────────────────────

  const startGps = useCallback(() => {
    if (!navigator.geolocation) return
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point: LatLng = [pos.coords.latitude, pos.coords.longitude]
        waypointsRef.current = [...waypointsRef.current, point]
        const dist = totalDistanceMetres(waypointsRef.current)
        setDistanceM(dist)
        setHasGps(true)
      },
      () => {
        // GPS unavailable or denied – continue without it
      },
      { enableHighAccuracy: true, maximumAge: 1000 },
    )
  }, [])

  // ── Start / Stop ──────────────────────────────────────────────────────────

  const startTracking = useCallback(async () => {
    setError('')
    setPermissionError('')
    stepsRef.current = 0
    smoothedMagRef.current = 0
    aboveThresholdRef.current = false
    lastStepTimeRef.current = 0
    waypointsRef.current = []
    setSteps(0)
    setDistanceM(0)
    setElapsedSecs(0)
    setHasSensor(false)
    setHasGps(false)

    startTimeRef.current = new Date()

    // Use a local variable to synchronously track sensor availability across
    // the async permission flow (React state updates are batched and won't
    // be visible within the same call).
    let sensorAvailable = false

    // Request DeviceMotion permission on iOS 13+
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const DeviceMotionEventAny = DeviceMotionEvent as any
    if (typeof DeviceMotionEventAny.requestPermission === 'function') {
      try {
        const result: string = await DeviceMotionEventAny.requestPermission()
        if (result !== 'granted') {
          setPermissionError(
            'Motion sensor permission denied. Steps cannot be counted automatically. GPS distance will still be tracked.',
          )
        } else {
          sensorAvailable = true
          setHasSensor(true)
        }
      } catch {
        setPermissionError('Could not request motion permission. GPS distance will still be tracked.')
      }
    } else if (typeof DeviceMotionEvent !== 'undefined') {
      sensorAvailable = true
      setHasSensor(true)
    }

    if (sensorAvailable) {
      window.addEventListener('devicemotion', handleMotion)
    }

    startGps()

    timerRef.current = setInterval(() => {
      setElapsedSecs((s) => s + 1)
    }, 1000)

    setTrackingState('running')
  }, [handleMotion, startGps])

  const stopTracking = useCallback(() => {
    window.removeEventListener('devicemotion', handleMotion)
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [handleMotion])

  const handleStop = useCallback(() => {
    stopTracking()
    setTrackingState('stopped')
  }, [stopTracking])

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (elapsedSecs === 0) {
      setError('No activity to save.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({
        steps_actual: stepsRef.current,
        distance_m: distanceM,
        duration_secs: elapsedSecs,
        has_gps: hasGps,
        has_sensor: hasSensor,
        started_at: startTimeRef.current?.toISOString() ?? new Date().toISOString(),
      })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save activity')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm text-center">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Live Step Tracker</h2>
        <p className="text-xs text-gray-400 mb-5">
          Carry your device and your steps will be counted automatically.
        </p>

        {permissionError && (
          <p className="text-amber-600 text-xs mb-3 bg-amber-50 rounded-lg p-2">
            ⚠️ {permissionError}
          </p>
        )}

        {/* Live stats */}
        {trackingState !== 'idle' && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-indigo-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-indigo-700">
                {steps.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">steps</p>
            </div>
            <div className="bg-indigo-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-indigo-700">
                {distanceM >= 1000
                  ? `${(distanceM / 1000).toFixed(2)}`
                  : `${Math.round(distanceM)}`}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {distanceM >= 1000 ? 'km' : 'm'}
              </p>
            </div>
            <div className="bg-indigo-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-indigo-700">
                {formatTime(elapsedSecs)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">time</p>
            </div>
          </div>
        )}

        {/* Sensor indicators */}
        {trackingState === 'running' && (
          <div className="flex justify-center gap-3 mb-5 text-xs">
            <span
              className={`px-2 py-1 rounded-full ${
                hasSensor
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {hasSensor ? '📲 Pedometer on' : '📲 No pedometer'}
            </span>
            <span
              className={`px-2 py-1 rounded-full ${
                hasGps
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {hasGps ? '📍 GPS on' : '📍 Acquiring GPS…'}
            </span>
          </div>
        )}

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        {/* Controls */}
        <div className="flex flex-col gap-2">
          {trackingState === 'idle' && (
            <button
              onClick={startTracking}
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              ▶ Start Tracking
            </button>
          )}

          {trackingState === 'running' && (
            <button
              onClick={handleStop}
              className="w-full py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors"
            >
              ⏹ Stop
            </button>
          )}

          {trackingState === 'stopped' && (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : '💾 Save Activity'}
              </button>
              <button
                onClick={startTracking}
                className="w-full py-2 text-sm text-indigo-600 hover:text-indigo-800"
              >
                Track Again
              </button>
            </>
          )}

          <button
            onClick={() => {
              stopTracking()
              onClose()
            }}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            {trackingState === 'stopped' ? 'Discard' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}
