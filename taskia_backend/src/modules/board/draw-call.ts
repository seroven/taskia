import { callGemini, type LlmUsageContext } from '../../infrastructure/gemini/gemini.client.js'
import { extractJson } from '../../utils/helpers.js'
import { expanderNames } from './expand.js'
import { parseFactsPayload, type BoardFact, type BoardFactsResult } from './facts.js'
import { drawSceneWithRetries, sceneFromModel } from './pipeline.js'
import { SCENE_RETRY_SYSTEM } from './prompt.js'

const FACT_KINDS = 'object (type), relation (type), number (value), label (text), question (target)'

export function factsSystemPrompt() {
  return `Lees un enunciado o una foto de un ejercicio. No ves ni produces una escena ni coordenadas.
Responde SOLO JSON:
{"statement":"","facts":[],"unsupported":null}
facts usa solo: ${FACT_KINDS}.
Tipos de objeto: ${expanderNames().join(', ')}.
Relaciones: midpoint, parallel_to, perpendicular_to, reflection_of, intersection_of.
Si el ejercicio necesita una primitiva que no está en esas listas, unsupported es su nombre en minusculas_con_guion_bajo y facts puede ir vacío. No sustituyas la figura por otra.
statement: el enunciado corto, solo si el pedido no traía uno. Si ya venía escrito, déjalo vacío.
No incluyas texto del niño fuera de ese JSON.`
}

export async function readBoardFacts(input: {
  source: string
  photoBase64?: string | null
  usage: LlmUsageContext
}): Promise<BoardFactsResult> {
  const started = Date.now()
  const text = await callGemini({
    system: factsSystemPrompt(),
    user: JSON.stringify({ source: input.source.slice(0, 800) }),
    photoBase64: input.photoBase64 ?? null,
    usage: { userId: input.usage.userId, kind: 'board_facts' },
  })
  console.info('[board] facts ms=' + String(Date.now() - started))
  return parseFactsPayload(JSON.parse(extractJson(text)) as unknown)
}

export async function readBoardFactsList(
  prompts: string[],
  usage: LlmUsageContext,
): Promise<BoardFactsResult[]> {
  const started = Date.now()
  const text = await callGemini({
    system: `${factsSystemPrompt()}
Hay varios problemas. Responde {"items":[{"index":0,"statement":"","facts":[],"unsupported":null}]}.`,
    user: JSON.stringify({
      problems: prompts.map((prompt, index) => ({ index, prompt: prompt.slice(0, 400) })),
    }),
    usage: { userId: usage.userId, kind: 'board_facts' },
  })
  console.info('[board] facts ms=' + String(Date.now() - started))
  const parsed = JSON.parse(extractJson(text)) as { items?: unknown }
  const rows = Array.isArray(parsed.items) ? parsed.items : []
  return prompts.map((_, index) => {
    const row = rows.find((item) => item && typeof item === 'object' && Number((item as { index?: unknown }).index) === index)
    return parseFactsPayload(row ?? {})
  })
}

export async function resolveModelScene(raw: unknown, usage: LlmUsageContext, facts: BoardFact[] = []) {
  return drawSceneWithRetries({
    initial: sceneFromModel(raw),
    facts,
    retry: async (scene, issues) => {
      const text = await callGemini({
        system: SCENE_RETRY_SYSTEM,
        user: JSON.stringify({ scene, errors: issues, facts }),
        usage,
      })
      return sceneFromModel(JSON.parse(extractJson(text)) as unknown)
    },
  })
}
