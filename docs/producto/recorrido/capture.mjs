/**
 * Capturas del recorrido actual de Taskia (local).
 * Uso: node docs/producto/recorrido/capture.mjs
 * Requiere front en http://localhost:5173 (CORS) y API en :3001.
 */
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'capturas')
const BASE = process.env.TASKIA_URL || 'http://localhost:5173'
const VIEWPORT = { width: 1280, height: 800 }

async function shot(page, name) {
  await page.waitForTimeout(700)
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false })
  console.log('  ·', name)
  return name
}

async function openApp(browser) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    permissions: ['microphone'],
  })
  const page = await context.newPage()
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('  [console]', msg.text().slice(0, 160))
  })
  return { context, page }
}

async function login(page, username, password) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.locator('input[autocomplete="username"]').waitFor({ timeout: 15000 })
  await page.locator('input[autocomplete="username"]').fill(username)
  await page.locator('input[autocomplete="current-password"]').fill(password)
  await page.getByRole('button', { name: '¡Entrar!' }).click()
  await page.waitForTimeout(1500)
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  })
  const taken = []

  // —— Login (sin sesión) ——
  {
    const { context, page } = await openApp(browser)
    await page.goto(BASE, { waitUntil: 'networkidle' })
    taken.push(await shot(page, '01-login'))
    await context.close()
  }

  // —— Explorador ——
  {
    const { context, page } = await openApp(browser)
    await login(page, 'Seroven', '123456')
    await page.getByRole('button', { name: /Campamento/i }).waitFor({ timeout: 20000 })
    taken.push(await shot(page, '02-hub-explorador'))

    await page.getByRole('button', { name: /Campamento/i }).click()
    await page.locator('.camp-shell').first().waitFor({ timeout: 15000 })

    // Crear diaria con ayuda de Taskia si el día está vacío
    if ((await page.locator('button.camp-row-cta').count()) === 0) {
      await page.getByRole('button', { name: /Nueva tarea|Agregar tarea/i }).first().click()
      await page.locator('.modal-backdrop, .modal-shell').first().waitFor({ timeout: 8000 })
      await page.locator('.modal-panel-body input.field-control').first().fill('Repaso de fracciones')
      await page.locator('.modal-panel-body textarea').fill(
        'Sumar y restar fracciones con el mismo denominador',
      )
      await page.locator('.modal-panel-body .select-trigger').first().click()
      await page.locator('[role="option"]').first().click()
      const help = page.locator('.camp-help-switch input[type="checkbox"]')
      if (await help.count() && !(await help.isChecked())) await help.check()
      await page.getByRole('button', { name: 'Crear tarea' }).click()
      try {
        await page.locator('.modal-backdrop').waitFor({ state: 'hidden', timeout: 10000 })
      } catch {
        await shot(page, 'debug-modal-tarea')
        await page.getByRole('button', { name: 'Cancelar' }).click().catch(() => {})
      }
      await page.waitForTimeout(800)
    }

    taken.push(await shot(page, '03-campamento-hoy'))

    await page.locator('.camp-tab').filter({ hasText: 'Proyectos' }).click()
    await page.waitForTimeout(600)
    taken.push(await shot(page, '04-campamento-proyectos'))

    await page.locator('.camp-tab').filter({ hasText: 'Hoy' }).click()
    await page.waitForTimeout(400)

    const cta = page.locator('button.camp-row-cta').first()
    if (await cta.count()) {
      await cta.click()
      try {
        await page.locator('.study-page').waitFor({ timeout: 15000 })
        await page
          .getByRole('button', { name: /Campamento|Volver/i })
          .or(page.locator('.study-chat'))
          .first()
          .waitFor({ timeout: 45000 })
        taken.push(await shot(page, '05-estudio-tarea'))
        const hablar = page.getByRole('button', { name: 'Hablar' }).first()
        if (await hablar.count()) {
          await hablar.click()
          await page.locator('.study-voice-stage').waitFor({ timeout: 8000 })
          taken.push(await shot(page, '05b-estudio-hablar'))
          const closeVoice = page.getByRole('button', { name: /Volver al chat|Cerrar/i }).first()
          if (await closeVoice.count()) await closeVoice.click()
          await page.waitForTimeout(400)
        }
      } catch (err) {
        console.log('  (estudio no listo)', String(err).slice(0, 120))
        await shot(page, 'debug-estudio')
      }
      const back = page.getByRole('button', { name: /Campamento|Volver/i }).first()
      if (await back.count()) {
        await back.click()
        await page.waitForTimeout(800)
      }
    }

    if (await page.locator('.modal-backdrop').count()) {
      await page.getByRole('button', { name: 'Cancelar' }).click().catch(() => {})
      await page.waitForTimeout(400)
    }
    // Si seguimos en estudio, forzar salida
    const studyBack = page.getByRole('button', { name: /Campamento|Volver/i }).first()
    if (await studyBack.count()) {
      await studyBack.click()
      await page.waitForTimeout(600)
    }
    await page.getByRole('button', { name: 'Inicio' }).click({ timeout: 15000 })
    await page.getByRole('button', { name: /Mundos/i }).waitFor({ timeout: 10000 })

    await page.getByRole('button', { name: /Mundos/i }).click()
    await page.locator('.worlds-shell').first().waitFor({ timeout: 15000 })
    taken.push(await shot(page, '06-mundos-lista'))

    const worldCard = page.locator('button.worlds-cover').first()
    if (await worldCard.count()) {
      await worldCard.click()
      await page.waitForTimeout(1000)
      taken.push(await shot(page, '07-mundo-detalle'))

      const course = page.locator('button.worlds-cover').first()
      if (await course.count()) {
        await course.click()
        await page.waitForTimeout(1000)
        taken.push(await shot(page, '08-curso-detalle'))

        const history = page.locator('button.worlds-history-row')
        if (await history.count()) {
          await history.first().click()
          await page.locator('.challenge-review, .challenge-play').first().waitFor({ timeout: 20000 })
          taken.push(await shot(page, '08b-desafio-detalle'))
          await page.getByRole('button', { name: /Salir|Volver/i }).first().click()
          await page.waitForTimeout(800)
        }

        const startBtn = page.getByRole('button', { name: /Desafío del curso/i })
        if (await startBtn.count()) {
          await startBtn.click()
          await page.getByRole('button', { name: /¡Empezar!|Continuar|Descartar y empezar/i }).waitFor({ timeout: 15000 })
          const continuar = page.getByRole('button', { name: 'Continuar' })
          if (await continuar.count()) await continuar.click()
          else await page.getByRole('button', { name: /¡Empezar!|Descartar y empezar/i }).click()
          await page.locator('.challenge-play, .challenge-review').first().waitFor({ timeout: 90000 })
          taken.push(await shot(page, '08c-desafio-juego'))
        }
      }
    }

    await context.close()
  }

  // —— Guardián ——
  {
    const { context, page } = await openApp(browser)
    await login(page, 'Claudia', '123456')
    await page.getByText(/Panel del guardián/i).waitFor({ timeout: 20000 })
    taken.push(await shot(page, '09-guardian'))
    await context.close()
  }

  // —— Admin ——
  {
    const { context, page } = await openApp(browser)
    await login(page, 'Sebastian', '123456')
    await page.getByText(/Panel de administrador/i).waitFor({ timeout: 20000 })
    taken.push(await shot(page, '10-admin-panel'))

    const accounts = page.getByRole('button', { name: /Guardianes y Exploradores/i })
    if (await accounts.count()) {
      await accounts.first().click()
      await page.waitForTimeout(1000)
      taken.push(await shot(page, '11-admin-cuentas'))
    }
    await context.close()
  }

  await browser.close()
  await writeFile(
    path.join(__dirname, 'capturas.json'),
    JSON.stringify({ taken, at: new Date().toISOString() }, null, 2),
  )
  console.log('Listo:', taken.length, 'capturas →', OUT)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
