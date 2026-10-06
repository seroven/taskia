import assert from 'node:assert/strict'
import test from 'node:test'
import {
  exerciseReference,
  parseGraphicFlag,
  stripDrewPhrase,
  sheetVariantLine,
  stripMathDelimiters,
  userReferencePhotos,
} from './sheet.js'

test('each sheet variant asks for new numbers and a private mark', () => {
  const line = sheetVariantLine()
  assert.match(line, /Otra variante/)
  assert.match(line, /No agregues medidas ni datos nuevos/)
  assert.match(line, /No dibujes la marca [a-z]{4}/)
})

test('exercise reference photos are only the ones the child uploaded', () => {
  assert.deepEqual(
    userReferencePhotos([
      { role: 'user', image_url: 'https://child.example/photo.jpg' },
      { role: 'assistant', image_url: 'https://taskia.example/sheet.png' },
      { role: 'user', image_url: null },
    ]),
    ['https://child.example/photo.jpg', null],
  )
})

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

test('math delimiters become plain text', () => {
  assert.equal(
    stripMathDelimiters('¿Cuánto crees que mide el ángulo $3x$?'),
    '¿Cuánto crees que mide el ángulo 3x?',
  )
  assert.equal(stripMathDelimiters('cuesta $3 pesos'), 'cuesta $3 pesos')
  assert.equal(stripMathDelimiters('mira \\(3x\\) y $$90^\\circ$$'), 'mira 3x y 90^\\circ')
})
