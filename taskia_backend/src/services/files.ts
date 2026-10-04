import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { AppError } from '../utils/helpers.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const defaultRoot = path.resolve(__dirname, '../../serverfiles')

export function filesRoot() {
  const fromEnv = (process.env.FILES_DIR ?? '').trim()
  return fromEnv || defaultRoot
}

export function avatarsDir() {
  const dir = path.join(filesRoot(), 'avatars')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const MAX_BYTES = 2 * 1024 * 1024

export function saveAvatarUpload(
  userId: number,
  dataUrlOrBase64: string,
  mimeHint?: string,
) {
  let mime = mimeHint ?? 'image/png'
  let b64 = dataUrlOrBase64.trim()
  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i.exec(b64)
  if (match) {
    mime = match[1]!.toLowerCase()
    b64 = match[2]!
  }
  const ext = ALLOWED_MIME[mime]
  if (!ext) throw new AppError('Solo se permiten JPG, PNG o WebP')

  const buf = Buffer.from(b64, 'base64')
  if (buf.length === 0) throw new AppError('Imagen vacía')
  if (buf.length > MAX_BYTES) {
    throw new AppError('La imagen debe pesar menos de 2 MB')
  }

  const fileName = `u${userId}_${Date.now()}.${ext}`
  const full = path.join(avatarsDir(), fileName)
  fs.writeFileSync(full, buf)
  return fileName
}

export function avatarFilePath(fileName: string) {
  if (!/^[A-Za-z0-9._-]+$/.test(fileName)) {
    throw new AppError('Archivo no válido', 400)
  }
  const full = path.join(avatarsDir(), fileName)
  if (!full.startsWith(avatarsDir())) {
    throw new AppError('Archivo no válido', 400)
  }
  if (!fs.existsSync(full)) throw new AppError('Archivo no encontrado', 404)
  return full
}
