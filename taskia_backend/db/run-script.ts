import type { Client } from 'pg'

/** Parte un script de Postgres respetando comentarios, textos y cuerpos $$. */
export function splitPgStatements(sql: string): string[] {
  const out: string[] = []
  let i = 0
  let buf = ''
  const n = sql.length
  while (i < n) {
    const c = sql[i]
    if (c === '-' && sql[i + 1] === '-') {
      const nl = sql.indexOf('\n', i)
      i = nl === -1 ? n : nl + 1
      continue
    }
    if (c === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2)
      i = end === -1 ? n : end + 2
      continue
    }
    if (c === "'") {
      buf += c
      i += 1
      while (i < n) {
        buf += sql[i]
        if (sql[i] === "'" && sql[i + 1] === "'") {
          buf += sql[i + 1]
          i += 2
          continue
        }
        if (sql[i] === "'") {
          i += 1
          break
        }
        i += 1
      }
      continue
    }
    if (c === '$' && sql[i + 1] === '$') {
      const end = sql.indexOf('$$', i + 2)
      if (end === -1) {
        buf += sql.slice(i)
        break
      }
      buf += sql.slice(i, end + 2)
      i = end + 2
      continue
    }
    if (c === ';') {
      const stmt = buf.trim()
      if (stmt) out.push(stmt)
      buf = ''
      i += 1
      continue
    }
    buf += c
    i += 1
  }
  const last = buf.trim()
  if (last) out.push(last)
  return out
}

export async function runScript(client: Client, sql: string): Promise<void> {
  for (const stmt of splitPgStatements(sql)) {
    await client.query(stmt)
  }
}
