export type LatLng = [number, number]

/** Haversine distance in metres between two [lat, lng] points */
function haversineMetres(a: LatLng, b: LatLng): number {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b[0] - a[0])
  const dLng = toRad(b[1] - a[1])
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * sinLng * sinLng
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Sum of Haversine distances along a sequence of waypoints, in metres */
export function totalDistanceMetres(waypoints: LatLng[]): number {
  let d = 0
  for (let i = 1; i < waypoints.length; i++) {
    d += haversineMetres(waypoints[i - 1], waypoints[i])
  }
  return d
}
