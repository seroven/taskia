import assert from 'node:assert/strict'
import test from 'node:test'
import { expanderNames } from './expand.ts'
import { parseMath } from './expression.ts'
import { coverScene, finishSpeak, isConfirmMessage, normalizeGapKey } from './facts.ts'
import { gradeBoard } from './grade.ts'
import { boundsIssues } from './layout.ts'
import { drawSceneWithRetries, prepareScene } from './pipeline.ts'
import { SCENE_DRAW_PROMPT } from './prompt.ts'

const rectangle = {
  schemaVersion: 1,
  objects: [
    { id: 'R', type: 'rectangle', width: 6, height: 4, vertexLabels: ['A', 'B', 'C', 'D'] },
    { id: 'M', type: 'midpoint', of: ['R.A', 'R.B'] },
    { id: 's', type: 'segment', from: 'M', to: 'R.C', label: '?' },
  ],
  task: { type: 'enter_value', target: 'length:s', unit: 'cm' },
}

test('un rectángulo 6×4 cabe sin llenar la pizarra', () => {
  const prepared = prepareScene({
    schemaVersion: 1,
    objects: [{ id: 'R', type: 'rectangle', width: 6, height: 4 }],
  })
  assert.equal(prepared.ok, true)
  if (!prepared.ok) return
  const cols = prepared.items.flatMap((item) => [item.col, item.endCol ?? item.col])
  const rows = prepared.items.flatMap((item) => [item.row, item.endRow ?? item.row])
  const width = Math.max(...cols) - Math.min(...cols)
  const height = Math.max(...rows) - Math.min(...rows)
  assert.ok(width <= 6 * 8 + 1, `ancho ${width}`)
  assert.ok(height <= 4 * 8 + 1, `alto ${height}`)
  assert.ok(width >= 40, `ancho ${width}`)
})

test('el segmento del punto medio al vértice opuesto mide 5', () => {
  const prepared = prepareScene(rectangle)
  assert.equal(prepared.ok, true)
  if (!prepared.ok) return
  assert.ok(Math.abs(prepared.answer.status === 'value' ? prepared.answer.value - 5 : 99) < 0.02)
  assert.ok(prepared.items.some((item) => item.layer === 'ai' && item.color === 'violet'))
})

test('la ecuación x + 5 = 12 se resuelve en 7 y rechaza un claimed distinto', () => {
  const ok = prepareScene({
    schemaVersion: 1,
    objects: [{ id: 'eq', type: 'expression', text: 'x + 5 = 12' }],
    task: { type: 'enter_value', target: 'x', claimedAnswer: 7 },
  })
  assert.equal(ok.ok, true)
  if (ok.ok) assert.equal(ok.answer.status === 'value' ? ok.answer.value : null, 7)

  const bad = prepareScene({
    schemaVersion: 1,
    objects: [{ id: 'eq', type: 'expression', text: 'x + 5 = 12' }],
    task: { type: 'enter_value', target: 'x', claimedAnswer: 8 },
  })
  assert.equal(bad.ok, false)
  if (!bad.ok) assert.equal(bad.issues[0]?.code, 'ANSWER_MISMATCH')
})

test('el parser acepta coma decimal y rechaza código', () => {
  const parsed = parseMath('3,5 + 1')
  assert.equal(parsed.ok, true)
  assert.equal(parseMath('alert(1)').ok, false)
  assert.equal(parseMath('x + y + 1 = 2').ok, true)
})

test('un path que cierra entra y uno abierto queda indeterminado', () => {
  const closed = prepareScene({
    schemaVersion: 1,
    objects: [
      {
        id: 'L',
        type: 'path',
        steps: [
          { length: 6 },
          { turn: 'left', length: 2 },
          { turn: 'left', length: 4 },
          { turn: 'right', length: 2 },
          { turn: 'left', length: 2 },
          { turn: 'left', length: 4 },
        ],
      },
    ],
  })
  assert.equal(closed.ok, true)

  const open = prepareScene({
    schemaVersion: 1,
    objects: [
      {
        id: 'L',
        type: 'path',
        steps: [
          { length: 6 },
          { turn: 'left', length: 2 },
          { turn: 'left', length: 4 },
        ],
      },
    ],
  })
  assert.equal(open.ok, false)
  if (!open.ok) assert.equal(open.issues[0]?.code, 'UNDERDETERMINED')
})

test('el triángulo 3-4-5 tiene hipotenusa 5', () => {
  const prepared = prepareScene({
    schemaVersion: 1,
    objects: [{ id: 'T', type: 'right_triangle', a: 3, b: 4, vertexLabels: ['A', 'B', 'C'] }],
    task: { type: 'enter_value', target: 'length:T.e1', unit: 'cm' },
  })
  assert.equal(prepared.ok, true)
  if (prepared.ok && prepared.answer.status === 'value') {
    assert.ok(Math.abs(prepared.answer.value - 5) < 0.02)
  }
})

