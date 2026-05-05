import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { totalDistanceMetres, type LatLng } from '../utils/geo'

export { totalDistanceMetres, type LatLng }

interface MapPickerProps {
  waypoints: LatLng[]
  onChange: (waypoints: LatLng[]) => void
}

// Fix default marker icon path broken by bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

export default function MapPicker({ waypoints, onChange }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const polylineRef = useRef<L.Polyline | null>(null)
  // Keep a ref for latest waypoints so the click handler doesn't close over a stale value
  const waypointsRef = useRef<LatLng[]>(waypoints)

  useEffect(() => {
    waypointsRef.current = waypoints
  }, [waypoints])

  // Initialise map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current).setView([51.505, -0.09], 13)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    map.on('click', (e: L.LeafletMouseEvent) => {
      const pt: LatLng = [e.latlng.lat, e.latlng.lng]
      onChange([...waypointsRef.current, pt])
    })

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync markers + polyline whenever waypoints change
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Remove old markers
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []
    polylineRef.current?.remove()

    // Add new markers
    const lls = waypoints.map((wp) => L.latLng(wp[0], wp[1]))
    markersRef.current = lls.map((ll, i) => {
      const m = L.marker(ll, { draggable: true })
      m.on('dragend', () => {
        const newWps = [...waypointsRef.current]
        newWps[i] = [m.getLatLng().lat, m.getLatLng().lng]
        onChange(newWps)
      })
      m.on('contextmenu', () => {
        const newWps = waypointsRef.current.filter((_, idx) => idx !== i)
        onChange(newWps)
      })
      return m.addTo(map)
    })

    // Draw polyline
    if (lls.length >= 2) {
      polylineRef.current = L.polyline(lls, { color: '#4f46e5', weight: 3 }).addTo(map)
    }

    // Auto-fit when there's at least one point
    if (lls.length === 1) map.setView(lls[0], map.getZoom())
    if (lls.length >= 2) map.fitBounds(L.latLngBounds(lls), { padding: [30, 30] })
  }, [waypoints]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div ref={containerRef} className="w-full rounded-lg overflow-hidden border" style={{ height: 280 }} />
      <p className="text-xs text-gray-400 mt-1">
        Click to add waypoints · drag to move · right-click to remove
      </p>
    </div>
  )
}
