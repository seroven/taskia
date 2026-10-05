import { callGemini, type LlmUsageContext } from '../../infrastructure/gemini/gemini.client.js'
import { extractJson } from '../../utils/helpers.js'
import { drawSceneWithRetries, sceneFromModel } from './pipeline.js'
import { SCENE_RETRY_SYSTEM } from './prompt.js'

export async function resolveModelScene(raw: unknown, usage: LlmUsageContext) {
  return drawSceneWithRetries({
    initial: sceneFromModel(raw),
    retry: async (scene, issues) => {
      const text = await callGemini({
        system: SCENE_RETRY_SYSTEM,
        user: JSON.stringify({ scene, errors: issues }),
        usage,
      })
      return sceneFromModel(JSON.parse(extractJson(text)) as unknown)
    },
  })
}
