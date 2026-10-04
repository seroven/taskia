/** Layout determinista de planetas en el universo (mi tripulación en origen). */

export interface PlanetLayoutPoint {
  id: number
  x: number
  z: number
}

function hashTroop(id: number): number {
  let x = (id * 2654435761) >>> 0
  x ^= x << 13
  x ^= x >>> 17
  x ^= x << 5
  return x >>> 0
}

function unitFloat(seed: number, salt: number): number {
  const n = hashTroop(seed ^ (salt * 0x9e3779b9))
  return (n % 10_000) / 10_000
}

const MIN_GAP = 5.4
const RING_BASE = 8.4
const RING_STEP = 4.8

/**
 * Coloca `myTroopId` en (0,0) si existe; el resto en anillos con jitter por id.
 * Las tripulaciones ya posicionadas en `existing` se respetan.
 */
export function layoutPlanets(
  troopIds: number[],
  myTroopId: number | null,
  existing: Map<number, { x: number; z: number }> = new Map(),
): PlanetLayoutPoint[] {
  const placed = new Map<number, { x: number; z: number }>(existing)
  const result: PlanetLayoutPoint[] = []

  if (myTroopId != null && troopIds.includes(myTroopId)) {
    placed.set(myTroopId, { x: 0, z: 0 })
  }

  const others = troopIds.filter((id) => id !== myTroopId)
  let ring = 0
  let slot = 0
  let slotsInRing = 6

  for (const id of others) {
    const prev = placed.get(id)
    if (prev) {
      result.push({ id, x: prev.x, z: prev.z })
      continue
    }

    let x = 0
    let z = 0
    let attempts = 0
    do {
      if (slot >= slotsInRing) {
        ring += 1
        slot = 0
        slotsInRing = 6 + ring * 4
      }
      const radius =
        RING_BASE +
        ring * RING_STEP +
        unitFloat(id, 1) * 1.4 -
        0.7
      const angle =
        (slot / slotsInRing) * Math.PI * 2 +
        unitFloat(id, 2) * 0.7
      x = Math.cos(angle) * radius
      z = Math.sin(angle) * radius
      slot += 1
      attempts += 1
    } while (
      attempts < 40 &&
      [...placed.values()].some(
        (p) => (p.x - x) ** 2 + (p.z - z) ** 2 < MIN_GAP * MIN_GAP,
      )
    )

    placed.set(id, { x, z })
    result.push({ id, x, z })
  }

  if (myTroopId != null && troopIds.includes(myTroopId)) {
    result.unshift({ id: myTroopId, x: 0, z: 0 })
  }

  return result
}

export function universeBounds(points: PlanetLayoutPoint[], padding = 8) {
  if (points.length === 0) {
    return { minX: -padding, maxX: padding, minZ: -padding, maxZ: padding }
  }
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minZ = Math.min(minZ, p.z)
    maxZ = Math.max(maxZ, p.z)
  }
  return {
    minX: minX - padding,
    maxX: maxX + padding,
    minZ: minZ - padding,
    maxZ: maxZ + padding,
  }
}
