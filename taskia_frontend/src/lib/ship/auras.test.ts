import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { AURA_LOOK, GL_KINDS } from './auraGl.ts'
import { AURAS, auraLevel } from './auras.ts'

test('los niveles de las auras empiezan en 1 y solo suben', () => {
  assert.equal(AURAS[0]!.level, 1)
  for (let i = 1; i < AURAS.length; i++) assert.ok(AURAS[i]!.level > AURAS[i - 1]!.level, AURAS[i]!.id)
})

test('cada aura de la lista tiene shader y colores, y no se repite', () => {
  const ids = AURAS.map((a) => a.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const id of ids) {
    assert.ok((GL_KINDS as readonly string[]).includes(id), `${id} no está en GL_KINDS`)
    assert.ok(AURA_LOOK[id], `${id} no tiene colores`)
  }
})

test('todos los shaders tienen un nivel (ninguno queda sin poder elegirse)', () => {
  for (const kind of GL_KINDS) assert.ok(auraLevel(kind) >= 1)
  assert.equal(AURAS.length, GL_KINDS.length)
})

test('la lista es la misma que la del backend (ids y niveles, en orden)', () => {
  const source = readFileSync(new URL('../../../../taskia_backend/src/modules/troops/lib/auras.ts', import.meta.url), 'utf-8')
  const backend = [...source.matchAll(/\{ id: '(\w+)', level: (\d+) \}/g)].map((m) => ({ id: m[1], level: Number(m[2]) }))
  assert.deepEqual(backend, AURAS.map((a) => ({ id: a.id, level: a.level })))
})