test('la reflexión de un punto sobre la base queda a la misma distancia', () => {
  const prepared = prepareScene({
    schemaVersion: 1,
    objects: [
      { id: 'T', type: 'right_triangle', a: 3, b: 4, vertexLabels: ['A', 'B', 'C'] },
      { id: 'axis', type: 'segment', from: 'T.A', to: 'T.B' },
      { id: 'C2', type: 'reflection_of', of: 'T.C', over: 'axis' },
      { id: 'h', type: 'segment', from: 'T.C', to: 'C2' },
    ],
    task: { type: 'enter_value', target: 'length:h', claimedAnswer: 8 },
  })
  assert.equal(prepared.ok, true)
  if (prepared.ok && prepared.answer.status === 'value') {
    assert.ok(Math.abs(prepared.answer.value - 8) < 0.02)
  }
})

test('una referencia rota, un ciclo y un polígono contradictorio tienen su código', () => {
  const missing = prepareScene({
    schemaVersion: 1,
    objects: [{ id: 'M', type: 'midpoint', of: ['Z', 'Y'] }],
  })
  assert.equal(missing.ok, false)
  if (!missing.ok) assert.equal(missing.issues[0]?.code, 'BAD_REFERENCE')

  const cycle = prepareScene({
    schemaVersion: 1,
    objects: [
      { id: 'A', type: 'point' },
      { id: 'B', type: 'point' },
      { id: 'M', type: 'midpoint', of: ['N', 'A'] },
      { id: 'N', type: 'midpoint', of: ['M', 'B'] },
    ],
  })
  assert.equal(cycle.ok, false)
  if (!cycle.ok) assert.equal(cycle.issues[0]?.code, 'BAD_REFERENCE')

  const tight = prepareScene({
    schemaVersion: 1,
    objects: [
      { id: 'A', type: 'point' },
      { id: 'B', type: 'point' },
      { id: 'C', type: 'point' },
      { id: 'D', type: 'point' },
      {
        id: 'Q',
        type: 'polygon',
        vertices: ['A', 'B', 'C', 'D'],
        sides: { AB: 4, BC: 4, CD: 4, DA: 4 },
        angles: { B: 60, C: 60, D: 60 },
      },
    ],
  })
  assert.equal(tight.ok, false)
  if (!tight.ok) assert.ok(tight.issues.some((issue) => issue.code === 'OVERCONSTRAINED' || issue.code === 'UNDERDETERMINED'))
})

test('una expresión ilegible es BAD_EXPRESSION', () => {
  const prepared = prepareScene({
    schemaVersion: 1,
    objects: [{ id: 'eq', type: 'expression', text: 'hola mundo' }],
  })
  assert.equal(prepared.ok, false)
  if (!prepared.ok) assert.equal(prepared.issues[0]?.code, 'BAD_EXPRESSION')
})

test('el reintento corrige la escena y, si no, deja el mensaje de fallback', async () => {
  const fixed = await drawSceneWithRetries({
    initial: { schemaVersion: 1, objects: [{ id: 'eq', type: 'expression', text: '??' }] },
    retry: async () => ({
      schemaVersion: 1,
      objects: [{ id: 'eq', type: 'expression', text: 'x + 5 = 12' }],
    }),
  })
  assert.equal(fixed.ok, true)

  const exhausted = await drawSceneWithRetries({
    initial: { schemaVersion: 1, objects: [{ id: 'eq', type: 'expression', text: '??' }] },
    retry: async () => ({ schemaVersion: 1, objects: [{ id: 'eq', type: 'expression', text: '??' }] }),
    maxRetries: 2,
  })
  assert.equal(exhausted.ok, false)
  if (!exhausted.ok) assert.match(exhausted.fallback, /lo armamos juntos/)
})

test('una etiqueta fuera de la grilla es OUT_OF_BOUNDS', () => {
  const issues = boundsIssues([
    { id: 'x', layer: 'ai', kind: 'text', col: -2, row: 0, w: 1, h: 1 },
  ])
  assert.equal(issues[0]?.code, 'OUT_OF_BOUNDS')
})

test('un lado declarado que no coincide es SIDE_MISMATCH y las etiquetas amontonadas son LABEL_OVERLAP', () => {
  const side = prepareScene({
    schemaVersion: 1,
    objects: [
      { id: 'R', type: 'rectangle', width: 6, height: 4 },
      { id: 's', type: 'segment', from: 'R.A', to: 'R.B', length: 9 },
    ],
  })
  assert.equal(side.ok, false)
  if (!side.ok) assert.equal(side.issues[0]?.code, 'SIDE_MISMATCH')

  const labels = Array.from({ length: 8 }, (_, index) => ({
    id: `L${index}`,
    type: 'label',
    text: 'aaaa',
    of: 'R.A',
  }))
  const piled = prepareScene({
    schemaVersion: 1,
    objects: [{ id: 'R', type: 'rectangle', width: 6, height: 4 }, ...labels],
  })
  assert.equal(piled.ok, false)
  if (!piled.ok) assert.ok(piled.issues.some((issue) => issue.code === 'LABEL_OVERLAP'))
})

