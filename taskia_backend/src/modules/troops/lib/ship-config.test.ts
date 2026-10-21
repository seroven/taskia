import assert from 'node:assert/strict'
import test from 'node:test'
import {
  BELLIES,
  COCKPITS,
  DECALS,
  HULLS,
  NOSES,
  SHIP_LOCKS,
  TAILS,
  TOPS,
  WINGS,
  generateShipFromSeed,
  sanitizeShipConfig,
  shipConfigSchema,
  shipFingerprint,
} from './ship-config.ts'

test('la misma semilla da la misma nave y siempre es válida', () => {
  const a = generateShipFromSeed('Los Veloces:1')
  const b = generateShipFromSeed('Los Veloces:1')
  assert.deepEqual(a, b)
  assert.doesNotThrow(() => shipConfigSchema.parse(a))
})

test('una nave generada nunca sale pelada: al menos cuatro piezas opcionales puestas', () => {
  for (let i = 0; i < 300; i++) {
    const ship = generateShipFromSeed(`pelada-${i}`)
    const put = [ship.nose, ship.cockpit, ship.wings, ship.tail, ship.top, ship.belly, ship.decal].filter(
      (piece) => piece !== 'none',
    )
    assert.ok(put.length >= 4, `la semilla pelada-${i} solo tiene ${put.length} piezas`)
  }
})

test('mil semillas casi nunca comparten el mismo dibujo', () => {
  const seen = new Set<string>()
  for (let i = 0; i < 1000; i++) seen.add(shipFingerprint(generateShipFromSeed(`crew-${i}`)))
  assert.ok(seen.size >= 950, `solo ${seen.size} naves distintas`)
})

test('el saneado completa un JSON a medias con piezas de la lista', () => {
  const ship = sanitizeShipConfig({ hull: 'barge', wings: 'inventada', engine: { count: 9 } }, 'semilla')
  assert.equal(ship.hull, 'barge')
  assert.ok((WINGS as readonly string[]).includes(ship.wings))
  assert.ok([1, 2, 3].includes(ship.engine.count))
  assert.ok((HULLS as readonly string[]).includes(ship.hull))
  for (const [list, value] of [
    [NOSES, ship.nose],
    [COCKPITS, ship.cockpit],
    [TAILS, ship.tail],
    [TOPS, ship.top],
    [BELLIES, ship.belly],
    [DECALS, ship.decal],
  ] as const) {
    assert.ok((list as readonly string[]).includes(value))
  }
})

test('los colores aceptan «d8b4fe» sin # y «#93c» abreviado (los modelos lo hacen)', () => {
  const ship = sanitizeShipConfig(
    { palette: { hull: 'd8b4fe', trim: '#93c', accent: 'FACC15', glass: '#f0fdf4' } },
    'colores',
  )
  assert.equal(ship.palette.hull, '#d8b4fe')
  assert.equal(ship.palette.trim, '#9933cc')
  assert.equal(ship.palette.accent, '#facc15')
})

test('los colores se respetan tal cual, aunque sean muy oscuros (el niño o la IA pidieron una nave negra)', () => {
  const palette = { hull: '#101010', trim: '#000000', accent: '#111111', glass: '#222222' }
  assert.deepEqual(sanitizeShipConfig({ palette }, 'oscura').palette, palette)
})

test('basura de entrada no rompe el saneado', () => {
  for (const junk of [null, undefined, 42, 'texto', [], { hull: 7, palette: 'rojo' }]) {
    assert.doesNotThrow(() => sanitizeShipConfig(junk, 'basura'))
  }
})

test('las naves nuevas solo usan piezas libres y las cinco bloqueadas esperan a su nivel', () => {
  const locked = new Set(SHIP_LOCKS.map((lock) => `${lock.slot}:${lock.id}`))
  for (let i = 0; i < 400; i++) {
    const ship = generateShipFromSeed(`libre-${i}`)
    const used = [`flame:${ship.engine.flame}`, `engine:${ship.engine.kind}`, `wings:${ship.wings}`, `top:${ship.top}`, `tail:${ship.tail}`]
    assert.ok(used.every((piece) => !locked.has(piece)), `la semilla libre-${i} usa una pieza bloqueada`)
  }
  assert.deepEqual(SHIP_LOCKS.map((lock) => lock.level), [5, 10, 15, 20, 25])
})

test('al guardar, una pieza bloqueada se cambia por una libre salvo que la nave ya la tuviera', () => {
  const base = generateShipFromSeed('nivel')
  const ask = { ...base, engine: { ...base.engine, flame: 'rainbow' as const, kind: 'saturn' as const }, wings: 'butterfly' as const, top: 'orbit' as const, tail: 'crown' as const }

  const low = sanitizeShipConfig(ask, 'nivel', { level: 1 })
  assert.notEqual(low.engine.flame, 'rainbow')
  assert.notEqual(low.engine.kind, 'saturn')
  assert.notEqual(low.wings, 'butterfly')
  assert.notEqual(low.top, 'orbit')
  assert.notEqual(low.tail, 'crown')

  const mid = sanitizeShipConfig(ask, 'nivel', { level: 10 })
  assert.equal(mid.engine.flame, 'rainbow')
  assert.equal(mid.wings, 'butterfly')
  assert.notEqual(mid.engine.kind, 'saturn')

  const full = sanitizeShipConfig(ask, 'nivel', { level: 25 })
  assert.equal(full.tail, 'crown')

  const kept = sanitizeShipConfig(ask, 'nivel', { level: 1, current: ask })
  assert.equal(kept.tail, 'crown')
  assert.equal(kept.engine.flame, 'rainbow')
})
