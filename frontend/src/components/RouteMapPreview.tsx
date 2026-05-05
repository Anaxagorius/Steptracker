type LatLng = [number, number]

interface RouteMapPreviewProps {
  waypoints: string // JSON-encoded LatLng[]
  className?: string
}

export default function RouteMapPreview({ waypoints, className = '' }: RouteMapPreviewProps) {
  let pts: LatLng[] = []
  try {
    const parsed = JSON.parse(waypoints)
    if (Array.isArray(parsed) && parsed.length >= 2) {
      pts = parsed as LatLng[]
    }
  } catch {
    // invalid JSON — render nothing
  }

  if (pts.length < 2) return null

  const W = 280
  const H = 120
  const PAD = 8

  const lats = pts.map((p) => p[0])
  const lngs = pts.map((p) => p[1])
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const dLat = maxLat - minLat || 0.0001
  const dLng = maxLng - minLng || 0.0001

  // Map lat/lng to SVG pixels (lat is inverted — top of SVG = higher lat)
  const toX = (lng: number) => PAD + ((lng - minLng) / dLng) * (W - 2 * PAD)
  const toY = (lat: number) => PAD + ((maxLat - lat) / dLat) * (H - 2 * PAD)

  const polyline = pts.map((p) => `${toX(p[1])},${toY(p[0])}`).join(' ')

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`w-full rounded-lg bg-indigo-50 ${className}`}
      aria-label="Route map preview"
    >
      <polyline
        points={polyline}
        fill="none"
        stroke="#4f46e5"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Start dot */}
      <circle cx={toX(pts[0][1])} cy={toY(pts[0][0])} r="4" fill="#22c55e" />
      {/* End dot */}
      <circle cx={toX(pts[pts.length - 1][1])} cy={toY(pts[pts.length - 1][0])} r="4" fill="#ef4444" />
    </svg>
  )
}
