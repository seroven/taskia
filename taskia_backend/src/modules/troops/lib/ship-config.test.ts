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
  WINDOWS,
  ENGINES,
  FLAMES,
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

test('cada parte bloquea tres piezas reales (niveles 5, 15 y 25) y las naves nuevas solo usan las libres', () => {
  const lists: Record<string, readonly string[]> = {
    hull: HULLS, nose: NOSES, cockpit: COCKPITS, wings: WINGS, tail: TAILS, engine: ENGINES, flame: FLAMES, top: TOPS, belly: BELLIES, decal: DECALS, windows: WINDOWS,
  }
  assert.equal(SHIP_LOCKS.length, 33)
  for (const lock of SHIP_LOCKS) assert.ok(lists[lock.slot]!.includes(lock.id), `${lock.slot}:${lock.id} no existe`)
  for (const slot of Object.keys(lists)) assert.deepEqual(SHIP_LOCKS.filter((l) => l.slot === slot).map((l) => l.level), [5, 15, 25])

  const locked = new Set(SHIP_LOCKS.map((lock) => `${lock.slot}:${lock.id}`))
  for (let i = 0; i < 400; i++) {
    const s = generateShipFromSeed(`libre-${i}`)
    const used = [`hull:${s.hull}`, `nose:${s.nose}`, `cockpit:${s.cockpit}`, `wings:${s.wings}`, `tail:${s.tail}`, `engine:${s.engine.kind}`, `flame:${s.engine.flame}`, `top:${s.top}`, `belly:${s.belly}`, `decal:${s.decal}`, `windows:${s.windows}`]
    assert.ok(used.every((piece) => !locked.has(piece)), `la semilla libre-${i} usa una pieza bloqueada`)
  }
})

test('al guardar, las piezas bloqueadas se cambian por una libre salvo las que la nave ya tenía', () => {
  const base = generateShipFromSeed('nivel')
  const top = (slot: string) => SHIP_LOCKS.find((l) => l.slot === slot && l.level === 25)!.id
  const ask = {
    ...base,
    hull: top('hull'), nose: top('nose'), cockpit: top('cockpit'), wings: top('wings'), tail: top('tail'), top: top('top'),
    belly: top('belly'), decal: top('decal'), windows: top('windows'),
    engine: { ...base.engine, kind: top('engine'), flame: top('flame') },
  }
  type Ship = ReturnType<typeof generateShipFromSeed>
  const pieces = (s: Ship) => [s.hull, s.nose, s.cockpit, s.wings, s.tail, s.top, s.belly, s.decal, s.windows, s.engine.kind, s.engine.flame] as string[]
  const wanted = pieces(ask as unknown as Ship)

  const low = sanitizeShipConfig(ask, 'nivel', { level: 1 })
  assert.ok(pieces(low).every((piece, i) => piece !== wanted[i]), 'a nivel 1 no debe quedar ninguna pieza de nivel 25')

  const mid = sanitizeShipConfig(ask, 'nivel', { level: 15 })
  assert.ok(pieces(mid).every((piece, i) => piece !== wanted[i]), 'a nivel 15 aún no se abren las de nivel 25')

  const full = sanitizeShipConfig(ask, 'nivel', { level: 25 })
  assert.deepEqual(pieces(full), wanted)

  const kept = sanitizeShipConfig(ask, 'nivel', { level: 1, current: ask })
  assert.deepEqual(pieces(kept), wanted)
})
