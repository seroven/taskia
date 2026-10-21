import assert from 'node:assert/strict'
import test from 'node:test'
import { ACCESSORIES, AVATAR_OPTIONS, BASES, EYES, FRAMES, HAIRS, MOUTHS, OUTFITS, frameUnlocked, randomAvatar } from './types.ts'

test('las opciones de cada parte coinciden con las listas del modelo', () => {
  assert.deepEqual(AVATAR_OPTIONS.base.map((o) => o.id), [...BASES])
  assert.deepEqual(AVATAR_OPTIONS.eyes.map((o) => o.id), [...EYES])
  assert.deepEqual(AVATAR_OPTIONS.mouth.map((o) => o.id), [...MOUTHS])
  assert.deepEqual(AVATAR_OPTIONS.hair.map((o) => o.id), [...HAIRS])
  assert.deepEqual(AVATAR_OPTIONS.outfit.map((o) => o.id), [...OUTFITS])
  assert.deepEqual(AVATAR_OPTIONS.accessory.map((o) => o.id), [...ACCESSORIES])
})

test('randomAvatar es determinista y siempre válido', () => {
  assert.deepEqual(randomAvatar('a'), randomAvatar('a'))
  for (let i = 0; i < 200; i++) {
    const a = randomAvatar(`s-${i}`)
    assert.ok((BASES as readonly string[]).includes(a.base))
    assert.ok((EYES as readonly string[]).includes(a.eyes))
    assert.match(a.palette.skin, /^#[0-9a-f]{6}$/)
    assert.match(a.palette.bg, /^#[0-9a-f]{6}$/)
  }
})

test('los marcos piden cada vez más nivel y se desbloquean con él', () => {
  const levels = FRAMES.map((frame) => frame.minLevel)
  assert.deepEqual([...levels].sort((x, y) => x - y), levels)
  assert.equal(frameUnlocked('none', 1), true)
  assert.equal(frameUnlocked('stars', 7), false)
  assert.equal(frameUnlocked('stars', 8), true)
  assert.equal(frameUnlocked('inventado', 99), false)
})
