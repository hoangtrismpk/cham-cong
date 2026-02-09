export function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
) {
    const R = 6371e3 // metres
    const φ1 = (lat1 * Math.PI) / 180 // φ, λ in radians
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    const d = R * c // in metres
    return d
}

export const OFFICE_COORDINATES = {
    latitude: 10.768615428290985,
    longitude: 106.72630355374393,
}

export const MAX_DISTANCE_METERS = 200

// Danh sách IP văn phòng được phép chấm công không cần GPS
export const OFFICE_IPS = [
    '14.161.22.181', // IP mặc định từ yêu cầu
]
