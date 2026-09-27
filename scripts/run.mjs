import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const script = process.argv[2]
const projects = ['taskia_backend', 'taskia_frontend']
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

if (!script) {
  console.error('Falta el script. Ejemplo: node scripts/run.mjs dev')
  process.exit(1)
}

function start(project) {
  return spawn('npm', ['run', script], {
    cwd: path.join(root, project),
    stdio: 'inherit',
    shell: true,
  })
}

if (script.startsWith('dev')) {
  const children = projects.map(start)
  const stop = () => {
    for (const child of children) child.kill()
  }
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)
  for (const child of children) {
    child.on('exit', (code) => {
      if (code && code !== 0) {
        stop()
        process.exit(code)
      }
    })
  }
} else {
  for (const project of projects) {
    const child = start(project)
    const code = await new Promise((resolve) => {
      child.on('exit', resolve)
    })
    if (code !== 0) process.exit(code ?? 1)
  }
}
