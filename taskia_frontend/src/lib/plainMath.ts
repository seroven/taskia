/** Quita delimitadores de fórmula y deja el texto de adentro. Un $ suelto (precio) se conserva. */
export function plainMathText(text: string) {
  return text
    .replace(/\$\$([\s\S]+?)\$\$/g, '$1')
    .replace(/\\\[([\s\S]+?)\\\]/g, '$1')
    .replace(/\\\(([\s\S]+?)\\\)/g, '$1')
    .replace(/(^|[^$\\])\$(?!\$)([^$\n]+?)\$(?!\$)/g, '$1$2')
}

/** El niño no ve el rótulo que el servidor pegaba al final del mensaje. */
export function chatVisibleText(text: string) {
  return plainMathText(text)
    .replace(/(?:^|\n)\s*Ejercicio:\s*[^\n]*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
