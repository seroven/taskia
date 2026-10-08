export function stripDrewPhrase(speak: string): string {
  return speak.replace(/te lo dibuj[eé] en la pizarra\.?\s*/gi, '').trim()
}

/** Quita delimitadores de fórmula ($3x$, $$…$$, \(…\)) y deja el texto de adentro. */
export function stripMathDelimiters(text: string): string {
  return text
    .replace(/\$\$([\s\S]+?)\$\$/g, '$1')
    .replace(/\\\[([\s\S]+?)\\\]/g, '$1')
    .replace(/\\\(([\s\S]+?)\\\)/g, '$1')
    .replace(/(^|[^$\\])\$(?!\$)([^$\n]+?)\$(?!\$)/g, '$1$2')
}

/** Texto que oye el niño: sin rótulo Ejercicio ni LaTeX. */
export function chatVisibleSpeak(text: string): string {
  return stripMathDelimiters(text)
    .replace(/(?:^|\n)\s*Ejercicio:\s*[^\n]*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
