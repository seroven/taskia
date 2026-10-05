import assert from 'node:assert/strict'
import test from 'node:test'
import { auditScene, drawSceneWithRetries, prepareScene } from './pipeline.ts'
import { expanderNames } from './expand.ts'
import { parseMath, solveFor } from './expression.ts'
import { coverScene, finishSpeak, isConfirmMessage, normalizeGapKey } from './facts.ts'
import { gradeBoard } from './grade.ts'
import { boundsIssues } from './layout.ts'
import { SCENE_DRAW_PROMPT } from './prompt.ts'
import { rEq, rInt } from './rational.ts'

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
  if (ok.ok && ok.answer.status === 'value') {
    assert.equal(ok.answer.value, 7)
    assert.equal(ok.answer.exact, 'exact')
  }

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
    initial: { schemaVersion: 1, objects: [{ id: 'S', type: 'not_a_shape', side: 4 }] },
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

test('0,5 es un medio y dividir por cero no entra', () => {
  const half = parseMath('0,5')
  assert.equal(half.ok, true)
  if (half.ok && half.math.kind === 'value') {
    const value = solveFor(half.math, '')
    const expected = rInt(1n)
    assert.ok(value && expected && rEq(value, { n: 1n, d: 2n }))
  }
  const broken = prepareScene({
    schemaVersion: 1,
    objects: [{ id: 'eq', type: 'expression', text: '1/0' }],
  })
  assert.equal(broken.ok, false)
  if (!broken.ok) assert.equal(broken.issues[0]?.code, 'BAD_EXPRESSION')
})

const choices = [
  { id: 'a', text: '50°' },
  { id: 'b', text: '60°' },
  { id: 'c', text: '75°' },
  { id: 'd', text: '85°' },
  { id: 'e', text: '90°' },
]

function tangentScene(radius = 5, rotation = 0, angles?: [number, number]) {
  return {
    schemaVersion: 1,
    objects: [
      { id: 'O', type: 'point' },
      { id: 'C', type: 'circle', center: 'O', radius, ...(rotation ? { rotation } : {}) },
      { id: 'T', type: 'point_on_circle', circle: 'C', ...(angles ? { angleDeg: angles[0] } : {}) },
      { id: 'Q', type: 'point_on_circle', circle: 'C', ...(angles ? { angleDeg: angles[1] } : {}) },
      { id: 'L1', type: 'tangent_line', circle: 'C', at: 'T', label: 'L1' },
      { id: 'L2', type: 'tangent_line', circle: 'C', at: 'Q', label: 'L2' },
      { id: 'OT', type: 'radius', circle: 'C', to: 'T' },
      { id: 'OQ', type: 'radius', circle: 'C', to: 'Q' },
      { id: 'a1', type: 'angle', vertex: 'T', from: 'L1.a', to: 'O', label: '3x' },
      { id: 'a2', type: 'angle', vertex: 'Q', from: 'L2.a', to: 'O', label: '2y' },
    ],
    task: { type: 'multiple_choice', target: 'x+y', unit: '°', choices },
  }
}

test('las dos tangentes dan x+y = 75 y no depende del tamaño', () => {
  for (const scene of [tangentScene(), tangentScene(9, 30, [15, 140]), tangentScene(4, 80)]) {
    const prepared = prepareScene(scene)
    assert.equal(prepared.ok, true, prepared.ok ? '' : prepared.issues.map((issue) => issue.code).join(','))
    if (!prepared.ok || prepared.answer.status !== 'value') continue
    assert.equal(prepared.answer.value, 75)
    assert.equal(prepared.answer.exact, 'exact')
  }
  const graded = gradeBoard({ scene: tangentScene(), board: { items: [] }, childMessage: 'c' })
  assert.equal(graded.verdict, 'correct')
  const wrong = gradeBoard({ scene: tangentScene(), board: { items: [] }, childMessage: 'a' })
  assert.equal(wrong.verdict, 'incorrect')
})

test('el inscrito es la mitad exacta del central', () => {
  const prepared = prepareScene({
    schemaVersion: 1,
    objects: [
      { id: 'O', type: 'point' },
      { id: 'C', type: 'circle', center: 'O', radius: 5 },
      { id: 'A', type: 'point_on_circle', circle: 'C', angleDeg: 0 },
      { id: 'B', type: 'point_on_circle', circle: 'C' },
      { id: 'c1', type: 'central_angle', circle: 'C', from: 'A', to: 'B', degrees: 80, label: '80°' },
      { id: 'P', type: 'point' },
      { id: 'i1', type: 'inscribed_angle', circle: 'C', vertex: 'P', from: 'A', to: 'B', sameArc: 'c1' },
    ],
    task: { type: 'enter_value', target: 'angle:i1', claimedAnswer: 40 },
  })
  assert.equal(prepared.ok, true, prepared.ok ? '' : prepared.issues.map((issue) => issue.code).join(','))
  if (prepared.ok && prepared.answer.status === 'value') {
    assert.equal(prepared.answer.value, 40)
    assert.equal(prepared.answer.exact, 'exact')
  }
})

