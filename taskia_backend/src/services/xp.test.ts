import assert from 'node:assert/strict'
import test from 'node:test'
import { challengeTimeFactor, xpForChallenge } from './xp.js'

test('challenge time factor stays between 0.7 and 1.15', () => {
  assert.equal(challengeTimeFactor(90_000, 1), 1)
  assert.equal(challengeTimeFactor(45_000, 1), 1.15)
  assert.equal(challengeTimeFactor(180_000, 1), 0.7)
})

test('xp floor applies after the time factor', () => {
  assert.equal(xpForChallenge('mission', 'warm', 0, 90_000, 1), 4)
  assert.equal(xpForChallenge('mission', 'warm', 100, 45_000, 1), 92)
})
