import assert from 'node:assert/strict'
import test from 'node:test'
import { exerciseReference, parseGraphicFlag, stripDrewPhrase } from './sheet.js'

test('exercise reference drops short requests', () => {
  assert.equal(
    exerciseReference(['dame un ejercicio', 'Calcula 3/4 + 1/2 y deja el resultado.']),
    'Calcula 3/4 + 1/2 y deja el resultado.',
  )
  assert.equal(exerciseReference(['ok', 'sí']), '')
})

test('graphic flag is true only when the model says so', () => {
  assert.equal(parseGraphicFlag('{"graphic":true}'), true)
  assert.equal(parseGraphicFlag('{"graphic":false}'), false)
  assert.equal(parseGraphicFlag('no json'), false)
})

test('drew phrase is removed', () => {
  assert.equal(stripDrewPhrase('Mira. Te lo dibujé en la pizarra. ¿Qué ves?'), 'Mira. ¿Qué ves?')
})