test('un círculo y un triángulo ajeno no cubren la tangente', () => {
  const scene = {
    schemaVersion: 1,
    objects: [
      { id: 'O', type: 'point' },
      { id: 'C', type: 'circle', center: 'O', radius: 4 },
      { id: 'T', type: 'right_triangle', a: 3, b: 4 },
    ],
  }
  const checked = auditScene(scene, [{ kind: 'object', type: 'tangent_line' }])
  assert.equal(checked.ok, false)
  if (!checked.ok) assert.equal(checked.issues[0]?.code, 'MISSING_FACT')
})

test('una alternativa que no contiene la respuesta no se publica', () => {
  const scene = tangentScene()
  scene.task = {
    type: 'multiple_choice',
    target: 'x+y',
    choices: [
      { id: 'a', text: '50°' },
      { id: 'b', text: '60°' },
    ],
  }
  const prepared = prepareScene(scene)
  assert.equal(prepared.ok, false)
  if (!prepared.ok) assert.equal(prepared.issues[0]?.code, 'ANSWER_MISMATCH')
})

const elbow = {
  schemaVersion: 1,
  objects: [
    {
      id: 'L',
      type: 'path',
      steps: [
        { length: 6 },
        { turn: 'left', length: 2 },
        { turn: 'left', length: 2 },
        { turn: 'right', length: 2 },
        { turn: 'left', length: 4 },
        { turn: 'left', length: 4 },
      ],
    },
  ],
}

test('el cuadrado de lado 4 tiene área 16 y ángulo recto en A', () => {
  const prepared = prepareScene({
    schemaVersion: 1,
    objects: [
      { id: 'S', type: 'square', side: 4 },
      { id: 'm', type: 'mark', kind: 'right_angle', of: 'S.A' },
    ],
    task: { type: 'enter_value', target: 'area:S', claimedAnswer: 16 },
  })
  assert.equal(prepared.ok, true)
  if (!prepared.ok || prepared.answer.status !== 'value') return
  assert.ok(Math.abs(prepared.answer.value - 16) < 0.02)
})

test('la L tiene perímetro 20 y área 20', () => {
  const perimeter = prepareScene({ ...elbow, task: { type: 'enter_value', target: 'perimeter:L', claimedAnswer: 20 } })
  const area = prepareScene({ ...elbow, task: { type: 'enter_value', target: 'area:L', claimedAnswer: 20 } })
  assert.equal(perimeter.ok, true)
  assert.equal(area.ok, true)
  if (!perimeter.ok || !area.ok) return
  if (perimeter.answer.status === 'value') assert.ok(Math.abs(perimeter.answer.value - 20) < 0.02)
  if (area.answer.status === 'value') assert.ok(Math.abs(area.answer.value - 20) < 0.02)
  const texts = area.items.map((item) => item.text).filter(Boolean)
  assert.equal(texts.includes('20'), false)
})

test('dos ángulos de 50° y 60° dejan el tercero en 70, sin depender de la base', () => {
  function third(extra: Record<string, unknown> = {}) {
    return prepareScene({
      schemaVersion: 1,
      objects: [{ id: 'T', type: 'triangle', angles: [50, 60], ...extra }],
      task: { type: 'enter_value', target: 'angle:T.C', claimedAnswer: 70 },
    })
  }
  for (const extra of [{}, { base: 10 }, { rotation: 30 }, { base: 3, rotation: -20 }]) {
    const prepared = third(extra)
    assert.equal(prepared.ok, true, JSON.stringify(extra))
    if (!prepared.ok || prepared.answer.status !== 'value') continue
    assert.ok(Math.abs(prepared.answer.value - 70) < 0.02, String(prepared.answer.value))
    assert.equal(
      prepared.items.some((item) => item.text === '70' || item.text === '70°'),
      false,
    )
  }
  const wrong = prepareScene({
    schemaVersion: 1,
    objects: [{ id: 'T', type: 'triangle', angles: [50, 60] }],
    task: { type: 'enter_value', target: 'angle:T.C', claimedAnswer: 80 },
  })
  assert.equal(wrong.ok, false)
  if (!wrong.ok) assert.equal(wrong.issues[0]?.code, 'ANSWER_MISMATCH')

  const flat = prepareScene({
    schemaVersion: 1,
    objects: [{ id: 'T', type: 'triangle', sides: [1, 1, 3] }],
  })
  assert.equal(flat.ok, false)
  if (!flat.ok) assert.equal(flat.issues[0]?.code, 'OVERCONSTRAINED')

  const wide = prepareScene({
    schemaVersion: 1,
    objects: [{ id: 'T', type: 'triangle', angles: [50, 140] }],
  })
  assert.equal(wide.ok, false)
  if (!wide.ok) assert.equal(wide.issues[0]?.code, 'OVERCONSTRAINED')
})

test('una marca de ángulo recto sobre un ángulo de 60° se rechaza', () => {
  const prepared = prepareScene({
    schemaVersion: 1,
    objects: [
      { id: 'O', type: 'point' },
      { id: 'C', type: 'circle', center: 'O', radius: 5 },
      { id: 'A', type: 'point_on_circle', circle: 'C', angleDeg: 0 },
      { id: 'B', type: 'point_on_circle', circle: 'C' },
      { id: 'c1', type: 'central_angle', circle: 'C', from: 'A', to: 'B', degrees: 60 },
      { id: 'm', type: 'mark', kind: 'right_angle', of: 'c1' },
    ],
  })
  assert.equal(prepared.ok, false)
  if (!prepared.ok) assert.equal(prepared.issues[0]?.code, 'BAD_SCHEMA')
})
