import assert from 'node:assert/strict'
import test from 'node:test'
import {
  generateFromSeed,
  planetFingerprint,
  sanitizePlanetConfig,
} from './engine.ts'

test('la misma semilla dibuja el mismo planeta', () => {
  const a = generateFromSeed('rocky_blue:1001', 'rocky_blue')
  const b = generateFromSeed('rocky_blue:1001', 'rocky_blue')
  assert.deepEqual(a, b)
})

test('el sanitizer completa un JSON a medias y evita lava helada', () => {
  const config = sanitizePlanetConfig(
    { bodyType: 'lava', palette: { base: '#7dd3fc' } },
    'semilla-lava',
  )
  assert.equal(config.bodyType, 'lava')
  assert.notEqual(config.palette.base, '#7dd3fc')
  assert.ok(config.face.eyes)
  assert.ok(config.moons.count <= 1)
})

test('mil semillas no comparten el mismo dibujo salvo unas pocas', () => {
  const seen = new Set<string>()
  for (let i = 0; i < 1000; i++) seen.add(planetFingerprint(generateFromSeed(`crew-${i}`)))
  assert.ok(seen.size >= 900, `solo ${seen.size} dibujos distintos`)
})
