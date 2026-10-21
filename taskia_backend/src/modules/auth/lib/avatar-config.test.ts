import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ACCESSORIES,
  BASES,
  EYES,
  FRAMES,
  HAIRS,
  MOUTHS,
  OUTFITS,
  frameUnlocked,
  generateAvatarFromSeed,
  isFrameId,
  resolveUserAvatar,
  sanitizeAvatarConfig,
} from './avatar-config.ts'

test('la misma semilla da siempre el mismo avatar y es válido', () => {
  assert.deepEqual(generateAvatarFromSeed('Iroven'), generateAvatarFromSeed('Iroven'))
  for (let i = 0; i < 300; i++) {
    const a = generateAvatarFromSeed(`u-${i}`)
    assert.ok((BASES as readonly string[]).includes(a.base))
    assert.ok((EYES as readonly string[]).includes(a.eyes))
    assert.ok((MOUTHS as readonly string[]).includes(a.mouth))
    assert.ok((HAIRS as readonly string[]).includes(a.hair))
    assert.ok((OUTFITS as readonly string[]).includes(a.outfit))
    assert.ok((ACCESSORIES as readonly string[]).includes(a.accessory))
    assert.match(a.palette.skin, /^#[0-9a-f]{6}$/)
  }
})

test('sanear completa lo que falta, corrige lo inválido y acepta colores sin # o abreviados', () => {
  const a = sanitizeAvatarConfig({ base: 'robot', eyes: 'inventado', palette: { skin: 'd8b4fe', hair: '#93c', outfit: 'FACC15' } }, 'semilla')
  assert.equal(a.base, 'robot')
  assert.ok((EYES as readonly string[]).includes(a.eyes))
  assert.equal(a.palette.skin, '#d8b4fe')
  assert.equal(a.palette.hair, '#9933cc')
  assert.equal(a.palette.outfit, '#facc15')
  for (const junk of [null, undefined, 42, 'texto', [], { base: 7, palette: 'rojo' }]) {
    assert.doesNotThrow(() => sanitizeAvatarConfig(junk, 'basura'))
  }
})

test('los colores se respetan aunque sean muy oscuros: es decisión del niño', () => {
  const palette = { skin: '#101010', hair: '#000000', outfit: '#111111', accent: '#222222', bg: '#050505' }
  assert.deepEqual(sanitizeAvatarConfig({ palette }, 'oscuro').palette, palette)
})

test('sin avatar guardado no se inventa uno: se pide crearlo', () => {
  assert.equal(resolveUserAvatar(null, 7), null)
  assert.equal(resolveUserAvatar(undefined, 7), null)
  assert.ok(resolveUserAvatar({ base: 'cat' }, 7))
})

test('los marcos se desbloquean por nivel y cada vez piden más', () => {
  assert.ok(isFrameId('none') && isFrameId('orbit') && !isFrameId('frame_captain'))
  assert.equal(frameUnlocked('ring', 1), true)
  assert.equal(frameUnlocked('stars', 7), false)
  assert.equal(frameUnlocked('stars', 8), true)
  assert.equal(frameUnlocked('inventado', 99), false)
  const levels = FRAMES.map((frame) => frame.minLevel)
  assert.deepEqual([...levels].sort((x, y) => x - y), levels, 'los marcos van de menos a más nivel')
})
