import assert from 'node:assert/strict'
import test from 'node:test'
import {
  coerceExplorerPlace,
  readExplorerPlace,
  readGuardianExplorerId,
  writeExplorerPlace,
  writeGuardianExplorerId,
  type PlaceStore,
} from './sessionPlace.ts'

function memoryStore(): PlaceStore {
  const bag = new Map<string, string>()
  return {
    getItem: (key) => bag.get(key) ?? null,
    setItem: (key, value) => {
      bag.set(key, value)
    },
  }
}

test('un estudio guardado vuelve a la misma tarea', () => {
  const store = memoryStore()
  writeExplorerPlace(
    4,
    {
      view: 'study',
      studyTaskId: 12,
      worldId: null,
      courseId: null,
      missionId: null,
      challengeId: null,
      challengeReturn: 'world',
    },
    store,
  )
  assert.equal(readExplorerPlace(4, store).view, 'study')
  assert.equal(readExplorerPlace(4, store).studyTaskId, 12)
  assert.equal(readExplorerPlace(9, store).view, 'hub')
})

test('una misión sin id baja al curso', () => {
  const place = coerceExplorerPlace({
    view: 'mission',
    worldId: 3,
    courseId: 8,
    missionId: null,
  })
  assert.equal(place.view, 'course')
  assert.equal(place.worldId, 3)
  assert.equal(place.courseId, 8)
})

test('un desafío sin id vuelve al mundo', () => {
  const place = coerceExplorerPlace({
    view: 'challenge',
    worldId: 2,
    challengeReturn: 'world',
  })
  assert.equal(place.view, 'world')
})

test('una vista desconocida abre el hub', () => {
  assert.equal(coerceExplorerPlace({ view: 'login' }).view, 'hub')
})

test('el guardián recuerda el explorador elegido', () => {
  const store = memoryStore()
  writeGuardianExplorerId(7, 15, store)
  assert.equal(readGuardianExplorerId(7, store), 15)
  assert.equal(readGuardianExplorerId(8, store), null)
})
