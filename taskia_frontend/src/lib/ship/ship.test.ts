import assert from 'node:assert/strict'
import test from 'node:test'
import { CY, VB_H, VB_W, hullGeo } from './geometry.ts'
import { HULLS, SHIP_OPTIONS, randomShip } from './types.ts'
import { MY_SHIP_WIDTH, OTHER_SHIP_WIDTH, layoutShips } from '../shipLayout.ts'

test('cada casco cabe en el lienzo y es más grueso en el medio que en las puntas', () => {
  for (const kind of HULLS) {
    const geo = hullGeo(kind)
    assert.ok(geo.x0 > 8 && geo.x1 < VB_W - 8, `${kind} se sale del lienzo en x`)
    const mid = geo.at(0.5)
    assert.ok(geo.top(mid) > 4 && geo.bot(mid) < VB_H - 4, `${kind} se sale del lienzo en y`)
    assert.ok(geo.top(mid) < CY && geo.bot(mid) > CY)
    assert.ok(geo.half(geo.at(0.5)) > geo.half(geo.at(0.05)))
    assert.ok(geo.half(geo.at(0.5)) > geo.half(geo.at(0.95)))
    assert.ok(geo.half(geo.x0) < 0.01 && geo.half(geo.x1) < 0.01, `${kind} no cierra en las puntas`)
    assert.ok(geo.path.startsWith('M') && geo.path.endsWith('Z'))
  }
})

test('las piezas encajan: el borde de arriba siempre está sobre el de abajo en todo el casco', () => {
  for (const kind of HULLS) {
    const geo = hullGeo(kind)
    for (let u = 0; u <= 1; u += 0.02) {
      const x = geo.at(u)
      assert.ok(geo.top(x) <= geo.bot(x), `${kind}: el borde se cruza en u=${u.toFixed(2)}`)
    }
  }
})

test('randomShip es determinista y solo usa piezas de las listas', () => {
  assert.deepEqual(randomShip('a'), randomShip('a'))
  const lists = {
    hull: SHIP_OPTIONS.hull.map((o) => o.id as string),
    wings: SHIP_OPTIONS.wings.map((o) => o.id as string),
    decal: SHIP_OPTIONS.decal.map((o) => o.id as string),
    windows: SHIP_OPTIONS.windows.map((o) => o.id as string),
  }
  for (let i = 0; i < 200; i++) {
    const ship = randomShip(`s-${i}`)
    assert.ok(lists.hull.includes(ship.hull))
    assert.ok(lists.wings.includes(ship.wings))
    assert.ok(lists.decal.includes(ship.decal))
    assert.ok(lists.windows.includes(ship.windows))
    assert.match(ship.palette.hull, /^#[0-9a-f]{6}$/)
  }
})

test('el layout pone mi nave en el origen y no encima las demás', () => {
  const ids = Array.from({ length: 40 }, (_, i) => i + 1)
  const spots = layoutShips(ids, 7)
  assert.equal(spots.length, ids.length)
  assert.deepEqual({ x: spots[0]!.x, y: spots[0]!.y }, { x: 0, y: 0 })
  assert.equal(spots[0]!.id, 7)
  let nearest = Infinity
  for (let i = 0; i < spots.length; i++) {
    for (let j = i + 1; j < spots.length; j++) {
      nearest = Math.min(nearest, Math.hypot(spots[i]!.x - spots[j]!.x, spots[i]!.y - spots[j]!.y))
    }
  }
  assert.ok(nearest > OTHER_SHIP_WIDTH, `dos naves quedaron a ${Math.round(nearest)} px`)
  // la mía es grande: las demás empiezan fuera de su silueta
  const farFromMine = Math.min(...spots.slice(1).map((s) => Math.hypot(s.x, s.y)))
  assert.ok(farFromMine > MY_SHIP_WIDTH * 0.9)
})

test('el layout es estable: lo ya colocado no se mueve al llegar más naves', () => {
  const first = layoutShips([1, 2, 3, 4, 5], 3)
  const known = new Map(first.map((s) => [s.id, { x: s.x, y: s.y }]))
  const again = layoutShips([1, 2, 3, 4, 5, 6, 7], 3, known)
  for (const s of first) {
    const same = again.find((a) => a.id === s.id)!
    assert.deepEqual({ x: same.x, y: same.y }, { x: s.x, y: s.y })
  }
})