test('el veredicto del niño sale del código', () => {
  const scene = {
    ...rectangle,
    task: { type: 'enter_value', target: 'length:s', unit: 'cm', claimedAnswer: 5 },
  }
  const good = gradeBoard({ scene, board: { items: [] }, childMessage: '5' })
  assert.equal(good.verdict, 'correct')
  assert.equal(good.expected, 5)
  const bad = gradeBoard({ scene, board: { items: [{ layer: 'student', kind: 'text', text: '9', col: 1, row: 1 }] } })
  assert.equal(bad.verdict, 'incorrect')
  assert.equal(bad.got, 9)
})

test('cada expansor está nombrado en el prompt', () => {
  for (const name of expanderNames()) {
    assert.match(SCENE_DRAW_PROMPT, new RegExp(`(^|[^a-z_])${name}([^a-z_]|$)`))
  }
})

test('el triángulo no escribe la hipotenusa y el círculo no escribe el radio', () => {
  const triangle = prepareScene({
    schemaVersion: 1,
    objects: [{ id: 'T', type: 'right_triangle', a: 3, b: 4, vertexLabels: ['A', 'B', 'C'] }],
  })
  assert.equal(triangle.ok, true)
  if (!triangle.ok) return
  const texts = triangle.items.map((item) => item.text)
  assert.equal(texts.includes('5'), false)
  assert.equal(texts.includes('3'), true)
  assert.equal(texts.includes('4'), true)

  const circle = prepareScene({
    schemaVersion: 1,
    objects: [
      { id: 'R', type: 'rectangle', width: 6, height: 4 },
      { id: 'C', type: 'circle', center: 'R.A', radius: 5 },
    ],
  })
  assert.equal(circle.ok, true)
  if (!circle.ok) return
  assert.equal(circle.items.some((item) => item.text === '5'), false)
})

test('una escena que no cubre los hechos es MISSING_FACT', () => {
  const prepared = prepareScene({
    schemaVersion: 1,
    objects: [
      { id: 'R', type: 'rectangle', width: 2, height: 2 },
      { id: 'C', type: 'circle', center: 'R.A', radius: 3 },
    ],
  })
  assert.equal(prepared.ok, true)
  if (!prepared.ok) return
  const issues = coverScene(
    [
      { kind: 'object', type: 'rectangle' },
      { kind: 'number', value: 6 },
    ],
    prepared.scene,
  )
  assert.ok(issues.some((issue) => issue.code === 'MISSING_FACT'))
})

test('unsupported no reintenta la escena', async () => {
  let calls = 0
  const drawn = await drawSceneWithRetries({
    initial: { schemaVersion: 1, objects: [{ id: 'T', type: 'tangent_line' }] },
    retry: async () => {
      calls += 1
      return null
    },
  })
  assert.equal(calls, 0)
  assert.equal(drawn.ok, false)
  if (!drawn.ok) assert.equal(drawn.issues[0]?.code, 'UNSUPPORTED')
})

test('un hecho que falta se reintenta con los hechos congelados', async () => {
  const circle = {
    schemaVersion: 1,
    objects: [
      { id: 'R', type: 'rectangle', width: 2, height: 2 },
      { id: 'C', type: 'circle', center: 'R.A', radius: 1 },
    ],
  }
  const facts = [
    { kind: 'object' as const, type: 'rectangle' },
    { kind: 'number' as const, value: 6 },
  ]
  let calls = 0
  const drawn = await drawSceneWithRetries({
    initial: circle,
    facts,
    retry: async (_scene, issues) => {
      calls += 1
      assert.equal(issues[0]?.code, 'MISSING_FACT')
      if (calls < 2) return circle
      return {
        schemaVersion: 1,
        objects: [{ id: 'R', type: 'rectangle', width: 6, height: 4 }],
      }
    },
  })
  assert.equal(calls, 2)
  assert.equal(drawn.ok, true)
})

test('la frase de fallo reemplaza y la de éxito se agrega al pasar', () => {
  assert.equal(finishSpeak('Ya te lo dibujé, mira.', 'fallback'), 'No pude dibujarlo bien, ¿lo armamos juntos?')
  assert.equal(
    finishSpeak('El rectángulo mide 6 por 4.', 'drawn', 'Un rectángulo de 6 por 4.'),
    'Un rectángulo de 6 por 4. El rectángulo mide 6 por 4. Te lo dibujé en la pizarra.',
  )
  assert.equal(normalizeGapKey('Tangente-1!'), 'tangente')
  assert.equal(normalizeGapKey('!!!'), 'other')
  assert.equal(isConfirmMessage('Sí'), true)
  assert.equal(isConfirmMessage('no, cambia el 6'), false)
})
