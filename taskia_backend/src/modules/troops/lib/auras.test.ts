import assert from 'node:assert/strict'
import test from 'node:test'
import { AURAS, AURA_IDS, auraLevel, checkAura, resolveAura } from './auras.ts'

test('los niveles de las auras solo suben y empiezan en 1', () => {
  assert.equal(AURAS[0].level, 1)
  for (let i = 1; i < AURAS.length; i++) assert.ok(AURAS[i]!.level > AURAS[i - 1]!.level, AURAS[i]!.id)
})

test('no hay ids repetidos', () => {
  assert.equal(new Set(AURA_IDS).size, AURA_IDS.length)
})

test('resolveAura devuelve null con lo que no es un aura conocida', () => {
  assert.equal(resolveAura('nova'), 'nova')
  assert.equal(resolveAura('inventada'), null)
  assert.equal(resolveAura(null), null)
  assert.equal(resolveAura(42), null)
})

test('sin aura siempre se puede', () => {
  assert.equal(checkAura(null, 1, 'nova'), null)
  assert.equal(checkAura('', 1, null), null)
})

test('un aura libre se acepta; una bloqueada se rechaza con su nivel', () => {
  assert.equal(checkAura('halo', 1, null), 'halo')
  assert.throws(() => checkAura('nova', 5, null), /nivel 27/)
  assert.equal(checkAura('nova', auraLevel('nova'), null), 'nova')
})

test('un aura desconocida se rechaza', () => {
  assert.throws(() => checkAura('arcoiris', 99, null), /no existe/)
})

test('lo que la tripulación ya tenía se conserva aunque pida más nivel', () => {
  assert.equal(checkAura('storm', 1, 'storm'), 'storm')
})
