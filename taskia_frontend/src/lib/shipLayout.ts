/**
 * Posiciones de las naves en la galaxia, en px del mundo (zoom 1). La nave propia va en el origen y las demás
 * en anillos elípticos a su alrededor: las naves son anchas, así que el anillo es más ancho que alto.
 */

export interface ShipSpot {
  id: number
  x: number
  y: number
}

/** Ancho base de una nave ajena y de la propia, en px a zoom 1. */
export const OTHER_SHIP_WIDTH = 200
export const MY_SHIP_WIDTH = 460

function hashId(id: number): number {
  let x = (id * 2654435761) >>> 0
  x ^= x << 13
  x ^= x >>> 17
  x ^= x << 5
  return x >>> 0
}

function unit(seed: number, salt: number): number {
  return (hashId(seed ^ (salt * 0x9e3779b9)) % 10_000) / 10_000
}

/** Distancia mínima entre dos naves, para que ni al agrandarse se encimen del todo. */
const MIN_GAP = 330
const RING_BASE = 640
const RING_STEP = 330
const ELLIPSE_X = 1.3
const ELLIPSE_Y = 0.8

/**
 * Coloca `myTroopId` en (0,0) si existe; el resto, en anillos con un poco de desorden por id.
 * Lo que ya tiene sitio en `existing` no se mueve cuando llega otra página de naves.
 */
export function layoutShips(
  ids: number[],
  myTroopId: number | null,
  existing: Map<number, { x: number; y: number }> = new Map(),
): ShipSpot[] {
  const placed = new Map<number, { x: number; y: number }>(existing)
  const result: ShipSpot[] = []
  const hasMine = myTroopId != null && ids.includes(myTroopId)
  if (hasMine) placed.set(myTroopId, { x: 0, y: 0 })

  let ring = 0
  let slot = 0
  let slotsInRing = 5

  for (const id of ids.filter((value) => value !== myTroopId)) {
    const prev = placed.get(id)
    if (prev) {
      result.push({ id, x: prev.x, y: prev.y })
      continue
    }

    let x = 0
    let y = 0
    let attempts = 0
    do {
      if (slot >= slotsInRing) {
        ring += 1
        slot = 0
        slotsInRing = 5 + ring * 3
      }
      const radius = RING_BASE + ring * RING_STEP + (unit(id, 1) - 0.5) * 70
      const angle = (slot / slotsInRing) * Math.PI * 2 + unit(id, 2) * 0.5 + ring * 0.4
      x = Math.cos(angle) * radius * ELLIPSE_X
      y = Math.sin(angle) * radius * ELLIPSE_Y
      slot += 1
      attempts += 1
    } while (
      attempts < 60 &&
      [...placed.values()].some((p) => (p.x - x) ** 2 + (p.y - y) ** 2 < MIN_GAP * MIN_GAP)
    )

    placed.set(id, { x, y })
    result.push({ id, x, y })
  }

  if (hasMine) result.unshift({ id: myTroopId, x: 0, y: 0 })
  return result
}
