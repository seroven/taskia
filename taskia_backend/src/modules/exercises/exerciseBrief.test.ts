import assert from 'node:assert/strict'
import test from 'node:test'
import { formatExerciseBrief, planExerciseMemory } from './exerciseBrief.js'

test('a new problem photo replaces the stored solution', () => {
  assert.deepEqual(
    planExerciseMemory({ help: true, review: false, draw: false, hasPhoto: true, hasBrief: true }),
    { solve: true, sendPhoto: false, showMaterial: false },
  )
})

test('a later photo of the work is sent once and the solution stays', () => {
  assert.deepEqual(
    planExerciseMemory({ help: false, review: true, draw: false, hasPhoto: true, hasBrief: true }),
    { solve: false, sendPhoto: true, showMaterial: false },
  )
})

test('the first look solves and does not forward the photo', () => {
  assert.deepEqual(
    planExerciseMemory({ help: true, review: false, draw: false, hasPhoto: true, hasBrief: false }),
    { solve: true, sendPhoto: false, showMaterial: false },
  )
  assert.deepEqual(
    planExerciseMemory({ help: false, review: false, draw: false, hasPhoto: false, hasBrief: true }),
    { solve: false, sendPhoto: false, showMaterial: false },
  )
})

test('a photo that is not an exercise is shown once and not solved', () => {
  assert.deepEqual(
    planExerciseMemory({ help: false, review: false, draw: false, hasPhoto: true, hasBrief: false }),
    { solve: false, sendPhoto: false, showMaterial: true },
  )
})

test('asking for a new exercise with a photo still solves', () => {
  assert.deepEqual(
    planExerciseMemory({ help: false, review: false, draw: true, hasPhoto: true, hasBrief: false }),
    { solve: true, sendPhoto: false, showMaterial: false },
  )
})

test('the brief is plain text with the answer', () => {
  const text = formatExerciseBrief(
    '{"exercise":"Halla $3x$","steps":["El radio es perpendicular"],"answer":"$3x = 90$","attempt":""}',
  )
  assert.equal(
    text,
    'Enunciado: Halla 3x\nProceso:\n1. El radio es perpendicular\nRespuesta: 3x = 90',
  )
  assert.equal(formatExerciseBrief('{"exercise":"","steps":[],"answer":""}'), null)
})
